/**
 * @p31/core — Standard GameEngine interface
 * All games implement this for unified lifecycle management
 */

import type { GameState, GameOptions } from './types';

// WCD-QM-01: Larmor frequency constant (863 Hz - phosphorus resonance)
export const LARMOR_FREQUENCY = 863;

/**
 * Quantum-aware game engine extensions
 */
export interface QuantumGameEngine extends IGameEngine {
  updateQuantumState(phase: number, correlation?: number): void;
  getEntangledWith(): PlayerId | undefined;
  setEntangledWith(player: PlayerId): void;
}

type EventHandler = (...args: unknown[]) => void;
type PlayerId = 'sj' | 'wj' | 'will' | 'christyn';

export interface IGameEngine {
  init(canvas: HTMLCanvasElement, options?: GameOptions): void;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  getState(): GameState;
  on(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  handleInput(action: string, payload?: unknown): void;
}

export abstract class BaseGameEngine implements IGameEngine {
  protected canvas!: HTMLCanvasElement;
  protected running = false;
  protected eventHandlers = new Map<string, Set<EventHandler>>();
  protected quantumPhase: number = 0;
  protected entangledWith: PlayerId | undefined;

  abstract init(canvas: HTMLCanvasElement, options?: GameOptions): void;
  abstract getState(): GameState;
  abstract handleInput(action: string, payload?: unknown): void;

  start(): void { this.running = true; }
  pause(): void { this.running = false; }
  resume(): void { this.running = true; }
  destroy(): void { this.running = false; this.eventHandlers.clear(); }

  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, new Set());
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  protected emit(event: string, ...args: unknown[]): void {
    this.eventHandlers.get(event)?.forEach((h) => h(...args));
  }

  // WCD-QM-01: Quantum state methods
  updateQuantumState(phase: number, correlation?: number): void {
    this.quantumPhase = phase;
    if (correlation !== undefined) {
      // Apply quantum correlation to game state
      this.applyQuantumCorrelation(correlation);
    }
  }

  getEntangledWith(): PlayerId | undefined {
    return this.entangledWith;
  }

  setEntangledWith(player: PlayerId): void {
    this.entangledWith = player;
  }

  protected applyQuantumCorrelation(correlation: number): void {
    // Override in subclasses to apply quantum effects
    // correlation is in range [0, 1] from quantum coherence
  }
}
