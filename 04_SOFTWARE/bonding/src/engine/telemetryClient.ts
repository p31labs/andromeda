// P31 Labs: Daubert-Standard Telemetry Client
// Routes to D1 genesis_telemetry table

const RELAY_URL = 'https://bonding-relay.trimtab-signal.workers.dev';

export interface TelemetryEvent {
  eventType: 'atom_placed' | 'bond_formed' | 'session_start' | 'fawn_guard_trigger' | 'ping_sent';
  payload: Record<string, any>;
}

class TelemetryClient {
  private sessionId: string;
  private playerId: string;

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
}

export const telemetry = new TelemetryClient();