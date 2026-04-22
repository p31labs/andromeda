// ═══════════════════════════════════════════════════════════
// k4-personal: VERTEX B — SignalProcessorDO
//
// The cage face touching the world — incoming messages,
// voltage scoring, Fawn Guard, Fortress Mode.
// ═══════════════════════════════════════════════════════════

import {
  SignalProcessor,
  QueuedMessage,
  FawnBaseline,
  ContactEntry,
  DraftMessage,
  calculateMessageVoltage,
  calculateFawnScore,
  shouldBufferMessage,
  generateBLUF,
} from '@p31/k4-mesh-core';

export class SignalProcessorDO implements DurableObject {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Routes - accept any agent ID
    if (path.includes('/message') && request.method === 'POST') {
      return this.submitMessage(await request.json());
    }
    if (path.includes('/queue') && request.method === 'GET') {
      return this.getMessageQueue();
    }
    if (path.includes('/draft') && request.method === 'POST') {
      return this.scoreDraft(await request.json());
    }
    if (path.includes('/fawn') && request.method === 'GET') {
      return this.getFawnBaseline();
    }
    if (path.includes('/fortress') && request.method === 'POST') {
      return this.activateFortress();
    }
    if (path.includes('/fortress') && request.method === 'DELETE') {
      return this.deactivateFortress();
    }

    return new Response('Not found', { status: 404 });
  }

  // Alarm cycle: 1-second hold release, 10-message fawn recalibration
  async alarm(): Promise<void> {
    // 1. Release held messages past holdUntil
    const queue = await this.state.storage.list<QueuedMessage>({ prefix: 'msg:' });
    const now = Date.now();

    for (const [key, msg] of queue) {
      if (msg.held && msg.holdUntil <= now) {
        msg.held = false;
        await this.state.storage.put(key, msg);
        
      // Forward to shield for analysis if high voltage
      if (msg.voltage > 8) {
        try {
          await fetch(`${this.env.K4_HUBS}/hub/signal-shield`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'high-voltage-message',
              payload: { message: msg }
            }),
          });
        } catch {
          // Hub communication is best-effort
        }
      }
      }
    }

    // Reschedule alarm for 1 second
    this.state.storage.setAlarm(Date.now() + 1000);
  }

  private async submitMessage(data: { from: string; content: string }): Promise<Response> {
    // Get contact info
    const contact = await this.state.storage.get<ContactEntry>(`contact:${data.from}`);
    
    // Calculate voltage score
    const voltage = calculateMessageVoltage(data.content, contact);
    
    // Get current energy state from Vertex A via hub
    let spoons = 10; // Default
    
    const message: QueuedMessage = {
      id: crypto.randomUUID(),
      from: data.from,
      content: data.content,
      ts: Date.now(),
      voltage,
      fawnScore: 0, // Calculated for outgoing drafts
      held: shouldBufferMessage(voltage, 5, spoons),
      holdUntil: Date.now() + (shouldBufferMessage(voltage, 5, spoons) ? 30000 : 0),
    };

    await this.state.storage.put(`msg:${message.id}`, message);

    // Add to timeline via hub B->C
    await this.env.K4_HUBS.post('/hub/signal-context', {
      type: 'message-metadata',
      payload: { message }
    });

    return Response.json(message, { status: 201 });
  }

  private async getMessageQueue(): Promise<Response> {
    const messages = await this.state.storage.list<QueuedMessage>({ prefix: 'msg:', limit: 50 });
    return Response.json(Array.from(messages.values()).sort((a, b) => b.ts - a.ts));
  }

  private async scoreDraft(data: { content: string; to?: string }): Promise<Response> {
    const baseline = await this.state.storage.get<FawnBaseline>('fawn:baseline') || {
      samples: [],
      mean: 0,
      stdDev: 1,
      lastCalibrated: Date.now(),
    };

    const fawnScore = calculateFawnScore(data.content, baseline);
    const bluf = generateBLUF(data.content);

    const draft: DraftMessage = {
      id: crypto.randomUUID(),
      to: data.to || 'unknown',
      content: data.content,
      fawnScore,
      bluf,
      holdRecommended: fawnScore > 1.5,
    };

    await this.state.storage.put(`draft:${draft.id}`, draft);

    // Recalibrate baseline every 10 messages
    baseline.samples.push(fawnScore);
    if (baseline.samples.length >= 10) {
      baseline.mean = baseline.samples.reduce((a, b) => a + b, 0) / baseline.samples.length;
      baseline.stdDev = Math.sqrt(
        baseline.samples.reduce((a, b) => a + Math.pow(b - baseline.mean, 2), 0) / baseline.samples.length
      );
      baseline.lastCalibrated = Date.now();
      baseline.samples = [];
      await this.state.storage.put('fawn:baseline', baseline);
    }

    // Offer AI rewrite if fawn score high
    if (fawnScore > 1.5) {
      try {
        await fetch(`${this.env.K4_HUBS}/hub/signal-shield`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'fawn-flagged-draft',
            payload: { draft }
          }),
        });
      } catch {
        // Hub communication is best-effort
      }
    }

    return Response.json(draft);
  }

  private async getFawnBaseline(): Promise<Response> {
    const baseline = await this.state.storage.get<FawnBaseline>('fawn:baseline') || {
      samples: [],
      mean: 0,
      stdDev: 1,
      lastCalibrated: Date.now(),
    };
    return Response.json(baseline);
  }

  private async activateFortress(): Promise<Response> {
    await this.state.storage.put('fortress:active', true);
    
    // Notify all hubs
    try {
      await fetch(`${this.env.K4_HUBS}/hub/energy-voltage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'fortress-toggle',
          payload: { fortressActive: true }
        }),
      });
    } catch {
      // Hub communication is best-effort
    }

    return Response.json({ active: true, since: Date.now() });
  }

  private async deactivateFortress(): Promise<Response> {
    await this.state.storage.delete('fortress:active');
    
    try {
      await fetch(`${this.env.K4_HUBS}/hub/energy-voltage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'fortress-toggle',
          payload: { fortressActive: false }
        }),
      });
    } catch {
      // Hub communication is best-effort
    }

    // Release all held messages
    const queue = await this.state.storage.list<QueuedMessage>({ prefix: 'msg:' });
    for (const [key, msg] of queue) {
      if (msg.held) {
        msg.held = false;
        await this.state.storage.put(key, msg);
      }
    }

    return Response.json({ active: false, released: queue.size });
  }
}

export default SignalProcessorDO;
