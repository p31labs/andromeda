/**
 * P31 Arcade SDK
 * Session tracking for CHUMP + Love Economy integration
 * Games embed this to report play sessions to parent dashboard
 */

export interface ArcadeSDKConfig {
  gameId: string;
  playerId: 'sj' | 'wj';
  apiBase?: string;
  debug?: boolean;
}

export interface SessionData {
  gameId: string;
  playerId: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  durationMinutes: number;
  score?: number;
  scorePercentile?: number;
  coopWith?: string;
  gameMode?: string;
}

export class ArcadeSDK {
  private config: ArcadeSDKConfig;
  private session: SessionData | null = null;
  private heartbeatInterval: number | null = null;
  private debug: boolean;

  // Game configurations (mirrors parent policy)
  static GAME_CONFIG: Record<string, {
    category: 'sports' | 'strategy' | 'physics' | 'creative';
    maxSessionMinutes: number;
    baseRate: number;
    learningBonus: number;
    coopEnabled: boolean;
  }> = {
    smallball: {
      category: 'sports',
      maxSessionMinutes: 60,
      baseRate: 0.10,
      learningBonus: 1.0,
      coopEnabled: true,
    },
    gridiron: {
      category: 'sports',
      maxSessionMinutes: 60,
      baseRate: 0.10,
      learningBonus: 1.0,
      coopEnabled: true,
    },
    cards: {
      category: 'strategy',
      maxSessionMinutes: 45,
      baseRate: 0.12,
      learningBonus: 1.0,
      coopEnabled: true,
    },
    strategy: {
      category: 'strategy',
      maxSessionMinutes: 45,
      baseRate: 0.12,
      learningBonus: 1.0,
      coopEnabled: false,
    },
    'liquid-sculptor': {
      category: 'physics',
      maxSessionMinutes: 90,
      baseRate: 0.15,
      learningBonus: 1.5,
      coopEnabled: false,
    },
    'resonance-rings': {
      category: 'physics',
      maxSessionMinutes: 90,
      baseRate: 0.15,
      learningBonus: 1.5,
      coopEnabled: false,
    },
    'magnetic-poetry': {
      category: 'physics',
      maxSessionMinutes: 90,
      baseRate: 0.15,
      learningBonus: 1.5,
      coopEnabled: false,
    },
    'orbital-drift': {
      category: 'physics',
      maxSessionMinutes: 90,
      baseRate: 0.15,
      learningBonus: 1.5,
      coopEnabled: false,
    },
    'geodesic-builder': {
      category: 'creative',
      maxSessionMinutes: 120,
      baseRate: 0.00,
      learningBonus: 1.0,
      coopEnabled: true,
    },
  };

  constructor(config: ArcadeSDKConfig) {
    this.config = {
      apiBase: 'https://chump-edge.trimtab-signal.workers.dev',
      debug: false,
      ...config,
    };
    this.debug = this.config.debug || false;

    if (this.debug) {
      console.log('[ArcadeSDK] Initialized', { gameId: config.gameId, playerId: config.playerId });
    }
  }

  /**
   * Start a new game session
   */
  async startSession(gameMode?: string): Promise<SessionData> {
    if (this.session) {
      await this.endSession();
    }

    this.session = {
      gameId: this.config.gameId,
      playerId: this.config.playerId,
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      durationMinutes: 0,
      gameMode,
    };

    // Report to edge worker
    try {
      await this.reportSession('start');
    } catch (err) {
      if (this.debug) console.error('[ArcadeSDK] Failed to report start:', err);
    }

    // Start heartbeat (every 30 seconds)
    this.heartbeatInterval = window.setInterval(() => {
      this.reportHeartbeat();
    }, 30000);

    if (this.debug) {
      console.log('[ArcadeSDK] Session started:', this.session.sessionId);
    }

    return this.session;
  }

  /**
   * End the current session and calculate credits
   */
  async endSession(score?: number, scorePercentile?: number): Promise<SessionData | null> {
    if (!this.session) return null;

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Calculate duration
    this.session.endTime = Date.now();
    this.session.durationMinutes = Math.floor(
      (this.session.endTime - this.session.startTime) / 60000
    );
    this.session.score = score;
    this.session.scorePercentile = scorePercentile;

    // Apply session cap
    const config = ArcadeSDK.GAME_CONFIG[this.config.gameId];
    const cappedDuration = Math.min(this.session.durationMinutes, config.maxSessionMinutes);

    // Calculate credits
    const credits = this.calculateCredits(cappedDuration, scorePercentile || 50);

    // Report to edge worker
    try {
      await this.reportSession('end', { credits });
    } catch (err) {
      if (this.debug) console.error('[ArcadeSDK] Failed to report end:', err);
    }

    if (this.debug) {
      console.log('[ArcadeSDK] Session ended:', {
        sessionId: this.session.sessionId,
        duration: this.session.durationMinutes,
        capped: cappedDuration,
        credits,
      });
    }

    const session = this.session;
    this.session = null;
    return session;
  }

  /**
   * Mark this session as co-op with sibling
   */
  setCoopPartner(siblingId: 'sj' | 'wj'): void {
    if (this.session) {
      this.session.coopWith = siblingId;
    }
  }

  /**
   * Get current session info
   */
  getSession(): SessionData | null {
    return this.session;
  }

  /**
   * Check if game is allowed for this player
   */
  static isGameAllowed(gameId: string, playerId: 'sj' | 'wj'): boolean {
    const wjWhitelist = [
      'smallball', 'gridiron', 'liquid-sculptor',
      'magnetic-poetry', 'geodesic-builder'
    ];

    if (playerId === 'wj' && !wjWhitelist.includes(gameId)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate credits for a session
   */
  calculateCredits(durationMinutes: number, percentile: number): number {
    const config = ArcadeSDK.GAME_CONFIG[this.config.gameId];

    if (!config) return 0;

    // Base calculation
    const baseAmount = (config.baseRate * durationMinutes) / 60;

    // Skill multiplier (1.0 - 2.0 based on percentile)
    const skillMultiplier = 1 + (percentile / 100);

    // Learning bonus (physics games)
    const learningMultiplier = config.learningBonus;

    // Co-op bonus (if set)
    const coopMultiplier = this.session?.coopWith ? 1.5 : 1.0;

    return baseAmount * skillMultiplier * learningMultiplier * coopMultiplier;
  }

  private generateSessionId(): string {
    return `${this.config.gameId}-${this.config.playerId}-${Date.now()}`;
  }

  private async reportSession(action: 'start' | 'end', extra?: { credits?: number }): Promise<void> {
    const url = `${this.config.apiBase}/api/arcade/session/${action}`;

    const body = {
      ...this.session,
      ...extra,
      timestamp: Date.now(),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  private async reportHeartbeat(): Promise<void> {
    if (!this.session) return;

    const url = `${this.config.apiBase}/api/arcade/session/heartbeat`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.session.sessionId,
          durationMinutes: Math.floor((Date.now() - this.session.startTime) / 60000),
        }),
      });
    } catch (err) {
      if (this.debug) console.error('[ArcadeSDK] Heartbeat failed:', err);
    }
  }
}

// Global instance for easy access
(window as any).ArcadeSDK = ArcadeSDK;

export default ArcadeSDK;
