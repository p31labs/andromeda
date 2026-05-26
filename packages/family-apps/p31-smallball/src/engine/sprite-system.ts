// P31 Smallball: 2.5D Billboard Sprite System
// Animated character sprites that always face camera
// Performance optimized with texture atlases

import * as THREE from 'three';

// ============================================
// SPRITE TYPES & CONFIGURATION
// ============================================

export type PlayerAnimation =
  | 'IDLE'
  | 'IDLE_BAT'
  | 'RUNNING'
  | 'SWINGING'
  | 'PITCHING'
  | 'FIELDING'
  | 'THROWING'
  | 'CATCHING'
  | 'CELEBRATING'
  | 'DISAPPOINTED';

// Runtime array of animation values for iteration
export const PLAYER_ANIMATIONS: PlayerAnimation[] = [
  'IDLE', 'IDLE_BAT', 'RUNNING', 'SWINGING', 'PITCHING',
  'FIELDING', 'THROWING', 'CATCHING', 'CELEBRATING', 'DISAPPOINTED'
];

export type Direction = 'LEFT' | 'RIGHT' | 'FRONT' | 'BACK' | 'FRONT_LEFT' | 'FRONT_RIGHT';

export interface SpriteFrame {
  u: number;        // UV coordinate x
  v: number;        // UV coordinate y
  width: number;    // Frame width in UV space
  height: number;   // Frame height in UV space
}

export interface SpriteSheet {
  texture: THREE.Texture;
  frames: Map<string, SpriteFrame>; // key: "animation_direction_frame"
  frameTime: number; // Seconds per frame
  rows: number;
  cols: number;
}

// ============================================
// BILLBOARD MATERIAL
// ============================================

export class BillboardMaterial extends THREE.ShaderMaterial {
  constructor(spriteSheet: SpriteSheet) {
    super({
      uniforms: {
        map: { value: spriteSheet.texture },
        frameUV: { value: new THREE.Vector4(0, 0, 1, 1) }, // u, v, width, height
        color: { value: new THREE.Color(0xffffff) },
        brightness: { value: 1.0 },
      },
      vertexShader: `
        uniform vec4 frameUV;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          
          // Billboard effect - always face camera
          vec4 worldPosition = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec3 cameraDir = normalize(cameraPosition - worldPosition.xyz);
          
          // Calculate billboard orientation
          vec3 up = vec3(0.0, 1.0, 0.0);
          vec3 right = normalize(cross(cameraDir, up));
          vec3 billboardUp = cross(right, cameraDir);
          
          // Apply vertex offset in billboard space
          vec3 billboardPos = right * position.x + billboardUp * position.y;
          worldPosition.xyz += billboardPos;
          
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec4 frameUV;
        uniform vec3 color;
        uniform float brightness;
        varying vec2 vUv;
        
        void main() {
          // Sample from sprite sheet with UV offset
          vec2 sheetUV = vec2(
            frameUV.x + vUv.x * frameUV.z,
            frameUV.y + vUv.y * frameUV.w
          );
          
          vec4 texColor = texture2D(map, sheetUV);
          
          // Alpha test
          if (texColor.a < 0.5) discard;
          
          // Apply color tint and brightness
          gl_FragColor = vec4(texColor.rgb * color * brightness, texColor.a);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  setFrame(frame: SpriteFrame): void {
    this.uniforms.frameUV.value.set(frame.u, frame.v, frame.width, frame.height);
  }

  setBrightness(brightness: number): void {
    this.uniforms.brightness.value = brightness;
  }

  setColor(color: THREE.Color): void {
    this.uniforms.color.value.copy(color);
  }
}

// ============================================
// PLAYER SPRITE
// ============================================

export class PlayerSprite extends THREE.Group {
  private material: BillboardMaterial;
  private mesh: THREE.Mesh;
  private spriteSheet: SpriteSheet;
  private currentAnimation: PlayerAnimation = 'IDLE';
  private currentDirection: Direction = 'FRONT';
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: Map<PlayerAnimation, number>;

  // Player properties
  public playerId: string;
  public jerseyNumber: number;
  public skinTone: THREE.Color;
  public equipmentColor: THREE.Color;

  constructor(
    playerId: string,
    jerseyNumber: number,
    skinTone: string,
    equipmentColor: string,
    spriteSheet: SpriteSheet,
    scale: number = 1.8 // Player height in world units
  ) {
    super();

    this.playerId = playerId;
    this.jerseyNumber = jerseyNumber;
    this.skinTone = new THREE.Color(skinTone);
    this.equipmentColor = new THREE.Color(equipmentColor);
    this.spriteSheet = spriteSheet;

    // Create frame count map from sprite sheet
    this.frameCount = this.calculateFrameCounts();

    // Create geometry (plane facing camera)
    const geometry = new THREE.PlaneGeometry(scale * 0.5, scale);

    // Create material
    this.material = new BillboardMaterial(spriteSheet);
    this.material.setColor(this.skinTone);

    // Create mesh
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.position.y = scale / 2; // Pivot at feet
    this.add(this.mesh);

    // Shadow blob beneath player
    const shadowGeometry = new THREE.CircleGeometry(scale * 0.25, 16);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    this.add(shadow);

    // Start idle animation
    this.setAnimation('IDLE');
  }

  private calculateFrameCounts(): Map<PlayerAnimation, number> {
    const counts = new Map<PlayerAnimation, number>();

    for (const anim of PLAYER_ANIMATIONS) {
      let count = 0;
      for (const dir of ['LEFT', 'RIGHT', 'FRONT', 'BACK'] as Direction[]) {
        let frameNum = 0;
        while (this.spriteSheet.frames.has(`${anim}_${dir}_${frameNum}`)) {
          frameNum++;
        }
        if (frameNum > count) count = frameNum;
      }
      counts.set(anim, Math.max(1, count));
    }

    return counts;
  }

  setAnimation(animation: PlayerAnimation, direction?: Direction): void {
    this.currentAnimation = animation;
    if (direction) {
      this.currentDirection = direction;
    }
    this.currentFrame = 0;
    this.updateFrame();

    // Set brightness for dramatic moments
    if (animation === 'CELEBRATING') {
      this.material.setBrightness(1.3);
    } else if (animation === 'DISAPPOINTED') {
      this.material.setBrightness(0.7);
    } else {
      this.material.setBrightness(1.0);
    }
  }

  setDirection(direction: Direction): void {
    if (this.currentDirection !== direction) {
      this.currentDirection = direction;
      this.updateFrame();
    }
  }

  update(time: number): void {
    const elapsed = time - this.lastFrameTime;

    if (elapsed >= this.spriteSheet.frameTime) {
      const maxFrames = this.frameCount.get(this.currentAnimation) || 1;
      this.currentFrame = (this.currentFrame + 1) % maxFrames;
      this.lastFrameTime = time;
      this.updateFrame();
    }
  }

  private updateFrame(): void {
    const frameKey = `${this.currentAnimation}_${this.currentDirection}_${this.currentFrame}`;
    const frame = this.spriteSheet.frames.get(frameKey);

    if (frame) {
      this.material.setFrame(frame);
    }
  }

  // Face a target position
  faceTarget(target: THREE.Vector3): void {
    const direction = target.clone().sub(this.position).normalize();
    const angle = Math.atan2(direction.x, direction.z);

    // Convert angle to cardinal direction
    if (Math.abs(angle) < Math.PI / 4) {
      this.setDirection('FRONT');
    } else if (Math.abs(angle) > 3 * Math.PI / 4) {
      this.setDirection('BACK');
    } else if (angle > 0) {
      this.setDirection('RIGHT');
    } else {
      this.setDirection('LEFT');
    }
  }
}

// ============================================
// SPRITE SHEET GENERATOR
// ============================================

export class SpriteSheetGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rows: number;
  private cols: number;
  private cellWidth: number;
  private cellHeight: number;

  constructor(rows: number = 8, cols: number = 8, cellSize: number = 128) {
    this.rows = rows;
    this.cols = cols;
    this.cellWidth = cellSize;
    this.cellHeight = cellSize;

    this.canvas = document.createElement('canvas');
    this.canvas.width = cols * cellSize;
    this.canvas.height = rows * cellSize;
    this.ctx = this.canvas.getContext('2d')!;

    // Transparent background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Generate procedural player sprites
  generatePlayerSheet(skinTone: string, jerseyColor: string, jerseyNum: number): THREE.CanvasTexture {
    const frames = new Map<string, SpriteFrame>();

    // Row 0: IDLE
    this.drawIdleFrame(0, 0, skinTone, jerseyColor, jerseyNum);
    frames.set('IDLE_FRONT_0', this.getUV(0, 0));

    // Row 1: IDLE_BAT
    this.drawIdleBatFrame(1, 0, skinTone, jerseyColor, jerseyNum);
    frames.set('IDLE_BAT_FRONT_0', this.getUV(1, 0));

    // Row 2: SWINGING (3 frames)
    for (let i = 0; i < 3; i++) {
      this.drawSwingFrame(2, i, skinTone, jerseyColor, i);
      frames.set(`SWINGING_FRONT_${i}`, this.getUV(2, i));
    }

    // Row 3: RUNNING (4 frames)
    for (let i = 0; i < 4; i++) {
      this.drawRunningFrame(3, i, skinTone, jerseyColor, i);
      frames.set(`RUNNING_FRONT_${i}`, this.getUV(3, i));
      frames.set(`RUNNING_LEFT_${i}`, this.getUV(3, i)); // Mirror for right
    }

    // Row 4: PITCHING (2 frames)
    this.drawPitchingFrame(4, 0, skinTone, jerseyColor, 0);
    frames.set('PITCHING_FRONT_0', this.getUV(4, 0));
    this.drawPitchingFrame(4, 1, skinTone, jerseyColor, 1);
    frames.set('PITCHING_FRONT_1', this.getUV(4, 1));

    // Row 5: FIELDING
    this.drawFieldingFrame(5, 0, skinTone, jerseyColor);
    frames.set('FIELDING_FRONT_0', this.getUV(5, 0));

    // Row 6: THROWING (2 frames)
    this.drawThrowingFrame(6, 0, skinTone, jerseyColor, 0);
    frames.set('THROWING_FRONT_0', this.getUV(6, 0));
    this.drawThrowingFrame(6, 1, skinTone, jerseyColor, 1);
    frames.set('THROWING_FRONT_1', this.getUV(6, 1));

    // Row 7: CATCHING
    this.drawCatchingFrame(7, 0, skinTone, jerseyColor);
    frames.set('CATCHING_FRONT_0', this.getUV(7, 0));

    const texture = new THREE.CanvasTexture(this.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  private getUV(row: number, col: number): SpriteFrame {
    return {
      u: col / this.cols,
      v: 1 - (row + 1) / this.rows, // Flip V for WebGL
      width: 1 / this.cols,
      height: 1 / this.rows,
    };
  }

  // Drawing helpers
  private drawIdleFrame(row: number, col: number, skinTone: string, jerseyColor: string, jerseyNum: number): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Body
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(cx - 20, cy - 10, 40, 50);

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 30, 18, 0, Math.PI * 2);
    this.ctx.fill();

    // Number
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(String(jerseyNum), cx, cy + 20);
  }

  private drawIdleBatFrame(row: number, col: number, skinTone: string, jerseyColor: string, jerseyNum: number): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Body
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(cx - 20, cy - 10, 40, 50);

    // Bat
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(cx + 25, cy - 20);
    this.ctx.lineTo(cx + 25, cy + 40);
    this.ctx.stroke();

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 30, 18, 0, Math.PI * 2);
    this.ctx.fill();

    // Number
    this.ctx.fillStyle = 'white';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(String(jerseyNum), cx, cy + 20);
  }

  private drawSwingFrame(row: number, col: number, skinTone: string, jerseyColor: string, frame: number): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Rotate body based on frame
    const rotation = frame * 0.5;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rotation);

    // Body
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(-20, -10, 40, 50);

    // Bat (swinging arc)
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(25, -20);
    this.ctx.lineTo(60, -10 + frame * 20);
    this.ctx.stroke();

    this.ctx.restore();

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 30, 18, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawRunningFrame(row: number, col: number, skinTone: string, jerseyColor: string, frame: number): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Leg positions based on frame
    const legOffset = Math.sin(frame * Math.PI / 2) * 15;

    // Legs
    this.ctx.strokeStyle = skinTone;
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 10, cy + 40);
    this.ctx.lineTo(cx - 10 + legOffset, cy + 70);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(cx + 10, cy + 40);
    this.ctx.lineTo(cx + 10 - legOffset, cy + 70);
    this.ctx.stroke();

    // Body
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(cx - 20, cy - 10, 40, 50);

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 30, 18, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPitchingFrame(row: number, col: number, skinTone: string, jerseyColor: string, frame: number): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Wind-up / release positions
    const armAngle = frame === 0 ? -Math.PI / 4 : -Math.PI / 2;

    // Body
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(cx - 20, cy - 10, 40, 50);

    // Arm
    this.ctx.strokeStyle = skinTone;
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(cx + 20, cy);
    this.ctx.lineTo(
      cx + 20 + Math.cos(armAngle) * 30,
      cy + Math.sin(armAngle) * 30
    );
    this.ctx.stroke();

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 30, 18, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawFieldingFrame(row: number, col: number, skinTone: string, jerseyColor: string): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Crouched position
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(cx - 20, cy + 10, 40, 40);

    // Glove
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.arc(cx + 30, cy + 20, 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 10, 18, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawThrowingFrame(row: number, col: number, skinTone: string, jerseyColor: string, frame: number): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Body
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(cx - 20, cy - 10, 40, 50);

    // Arm motion
    this.ctx.strokeStyle = skinTone;
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(cx + 20, cy);
    this.ctx.lineTo(cx + 40 + frame * 20, cy - 10);
    this.ctx.stroke();

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 30, 18, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawCatchingFrame(row: number, col: number, skinTone: string, jerseyColor: string): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;
    const cx = x + this.cellWidth / 2;
    const cy = y + this.cellHeight / 2;

    // Deep crouch
    this.ctx.fillStyle = jerseyColor;
    this.ctx.fillRect(cx - 20, cy + 20, 40, 30);

    // Glove up
    this.ctx.fillStyle = '#8B4513';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 30, 15, 0, Math.PI * 2);
    this.ctx.fill();

    // Head
    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 5, 18, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

// ============================================
// SPRITE MANAGER
// ============================================

export class SpriteManager {
  private sprites: Map<string, PlayerSprite> = new Map();
  private scene: THREE.Scene;
  private defaultSpriteSheet: SpriteSheet | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  addSprite(sprite: PlayerSprite): void {
    this.sprites.set(sprite.playerId, sprite);
    this.scene.add(sprite);
  }

  removeSprite(playerId: string): void {
    const sprite = this.sprites.get(playerId);
    if (sprite) {
      this.scene.remove(sprite);
      this.sprites.delete(playerId);
    }
  }

  getSprite(playerId: string): PlayerSprite | undefined {
    return this.sprites.get(playerId);
  }

  update(time: number): void {
    this.sprites.forEach(sprite => sprite.update(time));
  }

  setAllAnimation(animation: PlayerAnimation): void {
    this.sprites.forEach(sprite => sprite.setAnimation(animation));
  }

  // Animate sprites along a path
  animateAlongPath(
    playerId: string,
    path: THREE.Vector3[],
    duration: number,
    onComplete?: () => void
  ): void {
    const sprite = this.sprites.get(playerId);
    if (!sprite || path.length < 2) return;

    let currentIndex = 0;
    const startTime = Date.now();
    const segmentDuration = duration / (path.length - 1);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const targetIndex = Math.min(
        Math.floor(elapsed / segmentDuration),
        path.length - 1
      );

      if (targetIndex > currentIndex) {
        currentIndex = targetIndex;
        sprite.setAnimation('RUNNING');
        sprite.faceTarget(path[currentIndex + 1] || path[currentIndex]);
      }

      if (currentIndex < path.length - 1) {
        const t = (elapsed % segmentDuration) / segmentDuration;
        const current = path[currentIndex];
        const next = path[currentIndex + 1];
        sprite.position.lerpVectors(current, next, t);
        requestAnimationFrame(animate);
      } else {
        sprite.position.copy(path[path.length - 1]);
        sprite.setAnimation('IDLE');
        onComplete?.();
      }
    };

    animate();
  }
}

// ============================================
// PARTICLE EFFECTS
// ============================================

export class ParticleSystem extends THREE.Points {
  private velocities: THREE.Vector3[];
  private lifetimes: number[];
  private maxLifetimes: number[];

  constructor(count: number, color: THREE.Color, size: number = 2) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    super(geometry, material);

    this.velocities = [];
    this.lifetimes = [];
    this.maxLifetimes = [];

    // Initialize
    for (let i = 0; i < count; i++) {
      this.velocities.push(new THREE.Vector3());
      this.lifetimes.push(0);
      this.maxLifetimes.push(0);
    }

    this.visible = false;
  }

  emit(origin: THREE.Vector3, direction: THREE.Vector3, spread: number = 1, speed: number = 1): void {
    const positions = this.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.velocities.length; i++) {
      // Position
      positions[i * 3] = origin.x + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * spread;
      positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * spread;

      // Velocity
      this.velocities[i].copy(direction).normalize();
      this.velocities[i].x += (Math.random() - 0.5) * 0.5;
      this.velocities[i].y += (Math.random() - 0.5) * 0.5;
      this.velocities[i].z += (Math.random() - 0.5) * 0.5;
      this.velocities[i].multiplyScalar(speed * (0.5 + Math.random()));

      // Lifetime
      this.lifetimes[i] = 1.0;
      this.maxLifetimes[i] = 1.0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.visible = true;
  }

  update(deltaTime: number): void {
    if (!this.visible) return;

    const positions = this.geometry.attributes.position.array as Float32Array;
    let activeCount = 0;

    for (let i = 0; i < this.velocities.length; i++) {
      if (this.lifetimes[i] > 0) {
        // Update position
        positions[i * 3] += this.velocities[i].x * deltaTime;
        positions[i * 3 + 1] += this.velocities[i].y * deltaTime;
        positions[i * 3 + 2] += this.velocities[i].z * deltaTime;

        // Gravity
        this.velocities[i].y -= 9.8 * deltaTime;

        // Decay
        this.lifetimes[i] -= deltaTime;
        activeCount++;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;

    // Hide when all particles dead
    if (activeCount === 0) {
      this.visible = false;
    }
  }
}

// Predefined effects
export const HIT_SPARKS = new THREE.Color(0xffff00);
export const DUST_CLOUD = new THREE.Color(0x8b7355);
export const CATCH_FLASH = new THREE.Color(0xffffff);
