/**
 * Word Physics Engine
 * For Magnetic Poetry - Semantic vector physics
 */

import {
  Word,
  WordBall,
  MagneticConnection,
  Vector3,
  SpoonState,
} from '../types/physics';

export interface WordPhysicsConfig {
  bounds: { width: number; height: number; depth: number };
  gravity: number;
  damping: number;
  maxWords: number;
  magneticRange: number;
  similarityThreshold: number;
}

export class WordPhysics {
  private wordBalls: Map<string, WordBall> = new Map();
  private connections: MagneticConnection[] = [];
  private config: WordPhysicsConfig;
  private onCollisionCallback: ((wordA: Word, wordB: Word) => void) | null = null;

  constructor(config: Partial<WordPhysicsConfig> = {}) {
    this.config = {
      bounds: { width: 20, height: 15, depth: 10 },
      gravity: 0.1,
      damping: 0.98,
      maxWords: 24,
      magneticRange: 5.0,
      similarityThreshold: 0.5,
      ...config,
    };
  }

  public addWord(word: Word, position: Vector3): WordBall {
    const ball: WordBall = {
      word,
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      isFrozen: false,
      isSelected: false,
      connections: [],
    };

    this.wordBalls.set(word.id, ball);
    this.recalculateConnections();

    return ball;
  }

  public removeWord(wordId: string): boolean {
    const removed = this.wordBalls.delete(wordId);
    if (removed) {
      this.recalculateConnections();
    }
    return removed;
  }

  public applyImpulse(wordId: string, impulse: Vector3): void {
    const ball = this.wordBalls.get(wordId);
    if (ball && !ball.isFrozen) {
      ball.velocity.x += impulse.x / ball.word.mass;
      ball.velocity.y += impulse.y / ball.word.mass;
      ball.velocity.z += impulse.z / ball.word.mass;
    }
  }

  public setPosition(wordId: string, position: Vector3): void {
    const ball = this.wordBalls.get(wordId);
    if (ball) {
      ball.position = { ...position };
      ball.velocity = { x: 0, y: 0, z: 0 };
    }
  }

  public freezeWord(wordId: string, frozen = true): void {
    const ball = this.wordBalls.get(wordId);
    if (ball) {
      ball.isFrozen = frozen;
      if (frozen) {
        ball.velocity = { x: 0, y: 0, z: 0 };
      }
    }
  }

  public selectWord(wordId: string | null): void {
    this.wordBalls.forEach(ball => {
      ball.isSelected = ball.word.id === wordId;
    });
  }

  public step(dt: number = 0.016): void {
    this.wordBalls.forEach((ball, id) => {
      if (ball.isFrozen) return;

      let force: Vector3 = { x: 0, y: 0, z: 0 };

      // Gravity (slight downward drift)
      force.y -= this.config.gravity * ball.word.mass;

      // Magnetic attraction to related words
      this.connections
        .filter(c => c.isActive && (c.wordA === id || c.wordB === id))
        .forEach(c => {
          const otherId = c.wordA === id ? c.wordB : c.wordA;
          const other = this.wordBalls.get(otherId);
          if (!other) return;

          const dx = other.position.x - ball.position.x;
          const dy = other.position.y - ball.position.y;
          const dz = other.position.z - ball.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist > 0.5 && dist < this.config.magneticRange) {
            const strength = c.strength * ball.word.magneticStrength;
            const attraction = strength * (1 - dist / this.config.magneticRange);
            force.x += attraction * dx / dist;
            force.y += attraction * dy / dist;
            force.z += attraction * dz / dist;
          }
        });

      // Word-word repulsion (prevent overlap)
      this.wordBalls.forEach((other, otherId) => {
        if (id === otherId) return;

        const dx = other.position.x - ball.position.x;
        const dy = other.position.y - ball.position.y;
        const dz = other.position.z - ball.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const minDistance = 2.0; // Minimum word spacing
        if (dist < minDistance && dist > 0.001) {
          const repulsion = (minDistance - dist) / minDistance;
          force.x -= repulsion * dx / dist * 2.0;
          force.y -= repulsion * dy / dist * 2.0;
          force.z -= repulsion * dz / dist * 2.0;

          // Trigger collision callback if close enough
          if (dist < 1.0 && this.onCollisionCallback) {
            this.onCollisionCallback(ball.word, other.word);
          }
        }
      });

      // Integrate
      ball.velocity.x += force.x * dt;
      ball.velocity.y += force.y * dt;
      ball.velocity.z += force.z * dt;

      // Damping
      ball.velocity.x *= this.config.damping;
      ball.velocity.y *= this.config.damping;
      ball.velocity.z *= this.config.damping;

      // Update position
      ball.position.x += ball.velocity.x * dt;
      ball.position.y += ball.velocity.y * dt;
      ball.position.z += ball.velocity.z * dt;

      // Bounds checking with bounce
      const { bounds } = this.config;
      const halfWidth = bounds.width / 2;
      const halfHeight = bounds.height / 2;
      const halfDepth = bounds.depth / 2;

      if (ball.position.x < -halfWidth) {
        ball.position.x = -halfWidth;
        ball.velocity.x *= -0.5;
      } else if (ball.position.x > halfWidth) {
        ball.position.x = halfWidth;
        ball.velocity.x *= -0.5;
      }

      if (ball.position.y < -halfHeight) {
        ball.position.y = -halfHeight;
        ball.velocity.y *= -0.5;
      } else if (ball.position.y > halfHeight) {
        ball.position.y = halfHeight;
        ball.velocity.y *= -0.5;
      }

      if (ball.position.z < -halfDepth) {
        ball.position.z = -halfDepth;
        ball.velocity.z *= -0.5;
      } else if (ball.position.z > halfDepth) {
        ball.position.z = halfDepth;
        ball.velocity.z *= -0.5;
      }
    });
  }

  private recalculateConnections(): void {
    this.connections = [];
    const balls = Array.from(this.wordBalls.values());

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const similarity = this.calculateSimilarity(
          balls[i].word.embedding,
          balls[j].word.embedding
        );

        if (similarity > this.config.similarityThreshold) {
          this.connections.push({
            wordA: balls[i].word.id,
            wordB: balls[j].word.id,
            strength: similarity,
            isActive: true,
          });
        }
      }
    }

    // Update connections list on each word
    this.wordBalls.forEach(ball => {
      ball.connections = this.connections
        .filter(c => c.wordA === ball.word.id || c.wordB === ball.word.id)
        .map(c => c.wordA === ball.word.id ? c.wordB : c.wordA);
    });
  }

  private calculateSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public getConnectionsForWord(wordId: string): MagneticConnection[] {
    return this.connections.filter(c => c.wordA === wordId || c.wordB === wordId);
  }

  public getAllConnections(): MagneticConnection[] {
    return this.connections;
  }

  public getWordBalls(): WordBall[] {
    return Array.from(this.wordBalls.values());
  }

  public getWordBall(wordId: string): WordBall | undefined {
    return this.wordBalls.get(wordId);
  }

  public onCollision(callback: (wordA: Word, wordB: Word) => void): void {
    this.onCollisionCallback = callback;
  }

  public clear(): void {
    this.wordBalls.clear();
    this.connections = [];
  }

  public setSpoonConfig(spoons: SpoonState): void {
    const configs: Record<SpoonState, Partial<WordPhysicsConfig>> = {
      1: {
        maxWords: 6,
        magneticRange: 2.0,
        similarityThreshold: 0.7,
      },
      3: {
        maxWords: 12,
        magneticRange: 3.0,
        similarityThreshold: 0.6,
      },
      6: {
        maxWords: 24,
        magneticRange: 5.0,
        similarityThreshold: 0.5,
      },
    };

    this.config = { ...this.config, ...configs[spoons] };
    this.recalculateConnections();
  }

  public getBounds(): { width: number; height: number; depth: number } {
    return { ...this.config.bounds };
  }
}

export default WordPhysics;
