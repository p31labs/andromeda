/**
 * P31 Arcade SDK v2 - Four-Domain Centaur Architecture
 * Session tracking + CHUMP integration + K4 Love Economy mesh
 */

import type {
  GameId,
  PlayerId,
  GameSession,
  K4CareFlow,
  SpectateSession,
  EarningsStack,
} from '../types/arcade';

export interface SDKConfig {
  gameId: GameId;
  playerId: PlayerId;
  apiBase?: string;
  k4MeshBase?: string;
  debug?: boolean;
}

export const GAME_CATALOG: Record<GameId, {
  name: string;
  category: 'sports' | 'strategy' | 'physics' | 'creative';
  maxSessionMinutes: number;
  baseRate: number;
  learningBonus: number;
  coopEnabled: boolean;
  spectateEnabled: boolean;
  description: string;
  url: string;
}> = {
  smallball: {
    name: 'SmallBall',
    category: 'sports',
    maxSessionMinutes: 60,
    baseRate: 0.10,
    learningBonus: 1.0,
    coopEnabled: true,
    spectateEnabled: true,
    description: 'Casual basketball with physics-based gameplay',
    url: 'https://p31-smallball.pages.dev',
  },
  gridiron: {
    name: 'Gridiron',
    category: 'sports',
    maxSessionMinutes: 60,
    baseRate: 0.10,
    learningBonus: 1.0,
    coopEnabled: true,
    spectateEnabled: true,
    description: 'Tactical football with real-time strategy',
    url: 'https://p31-gridiron.pages.dev',
  },
  cards: {
    name: 'Card Master',
    category: 'strategy',
    maxSessionMinutes: 45,
    baseRate: 0.12,
    learningBonus: 1.0,
    coopEnabled: true,
    spectateEnabled: true,
    description: 'Strategic card battles with pattern recognition',
    url: 'https://p31-cards.pages.dev',
  },
  strategy: {
    name: 'Strategy Board',
    category: 'strategy',
    maxSessionMinutes: 45,
    baseRate: 0.12,
    learningBonus: 1.0,
    coopEnabled: false,
    spectateEnabled: true,
    description: 'Classic board game with AI opponents',
    url: 'https://p31-strategy.pages.dev',
  },
  'liquid-sculptor': {
    name: 'Liquid Sculptor',
    category: 'physics',
    maxSessionMinutes: 90,
    baseRate: 0.15,
    learningBonus: 1.5,
    coopEnabled: false,
    spectateEnabled: true,
    description: 'Fluid dynamics playground with creative tools',
    url: 'https://p31-liquid-sculptor.pages.dev',
  },
  'resonance-rings': {
    name: 'Resonance Rings',
    category: 'physics',
    maxSessionMinutes: 90,
    baseRate: 0.15,
    learningBonus: 1.5,
    coopEnabled: false,
    spectateEnabled: false,
    description: 'Wave interference and harmonic puzzles',
    url: 'https://p31-resonance-rings.pages.dev',
  },
  'magnetic-poetry': {
    name: 'Magnetic Poetry',
    category: 'creative',
    maxSessionMinutes: 90,
    baseRate: 0.15,
    learningBonus: 1.5,
    coopEnabled: true,
    spectateEnabled: true,
    description: 'Neon word magnets with magnetic snap physics and Love Economy word palettes',
    url: 'https://p31-magnetic-poetry.pages.dev',
  },
  'orbital-drift': {
    name: 'Orbital Drift',
    category: 'physics',
    maxSessionMinutes: 90,
    baseRate: 0.15,
    learningBonus: 1.5,
    coopEnabled: false,
    spectateEnabled: false,
    description: 'Gravity simulation and orbital mechanics',
    url: 'https://p31-orbital-drift.pages.dev',
  },
  'geodesic-builder': {
    name: 'Geodesic Builder',
    category: 'creative',
    maxSessionMinutes: 120,
    baseRate: 0.15,
    learningBonus: 2.0,
    coopEnabled: true,
    spectateEnabled: true,
    description: 'Phase 4: Cooperative 3D construction with Love Economy avatars and Maxwell Rigidity',
    url: 'https://p31ca.org/geodesic',
  },
};

export class ArcadeSDKv2 {
  private config: Required<SDKConfig>;
  private session: GameSession | null = null;
  private spectateSession: SpectateSession | null = null;
  private heartbeatInterval: number | null = null;
  private debug: boolean;

  // SENTINEL: Game whitelist for W.J. (age-appropriate)
  static WJ_WHITELIST: GameId[] = [
    'smallball',
    'gridiron',
    'liquid-sculptor',
    'magnetic-poetry',
    'geodesic-builder',
  ];

  // Four-Domain Earnings Stack
  static EARNINGS: EarningsStack = {
    chumpMonthly: 450,
    arcadeMonthly: 30,
    combined: 480,
    availableCredits: 0,
    lastPayout: 0,
  };

  constructor(config: SDKConfig) {
    this.config = {
      apiBase: 'https://chump-edge.trimtab-signal.workers.dev',
      k4MeshBase: 'https://k4-cage.p31ca.org',
      debug: false,
      ...config,
    };
    this.debug = this.config.debug;

    if (this.debug) {
      console.log('[ArcadeSDKv2] Four-Domain Centaur initialized', {
        gameId: config.gameId,
        playerId: config.playerId,
      });
    }
  }

  /**
   * SENTINEL: Check if game is allowed for player
   */
  static isGameAllowed(gameId: GameId, playerId: PlayerId): boolean {
    if (playerId === 'wj' && !this.WJ_WHITELIST.includes(gameId)) {
      return false;
    }
    return true;
  }

  /**
   * Start a game session (solo or co-op)
   */
  async startSession(mode: 'solo' | 'coop' = 'solo', coopWith?: PlayerId): Promise<GameSession> {
    if (this.session) {
      await this.endSession();
    }

    this.session = {
      sessionId: this.generateId('session'),
      gameId: this.config.gameId,
      playerId: this.config.playerId,
      startTime: Date.now(),
      durationMinutes: 0,
      mode,
      coopWith,
      creditsEarned: 0,
    };

    // Report to CHUMP edge
    await this.reportToEdge('session/start', this.session);

    // Start heartbeat
    this.heartbeatInterval = window.setInterval(() => this.heartbeat(), 30000);

    if (this.debug) {
      console.log('[ArcadeSDKv2] Session started:', this.session.sessionId, { mode, coopWith });
    }

    return this.session;
  }

  /**
   * FAMILY SPECTATE: Start watching sibling play
   */
  async startSpectate(watching: PlayerId, gameId: GameId): Promise<SpectateSession> {
    this.spectateSession = {
      sessionId: this.generateId('spectate'),
      watcherId: this.config.playerId,
      playerId: watching,
      gameId,
      startTime: Date.now(),
      bothEarned: false,
      careFlowRecorded: false,
    };

    // Report spectate start
    await this.reportToEdge('spectate/start', this.spectateSession);

    if (this.debug) {
      console.log('[ArcadeSDKv2] Spectate started:', this.spectateSession.sessionId);
    }

    return this.spectateSession;
  }

  /**
   * End spectate session and record care flow
   */
  async endSpectate(): Promise<SpectateSession | null> {
    if (!this.spectateSession) return null;

    this.spectateSession.endTime = Date.now();
    this.spectateSession.bothEarned = true;

    // Record K4 care flow: sibling bond strengthening
    await this.recordCareFlow({
      edge: this.config.playerId === 'sj' ? 'sj↔wj' : 'sj↔wj',
      amount: 1,
      reason: 'Family Spectate session',
      timestamp: Date.now(),
      gameContext: this.spectateSession.gameId,
    });

    this.spectateSession.careFlowRecorded = true;

    // Report to edge
    await this.reportToEdge('spectate/end', this.spectateSession);

    if (this.debug) {
      console.log('[ArcadeSDKv2] Spectate ended with care flow recorded');
    }

    const session = this.spectateSession;
    this.spectateSession = null;
    return session;
  }

  /**
   * End game session and calculate credits
   */
  async endSession(score?: number, percentile?: number): Promise<GameSession | null> {
    if (!this.session) return null;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.session.endTime = Date.now();
    this.session.durationMinutes = Math.floor(
      (this.session.endTime - this.session.startTime) / 60000
    );
    this.session.score = score;
    this.session.scorePercentile = percentile;

    // Apply session cap
    const config = GAME_CATALOG[this.config.gameId];
    const cappedDuration = Math.min(this.session.durationMinutes, config.maxSessionMinutes);

    // Calculate credits
    this.session.creditsEarned = this.calculateCredits(cappedDuration, percentile || 50);

    // Record care flow for co-op
    if (this.session.coopWith) {
      await this.recordCareFlow({
        edge: 'sj↔wj',
        amount: 1,
        reason: 'Co-op gameplay session',
        timestamp: Date.now(),
        gameContext: this.config.gameId,
      });
    }

    await this.reportToEdge('session/end', this.session);

    if (this.debug) {
      console.log('[ArcadeSDKv2] Session ended:', {
        duration: this.session.durationMinutes,
        credits: this.session.creditsEarned,
        mode: this.session.mode,
      });
    }

    const session = this.session;
    this.session = null;
    return session;
  }

  /**
   * Record K4 mesh care flow
   */
  private async recordCareFlow(flow: K4CareFlow): Promise<void> {
    try {
      const url = `${this.config.k4MeshBase}/api/care-flow`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
      });

      if (this.debug) {
        console.log('[ArcadeSDKv2] Care flow recorded:', flow.edge);
      }
    } catch (err) {
      if (this.debug) console.error('[ArcadeSDKv2] Care flow failed:', err);
    }
  }

  /**
   * Calculate credits with all multipliers
   */
  calculateCredits(durationMinutes: number, percentile: number): number {
    const gameConfig = GAME_CATALOG[this.config.gameId];
    if (!gameConfig) return 0;

    // Base calculation (hourly rate pro-rated)
    const baseAmount = gameConfig.baseRate * (durationMinutes / 60);

    // Skill multiplier (1.0 - 2.0)
    const skillMultiplier = 1 + (percentile / 100);

    // Learning bonus for physics games
    const learningMultiplier = gameConfig.learningBonus;

    // Co-op bonus
    const coopMultiplier = this.session?.coopWith ? 1.5 : 1.0;

    return Math.round(baseAmount * skillMultiplier * learningMultiplier * coopMultiplier * 100) / 100;
  }

  /**
   * Get earnings stack info
   */
  static getEarningsStack(): EarningsStack {
    return { ...this.EARNINGS };
  }

  /**
   * Get available credits (funded by CHUMP)
   */
  static getAvailableCredits(): number {
    return this.EARNINGS.availableCredits;
  }

  /**
   * Check if player can afford a game session
   */
  static canAffordSession(gameId: GameId, playerCredits: number): boolean {
    const config = GAME_CATALOG[gameId];
    // Estimate max cost for session
    const estimatedCost = config.baseRate * (config.maxSessionMinutes / 60) * 2; // Max skill multiplier
    return playerCredits >= estimatedCost;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${this.config.playerId}-${Date.now()}`;
  }

  private async reportToEdge(endpoint: string, data: object): Promise<void> {
    try {
      const url = `${this.config.apiBase}/api/arcade/${endpoint}`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(data as Record<string, unknown>), timestamp: Date.now() }),
      });
    } catch (err) {
      if (this.debug) console.error('[ArcadeSDKv2] Edge report failed:', err);
    }
  }

  private async heartbeat(): Promise<void> {
    if (!this.session) return;

    try {
      const url = `${this.config.apiBase}/api/arcade/session/heartbeat`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.session.sessionId,
          durationMinutes: Math.floor((Date.now() - this.session.startTime) / 60000),
        }),
      });
    } catch (err) {
      if (this.debug) console.error('[ArcadeSDKv2] Heartbeat failed:', err);
    }
  }

  getSession(): GameSession | null {
    return this.session;
  }

  getSpectateSession(): SpectateSession | null {
    return this.spectateSession;
  }
}

export default ArcadeSDKv2;
