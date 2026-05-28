/**
 * @p31/core — Standard GameEngine interface
 * All games implement this for unified lifecycle management
 */

import type { GameState, GameOptions } from './types';

type EventHandler = (...args: unknown[]) => void;

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
}
