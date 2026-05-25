import type { PHOSPhase, PHOSEvent, PHOSConfig, PhaseState, ConvergenceData } from '../master';

export class SignalPhase implements PHOSPhase {
  id = 'signal';
  version = '0.1.0';
  status: 'alpha' | 'beta' | 'stable' | 'disabled' = 'alpha';

  private config: PHOSConfig | null = null;
  private active = false;
  private errorCount = 0;
  private lastActivity = 0;

  private signalQueue: Array<{ type: string; payload: any; priority: number; timestamp: number }> = [];
  private routeTable: Map<string, { target: string; persona: string; active: boolean }> = new Map();
  private meshPathways: Map<string, { vertices: string[]; weight: number; status: string }> = new Map();

  async initialize(config: PHOSConfig): Promise<void> {
    this.config = config;
    console.log('[SignalPhase] Initializing signal mesh...');
    this.setupDefaultRoutes();
    this.lastActivity = Date.now();
  }

  private setupDefaultRoutes(): void {
    this.routeTable.set('voice.persona.switch', { target: 'bros', persona: 'wj', active: true });
    this.routeTable.set('voice.intent.route', { target: 'router', persona: 'wj', active: true });
    this.routeTable.set('bros.persona.changed', { target: 'router', persona: 'system', active: true });
    this.routeTable.set('router.mesh.update', { target: 'visual', persona: 'system', active: true });
    console.log(`[SignalPhase] ${this.routeTable.size} default routes registered`);
  }

  activate(): void {
    this.active = true;
    this.status = 'alpha';
    console.log('[SignalPhase] Activated');
  }

  deactivate(): void {
    this.active = false;
    this.signalQueue = [];
    console.log('[SignalPhase] Deactivated');
  }

  destroy(): void {
    this.signalQueue = [];
    this.routeTable.clear();
    this.meshPathways.clear();
    console.log('[SignalPhase] Destroyed');
  }

  onConvergence(week: number, data: ConvergenceData): void {
    data.deliverables = [
      'Signal routing table',
      'Persona-activated mesh pathways',
      'Priority signal queue',
      'Voice-Bros-Router signal bridge'
    ];
    data.dependencies = ['voice', 'bros', 'router'];
    data.blockers = [];
    data.confidence = week >= 2 ? 0.85 : 0.3;
  }

  getState(): PhaseState {
    return {
      status: this.active ? 'active' : 'paused',
      lastActivity: this.lastActivity,
      errorCount: this.errorCount,
      metrics: {
        routesRegistered: this.routeTable.size,
        queueDepth: this.signalQueue.length,
        pathwaysActive: this.meshPathways.size
      }
    };
  }

  emit(event: PHOSEvent): void {
  }

  on(event: string, handler: (event: PHOSEvent) => void): void {
  }

  routeSignal(type: string, payload: any, priority: number = 2): boolean {
    const route = this.routeTable.get(type);
    if (!route || !route.active) {
      console.log(`[SignalPhase] No active route for signal: ${type}`);
      return false;
    }

    this.signalQueue.push({ type, payload, priority, timestamp: Date.now() });
    this.lastActivity = Date.now();

    this.emit({
      type: `signal.routed.${type}`,
      payload: { target: route.target, persona: route.persona, signalPayload: payload },
      timestamp: Date.now(),
      source: 'signal',
      persona: route.persona as any,
      priority: priority === 0 ? 'urgent' : priority === 1 ? 'high' : 'normal'
    });

    console.log(`[SignalPhase] Signal routed: ${type} → ${route.target} (${route.persona})`);
    return true;
  }

  getRoute(targetSignal: string): { target: string; persona: string; active: boolean } | undefined {
    return this.routeTable.get(targetSignal);
  }

  getAllRoutes(): Map<string, { target: string; persona: string; active: boolean }> {
    return new Map(this.routeTable);
  }

  activateMeshPathway(pathwayId: string, vertices: string[], weight: number): void {
    this.meshPathways.set(pathwayId, { vertices, weight, status: 'open' });
    console.log(`[SignalPhase] Pathway activated: ${pathwayId} (${vertices.length} vertices, weight: ${weight})`);
  }

  deactivateMeshPathway(pathwayId: string): void {
    const pathway = this.meshPathways.get(pathwayId);
    if (pathway) {
      pathway.status = 'closed';
      console.log(`[SignalPhase] Pathway deactivated: ${pathwayId}`);
    }
  }

  getActivePathways(): Map<string, { vertices: string[]; weight: number; status: string }> {
    return new Map(Array.from(this.meshPathways.entries()).filter(([, v]) => v.status === 'open'));
  }

  flushQueue(): Array<{ type: string; payload: any; priority: number; timestamp: number }> {
    const queue = [...this.signalQueue].sort((a, b) => a.priority - b.priority);
    this.signalQueue = [];
    return queue;
  }
}

export interface SignalRouteConfig {
  targetSignal: string;
  targetPhase: string;
  persona: string;
  active: boolean;
}

export interface MeshPathwayConfig {
  id: string;
  vertices: string[];
  weight: number;
  persona: string;
}
