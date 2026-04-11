/**
 * @file ricci.ts — P31 Labs Discrete Ricci Flow Math (dRfge)
 * 
 * Ollivier-Ricci Curvature (κ) calculation for mesh topology.
 * Section 1.2 of Master Doctrine.
 * 
 * CWP: Decoupled from App.tsx per WCD-04.5
 */

export interface RicciInput {
  latency: number;    // ms
  noise: number;     // 0-1
  activeNodes: number;
}

export interface RicciOutput {
  curvature: number;    // κ value 0.5-1.5
  resilience: string;   // "100% - ISOSTATIC" | "57.7% - STABLE" | "DEGRADED"
  scale: number;         // dRfge visual scale factor
}

/**
 * P31 Labs: Discrete Ricci Flow Math (dRfge)
 * 
 * Calculates proxy for Ollivier-Ricci Curvature (κ) used to detect
 * bottlenecks in the peer-to-peer mesh network.
 */
export class RicciMath {
  /**
   * Calculate a proxy for Ollivier-Ricci Curvature (κ)
   * 
   * @param latency - Network latency in ms
   * @param noise - Network noise factor 0-1
   * @returns κ value between 0.5-1.5
   */
  static calculateCurvature(latency: number, noise: number): number {
    const base = 1.0;
    const friction = (latency * 0.01) + (noise * 0.5);
    return Math.max(0.5, Math.min(1.5, base - friction));
  }

  /**
   * Calculate mesh resilience based on active node count
   * 
   * @param activeNodes - Number of active nodes in K4 mesh
   * @returns Resilience description
   */
  static getResilience(activeNodes: number): string {
    if (activeNodes >= 4) return "100% - ISOSTATIC";
    if (activeNodes === 3) return "57.7% - STABLE";
    return "DEGRADED";
  }

  /**
   * Calculate dRfge visual scale factor for 3D rendering
   * 
   * @param curvature - Current κ value
   * @returns Scale factor for mesh visualization
   */
  static getScaleFactor(curvature: number): number {
    // Scale oscillates based on curvature deviation from 1.0
    return 0.8 + (curvature - 1.0) * 0.3;
  }

  /**
   * Complete Ricci calculation for a given input state
   * 
   * @param input - RicciInput with latency, noise, node count
   * @returns RicciOutput with curvature, resilience, scale
   */
  static calculate(input: RicciInput): RicciOutput {
    const curvature = this.calculateCurvature(input.latency, input.noise);
    const resilience = this.getResilience(input.activeNodes);
    const scale = this.getScaleFactor(curvature);

    return { curvature, resilience, scale };
  }
}

// Helper function for oscillation simulation
let timeOffset = 0;

export function getAnimatedCurvature(baseCurvature: number, time: number): number {
  // Add subtle breathing oscillation
  const oscillation = Math.sin(time * 0.5) * 0.1;
  return Math.max(0.5, Math.min(1.5, baseCurvature + oscillation));
}