// ═══════════════════════════════════════════════════════════
// k4-personal: VERTEX D — ShieldEngineDO
//
// The cage face that thinks — AI chat, synthesis,
// shield filters, tool results.
// ═══════════════════════════════════════════════════════════

import {
  ShieldEngine,
  ConversationSession,
  ChatMessage,
  Synthesis,
  ShieldConfig,
  ToolResult,
} from '@p31/k4-mesh-core';

export class ShieldEngineDO implements DurableObject {
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
    if (path.includes('/chat') && request.method === 'POST') {
      return this.handleChat(await request.json());
    }
    if (path.includes('/synthesis') && request.method === 'GET') {
      return this.getSynthesis();
    }
    if (path.includes('/synthesize') && request.method === 'POST') {
      return this.triggerSynthesis();
    }
    if (path.includes('/shield') && request.method === 'GET') {
      return this.getShieldConfig();
    }
    if (path.includes('/shield') && request.method === 'PUT') {
      return this.updateShieldConfig(await request.json());
    }

    return new Response('Not found', { status: 404 });
  }

  // Alarm cycle: 5min cache expiry, weekly synthesis trigger
  async alarm(): Promise<void> {
    // 1. Expire stale cached tool results
    const tools = await this.state.storage.list<ToolResult>({ prefix: 'tool:' });
    const now = Date.now();
    
    for (const [key, result] of tools) {
      if (result.ttl && result.ts + result.ttl < now) {
        await this.state.storage.delete(key);
      }
    }

    // 2. Check if weekly synthesis should run (Sunday 11 PM)
    const lastSynthesis = await this.state.storage.get<number>('synthesis:lastRun') || 0;
    const lastRun = new Date(lastSynthesis);
    const nowDate = new Date();
    
    if (nowDate.getDay() === 0 && nowDate.getHours() >= 23 && lastRun.getDate() !== nowDate.getDate()) {
      await this.runWeeklySynthesis();
    }

    // Reschedule alarm for 5 minutes
    this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
  }

  private async handleChat(data: { message: string; sessionId?: string }): Promise<Response> {
    const sessionId = data.sessionId || 'default';
    const session = await this.state.storage.get<ConversationSession>(`chat:${sessionId}`) || {
      session: sessionId,
      messages: [],
    };

    // Add user message
    session.messages.push({
      role: 'user',
      content: data.message,
      ts: Date.now(),
    });

    // Get current energy state from Vertex A via hub
    let energyState = { spoons: 10, trend: 'stable' };

    // Proxy to agent hub with energy context
    const response = await fetch('https://p31-agent-hub.p31.workers.dev/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: data.message,
        context: {
          energy: energyState,
          alignment: await this.state.storage.get('alignment:current'),
        },
      }),
    });

    const aiResponse = await response.json() as { message: string };
    
    // Add AI response
    session.messages.push({
      role: 'assistant',
      content: aiResponse.message,
      ts: Date.now(),
    });

    await this.state.storage.put(`chat:${sessionId}`, session);

    return Response.json({
      message: aiResponse.message,
      sessionId,
    });
  }

  private async getSynthesis(): Promise<Response> {
    const synthesis = await this.state.storage.get<Synthesis>('synthesis:latest');
    return Response.json(synthesis || {
      period: 'pending',
      maskingCost: 0,
      messageVolume: 0,
      patterns: [],
      recommendations: [],
      generatedAt: 0,
    });
  }

  private async triggerSynthesis(): Promise<Response> {
    const synthesis = await this.runWeeklySynthesis();
    return Response.json(synthesis);
  }

  private async runWeeklySynthesis(): Promise<Synthesis> {
    // Get all data from vertices
    const sessions = await this.state.storage.list<ConversationSession>({ prefix: 'chat:' });
    const allMessages = Array.from(sessions.values()).flatMap(s => s.messages);
    
    // Get timeline from Vertex C
    const timeline: any[] = [];

    const synthesis: Synthesis = {
      period: `${new Date().toISOString().split('T')[0]}`,
      maskingCost: allMessages.length * 0.1,
      messageVolume: allMessages.length,
      patterns: [
        'Communication patterns detected from weekly pattern detection pending AI analysis',
      ],
      recommendations: [
        'Recommendation generation pending AI analysis',
      ],
      generatedAt: Date.now(),
    };

    await this.state.storage.put('synthesis:latest', synthesis);
    await this.state.storage.put('synthesis:lastRun', Date.now());

    // Notify hub D->A and D->C
    await this.env.K4_HUBS.post('/hub/energy-shield', {
      type: 'synthesis-output',
      payload: { synthesis },
    });

    await this.env.K4_HUBS.post('/hub/context-shield', {
      type: 'synthesis-complete',
      payload: { synthesis },
    });

    return synthesis;
  }

  private async getShieldConfig(): Promise<Response> {
    const config = await this.state.storage.get<ShieldConfig>('shield:config') || {
      blockPatterns: [],
      bufferThreshold: 5,
      sanitizeThreshold: 7,
      criticalKeywords: [],
    };
    return Response.json(config);
  }

  private async updateShieldConfig(config: Partial<ShieldConfig>): Promise<Response> {
    const current = await this.state.storage.get<ShieldConfig>('shield:config') || {
      blockPatterns: [],
      bufferThreshold: 5,
      sanitizeThreshold: 7,
      criticalKeywords: [],
    };

    const updated = { ...current, ...config };
    await this.state.storage.put('shield:config', updated);
    
    // Notify hub D->B
    await this.env.K4_HUBS.post('/hub/signal-shield', {
      type: 'shield-update',
      payload: { config: updated },
    });

    return Response.json(updated);
  }
}

export default ShieldEngineDO;
