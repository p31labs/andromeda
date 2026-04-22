// ═══════════════════════════════════════════════════════════
// k4-personal: VERTEX C — ContextEngineDO
//
// The cage face seeing the terrain — timeline, deadlines,
// mesh topology, alignment document.
// ═══════════════════════════════════════════════════════════

import {
  ContextEngine,
  TimelineEvent,
  Deadline,
  MeshTopology,
  AlignmentDocument,
  calculateDeadlineUrgency,
  sortDeadlinesByUrgency,
  getCriticalDeadlines,
  calculateQFactor,
} from '@p31/k4-mesh-core';

export class ContextEngineDO implements DurableObject {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Routes
    if (path === '/agent/:id/state' && request.method === 'GET') {
      return this.getArbitraryState();
    }
    if (path === '/agent/:id/state' && request.method === 'PUT') {
      return this.setArbitraryState(await request.json());
    }
    if (path === '/agent/:id/timeline' && request.method === 'GET') {
      return this.getTimeline();
    }
    if (path === '/agent/:id/timeline' && request.method === 'POST') {
      return this.addTimelineEvent(await request.json());
    }
    if (path === '/agent/:id/deadlines' && request.method === 'GET') {
      return this.getDeadlines();
    }
    if (path === '/agent/:id/context' && request.method === 'GET') {
      return this.getContextDocument();
    }
    if (path === '/agent/:id/health' && request.method === 'GET') {
      return this.getHealth();
    }

    return new Response('Not found', { status: 404 });
  }

  // Alarm cycle: 5min mesh refresh, 6hr deadline urgency, 15min alignment regen
  async alarm(): Promise<void> {
    // 1. Refresh mesh topology from k4-cage
    try {
      const mesh = await fetch('https://k4-cage.p31.workers.dev/api/mesh');
      const topology = await mesh.json();
      await this.state.storage.put('mesh:topology', topology);
    } catch (e) {
      // Use cached value
    }

    // 2. Recalculate deadline urgency
    const deadlines = await this.state.storage.list<Deadline>({ prefix: 'deadline:' });
    for (const [key, deadline] of deadlines) {
      deadline.urgency = calculateDeadlineUrgency(deadline);
      await this.state.storage.put(key, deadline);
    }

    // 3. Regenerate alignment document
    await this.regenerateAlignment();

    // Reschedule alarm for 5 minutes
    this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
  }

  private async getArbitraryState(): Promise<Response> {
    const state = await this.state.storage.list({ prefix: 'state:' });
    const result: Record<string, any> = {};
    for (const [key, value] of state) {
      result[key.replace('state:', '')] = value;
    }
    return Response.json(result);
  }

  private async setArbitraryState(data: Record<string, any>): Promise<Response> {
    for (const [key, value] of Object.entries(data)) {
      await this.state.storage.put(`state:${key}`, value);
    }
    return Response.json({ success: true, updated: Object.keys(data) });
  }

  private async getTimeline(): Promise<Response> {
    const events = await this.state.storage.list<TimelineEvent>({ 
      prefix: 'timeline:', 
      limit: 100,
      reverse: true 
    });
    return Response.json(Array.from(events.values()).sort((a, b) => b.ts - a.ts));
  }

  private async addTimelineEvent(event: Omit<TimelineEvent, 'id' | 'ts'>): Promise<Response> {
    const newEvent: TimelineEvent = {
      ...event,
      id: crypto.randomUUID(),
      ts: Date.now(),
    };
    await this.state.storage.put(`timeline:${newEvent.id}`, newEvent);
    
    // Notify shield via hub C->D
    await this.env.K4_HUBS.post('/hub/context-shield', {
      type: 'timeline-update',
      payload: { timeline: [newEvent] }
    });

    return Response.json(newEvent, { status: 201 });
  }

  private async getDeadlines(): Promise<Response> {
    const deadlines = await this.state.storage.list<Deadline>({ prefix: 'deadline:' });
    const sorted = sortDeadlinesByUrgency(Array.from(deadlines.values()));
    return Response.json(sorted);
  }

  private async getContextDocument(): Promise<Response> {
    const alignment = await this.state.storage.get<AlignmentDocument>('alignment:current') || {
      markdown: '# System Alignment\n\nInitializing...',
      generatedAt: Date.now(),
      meshStatus: 'offline',
    };
    return Response.json(alignment);
  }

  private async regenerateAlignment(): Promise<void> {
    const deadlines = await this.state.storage.list<Deadline>({ prefix: 'deadline:' });
    const mesh = await this.state.storage.get<MeshTopology>('mesh:topology');
    const timeline = await this.state.storage.list<TimelineEvent>({ prefix: 'timeline:', limit: 20 });

    // Generate alignment markdown
    let markdown = `# P31 Personal Mesh Alignment\n\n`;
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    
    if (mesh) {
      markdown += `## Mesh Status\n\n`;
      markdown += `- Total LOVE: ${mesh.totalLove}\n`;
      markdown += `- Vertices online: ${Object.keys(mesh.vertices || {}).length}/4\n\n`;
    }

    const critical = getCriticalDeadlines(Array.from(deadlines.values()));
    if (critical.length > 0) {
      markdown += `## Critical Deadlines\n\n`;
      for (const d of critical.slice(0, 5)) {
        markdown += `- [${d.priority}] ${d.title} — ${new Date(d.date).toLocaleDateString()}\n`;
      }
      markdown += '\n';
    }

    const alignment: AlignmentDocument = {
      markdown,
      generatedAt: Date.now(),
      meshStatus: mesh ? 'online' : 'offline',
    };

    await this.state.storage.put('alignment:current', alignment);

    // Notify shield via hub C->D
    await this.env.K4_HUBS.post('/hub/context-shield', {
      type: 'alignment-update',
      payload: { alignment }
    });
  }

  private async getHealth(): Promise<Response> {
    const deadlineCount = await this.state.storage.list({ prefix: 'deadline:' }).then(d => d.size);
    const timelineCount = await this.state.storage.list({ prefix: 'timeline:' }).then(d => d.size);
    
    return Response.json({
      healthy: true,
      deadlines: deadlineCount,
      timelineEvents: timelineCount,
      lastAlignment: (await this.state.storage.get<AlignmentDocument>('alignment:current'))?.generatedAt || 0,
    });
  }
}

export default ContextEngineDO;
