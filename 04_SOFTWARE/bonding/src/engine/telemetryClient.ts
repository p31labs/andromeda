// P31 Labs: Daubert-Standard Telemetry Client
// Routes to D1 genesis_telemetry table

const RELAY_URL = 'https://bonding-relay.trimtab-signal.workers.dev';

export interface TelemetryEvent {
  eventType: 'atom_placed' | 'bond_formed' | 'session_start' | 'fawn_guard_trigger' | 'ping_sent' | 'spoons:update';
  payload: Record<string, any>;
}

class TelemetryClient {
  private sessionId: string;
  private playerId: string;
  private qFactor: number = 0.925;
  private quaternionVariance: number = 0;
  private angularMomentum: number = 0;

  constructor() {
    this.sessionId = crypto.randomUUID();
    
    let storedId = localStorage.getItem('p31_player_id');
    if (!storedId) {
      storedId = crypto.randomUUID();
      localStorage.setItem('p31_player_id', storedId);
    }
    this.playerId = storedId;
  }

  public async log(event: TelemetryEvent) {
    try {
      const response = await fetch(`${RELAY_URL}/d1/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          playerId: this.playerId,
          eventType: event.eventType,
          payload: event.payload,
        }),
      });

      if (!response.ok) {
        console.warn(`[Telemetry] Edge rejected packet: ${response.status}`);
      }
    } catch (error) {
      console.log('[Telemetry] Device offline. Packet queued to IndexedDB for sync-on-reconnect.');
    }
  }

  public getPlayerId() {
    return this.playerId;
  }
  
  public getSessionId() {
    return this.sessionId;
  }

  /**
   * Compute Fisher-Escolà coherence score (qFactor) for mesh link quality.
   * Degrades when operator Spoon state drops below 3 (per SOULSAFE protocol).
   * @param nodePingMs   Node round-trip latency (ms)
   * @param jitterMs     Jitter (ms)
   * @param spoonCount   Current operator available spoons (default 0 = unknown)
   */
  public computeQFactor(nodePingMs: number, jitterMs: number, spoonCount: number = 0): number {
    // Base Fisher-Escolà coherence: exponential decay with jitter scaled by ping
    const pingNorm = Math.min(nodePingMs / 100, 1.0);          // 0–1, saturates at 100ms
    const jitterNorm = Math.min(jitterMs / 50, 1.0);          // 0–1, saturates at 50ms
    const baseCoherence = Math.exp(-2.5 * (pingNorm + jitterNorm)); // ~0.92 at 0, →0 as noise rises

    // SOULSAFE: degrade multiplier if Spoon deficit
    const spoonMultiplier = spoonCount < 3 ? Math.max(0.25, spoonCount / 3) : 1.0;

    const q = Math.max(0, Math.min(1, baseCoherence * spoonMultiplier));
    this.qFactor = q;
    this.log({ eventType: 'spoons:update', payload: { qFactor: q, nodePingMs, jitterMs, spoonCount, spoonMultiplier } });
    return q;
  }

  public updateQFactor(quaternionVariance: number, angularMomentum: number) {
    this.quaternionVariance = quaternionVariance;
    this.angularMomentum = angularMomentum;
    // Legacy compute (kept for compatibility)
    const noise = Math.max(0, quaternionVariance) + Math.max(0, angularMomentum);
    this.qFactor = Math.max(0, Math.min(1, 0.925 - noise * 0.0375));
    this.log({ eventType: 'spoons:update', payload: { qFactor: this.qFactor, noise } });
  }

  public getQFactor(): number {
    return this.qFactor;
  }

  // Alias for backward compatibility
  public get qFactorValue(): number {
    return this.qFactor;
  }
}

export const telemetry = new TelemetryClient();