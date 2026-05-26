/**
 * SpringPhysics Engine
 * CPU-side Verlet integration for spring-mass networks
 * Optimized for 60fps on Chromebook Celerons
 */

import { Mulberry32 } from './Mulberry32';

// P31 Canon Colors
const COLORS = {
  phos: 0x39ff14,
  cyan: 0x00f5ff,
  orchid: 0xda70d6,
  rest: 0x1a2233,
};

// Physics constants
const DAMPING = 0.95;
const K_REST = 0.08;      // Restoring force to equilibrium
const K_EDGE = 0.15;      // Spring stiffness between nodes
const K_DAMPING = 0.02;   // Velocity damping

// Node types
export type NodeType = 'CENTER' | 'SJ' | 'WJ' | 'RING';

export interface Node {
  id: number;
  x: number;      // Static X position
  y: number;      // Current Y (displacement)
  z: number;      // Static Z position
  oldY: number;   // Previous Y for Verlet
  force: number;  // Accumulated force
  type: NodeType;
  amplitude: number; // Current amplitude for rendering
  phase: number;  // Phase offset for visual rotation
}

export interface Edge {
  a: number;      // Node index A
  b: number;      // Node index B
  restLength: number; // Natural spring length
}

export interface SpringConfig {
  damping: number;
  springStrength: number;
  restoringForce: number;
  coopMode: boolean;
}

export interface PulseEvent {
  nodeId: number;
  force: number;
  timeMs: number;
}

/**
 * SpringPhysics - Verlet integration for resonance rings
 * 37 nodes (center + 3 concentric rings: 6, 12, 18)
 */
export class SpringPhysics {
  readonly nodeCount: number = 37;
  readonly nodes: Node[];
  readonly edges: Edge[];
  
  private config: SpringConfig;
  private timeMs: number = 0;
  private pendingPulses: PulseEvent[] = [];
  private prng: Mulberry32;

  constructor(seed: number, config: Partial<SpringConfig> = {}) {
    this.prng = new Mulberry32(seed);
    this.config = {
      damping: DAMPING,
      springStrength: K_EDGE,
      restoringForce: K_REST,
      coopMode: false,
      ...config,
    };

    // Initialize nodes and edges
    this.nodes = this.generateNodes();
    this.edges = this.generateEdges();
  }

  /**
   * Generate 37 nodes in concentric ring pattern
   * - 1 center node
   * - Ring 1: 6 nodes (S.J. positions)
   * - Ring 2: 12 nodes
   * - Ring 3: 18 nodes (W.J. positions)
   */
  private generateNodes(): Node[] {
    const nodes: Node[] = [];
    let id = 0;

    // Center node
    nodes.push({
      id: id++,
      x: 0,
      y: 0,
      z: 0,
      oldY: 0,
      force: 0,
      type: 'CENTER',
      amplitude: 0,
      phase: 0,
    });

    // Ring 1: 6 nodes (S.J. emitters at positions 0, 1, 2)
    const ring1Radius = 5;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      nodes.push({
        id: id++,
        x: Math.cos(angle) * ring1Radius,
        y: 0,
        z: Math.sin(angle) * ring1Radius,
        oldY: 0,
        force: 0,
        type: i < 3 ? 'SJ' : 'RING',
        amplitude: 0,
        phase: angle,
      });
    }

    // Ring 2: 12 nodes
    const ring2Radius = 10;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      nodes.push({
        id: id++,
        x: Math.cos(angle) * ring2Radius,
        y: 0,
        z: Math.sin(angle) * ring2Radius,
        oldY: 0,
        force: 0,
        type: 'RING',
        amplitude: 0,
        phase: angle,
      });
    }

    // Ring 3: 18 nodes (W.J. emitters at positions 0, 9, 18)
    const ring3Radius = 15;
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      nodes.push({
        id: id++,
        x: Math.cos(angle) * ring3Radius,
        y: 0,
        z: Math.sin(angle) * ring3Radius,
        oldY: 0,
        force: 0,
        type: (i === 0 || i === 9 || i === 18) ? 'WJ' : 'RING',
        amplitude: 0,
        phase: angle,
      });
    }

    return nodes;
  }

  /**
   * Generate spring edges connecting nodes
   * - Radial: center to ring1, ring1 to ring2, ring2 to ring3
   * - Tangential: adjacent nodes within same ring
   * - Cross: limited cross-ring connections
   */
  private generateEdges(): Edge[] {
    const edges: Edge[] = [];
    
    // Indices for reference
    const CENTER = 0;
    const RING1_START = 1;   // 6 nodes
    const RING2_START = 7;   // 12 nodes  
    const RING3_START = 19;  // 18 nodes

    // Radial connections (center to ring1)
    for (let i = 0; i < 6; i++) {
      edges.push({
        a: CENTER,
        b: RING1_START + i,
        restLength: 5,
      });
    }

    // Radial connections (ring1 to ring2)
    for (let i = 0; i < 6; i++) {
      // Connect each ring1 node to 2 ring2 nodes
      const ring1Node = RING1_START + i;
      const ring2Node1 = RING2_START + (i * 2);
      const ring2Node2 = RING2_START + ((i * 2 + 1) % 12);
      
      edges.push({ a: ring1Node, b: ring2Node1, restLength: 5 });
      edges.push({ a: ring1Node, b: ring2Node2, restLength: 5 });
    }

    // Radial connections (ring2 to ring3)
    for (let i = 0; i < 12; i++) {
      const ring2Node = RING2_START + i;
      const ring3Node = RING3_START + Math.floor((i / 12) * 18);
      edges.push({ a: ring2Node, b: ring3Node, restLength: 5 });
      edges.push({ a: ring2Node, b: RING3_START + ((ring3Node + 1) % 18), restLength: 5 });
    }

    // Tangential connections within rings
    // Ring 1 (6 nodes)
    for (let i = 0; i < 6; i++) {
      edges.push({
        a: RING1_START + i,
        b: RING1_START + ((i + 1) % 6),
        restLength: 5,
      });
    }

    // Ring 2 (12 nodes)
    for (let i = 0; i < 12; i++) {
      edges.push({
        a: RING2_START + i,
        b: RING2_START + ((i + 1) % 12),
        restLength: 5,
      });
    }

    // Ring 3 (18 nodes)
    for (let i = 0; i < 18; i++) {
      edges.push({
        a: RING3_START + i,
        b: RING3_START + ((i + 1) % 18),
        restLength: 5,
      });
    }

    // Cross connections for wave propagation
    // Diagonals in ring2
    for (let i = 0; i < 12; i++) {
      edges.push({
        a: RING2_START + i,
        b: RING2_START + ((i + 2) % 12),
        restLength: 8,
      });
    }

    return edges;
  }

  /**
   * Apply pulse to a node (user interaction)
   */
  pulse(nodeId: number, force: number): void {
    this.pendingPulses.push({ nodeId, force, timeMs: this.timeMs });
  }

  /**
   * Main physics step - Verlet integration
   * Called every frame
   */
  step(deltaTimeMs: number): void {
    const dt = Math.min(deltaTimeMs, 50) / 16.67; // Normalize
    this.timeMs += deltaTimeMs;

    const { damping, springStrength, restoringForce, coopMode } = this.config;

    // 1. Reset forces and apply restoring force
    for (const node of this.nodes) {
      // Restoring force pulls back to equilibrium (y = 0)
      node.force = -node.y * restoringForce;
    }

    // 2. Apply pending pulses
    for (const pulse of this.pendingPulses) {
      const node = this.nodes[pulse.nodeId];
      if (node) {
        node.force += pulse.force;
      }
    }
    this.pendingPulses = [];

    // 3. Calculate spring forces
    for (const edge of this.edges) {
      const n1 = this.nodes[edge.a];
      const n2 = this.nodes[edge.b];
      
      // Spring force based on Y displacement difference
      const displacement = n2.y - n1.y;
      const force = displacement * springStrength;
      
      n1.force += force;
      n2.force -= force;
    }

    // 4. Verlet integration
    for (const node of this.nodes) {
      // Co-op mode: Drive emitters with sine wave
      if (coopMode && (node.type === 'SJ' || node.type === 'WJ')) {
        const drivePhase = node.type === 'SJ' ? 0 : Math.PI; // Phase offset
        const driveFreq = 6; // Hz
        const driveAmp = 4;
        
        const driveY = Math.sin((this.timeMs / 1000) * driveFreq * Math.PI * 2 + drivePhase) * driveAmp;
        
        node.y = driveY;
        node.oldY = driveY;
        node.amplitude = Math.abs(driveY);
        continue;
      }

      // Standard Verlet
      const tempY = node.y;
      const velocity = (node.y - node.oldY) * damping;
      const acceleration = node.force;
      
      node.y += velocity + acceleration;
      node.oldY = tempY;
      
      // Update amplitude for rendering
      node.amplitude = Math.abs(node.y);
    }
  }

  /**
   * Set co-op mode (phase-locked emitters)
   */
  setCoopMode(enabled: boolean): void {
    this.config.coopMode = enabled;
  }

  /**
   * Get current time for sync
   */
  getTimeMs(): number {
    return this.timeMs;
  }

  /**
   * Get harmonic resonance (total grid amplitude)
   * Used for XP/Resin payout calculation
   */
  getHarmonicResonance(): {
    total: number;
    average: number;
    peak: number;
    constructiveCount: number; // Nodes with amplitude > 1.8
  } {
    let total = 0;
    let peak = 0;
    let constructiveCount = 0;

    for (const node of this.nodes) {
      total += node.amplitude;
      peak = Math.max(peak, node.amplitude);
      if (node.amplitude > 1.8) {
        constructiveCount++;
      }
    }

    return {
      total,
      average: total / this.nodeCount,
      peak,
      constructiveCount,
    };
  }

  /**
   * Get node colors based on amplitude and type
   */
  getNodeColor(node: Node): { r: number; g: number; b: number } {
    if (node.type === 'SJ') {
      return { r: 0, g: 245, b: 255 }; // Cyan
    }
    if (node.type === 'WJ') {
      return { r: 57, g: 255, b: 20 }; // Phos
    }
    
    // Resting color
    const restColor = { r: 26, g: 34, b: 51 }; // #1a2233
    
    // Constructive interference (Orchid blend)
    if (node.amplitude > 1.8) {
      const intensity = Math.min((node.amplitude - 1.8) * 0.5, 1.0);
      return {
        r: this.lerp(restColor.r, 218, intensity),
        g: this.lerp(restColor.g, 112, intensity),
        b: this.lerp(restColor.b, 214, intensity),
      };
    }
    
    return restColor;
  }

  /**
   * Lerp helper
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Get emitter nodes for UI
   */
  getEmitters(): { sj: Node[]; wj: Node[] } {
    return {
      sj: this.nodes.filter(n => n.type === 'SJ'),
      wj: this.nodes.filter(n => n.type === 'WJ'),
    };
  }

  /**
   * Serialize state
   */
  serialize(): {
    nodes: Node[];
    timeMs: number;
  } {
    return {
      nodes: this.nodes.map(n => ({ ...n })),
      timeMs: this.timeMs,
    };
  }

  /**
   * Deserialize and restore
   */
  restore(state: { nodes: Node[]; timeMs: number }): void {
    for (let i = 0; i < this.nodeCount && i < state.nodes.length; i++) {
      const saved = state.nodes[i];
      const node = this.nodes[i];
      
      node.y = saved.y;
      node.oldY = saved.oldY;
      node.force = saved.force;
      node.amplitude = saved.amplitude;
    }
    this.timeMs = state.timeMs;
  }
}

// Factory function
export function createSpringPhysics(seed: number, config?: Partial<SpringConfig>): SpringPhysics {
  return new SpringPhysics(seed, config);
}
