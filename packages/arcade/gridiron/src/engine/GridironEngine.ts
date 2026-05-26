/**
 * Gridiron Engine
 * Deterministic 5v5 Football Simulation with Spatial State Machine
 */

import { Mulberry32 } from './Mulberry32';

export type PlayType = 'RUN' | 'PASS_SHORT' | 'PASS_DEEP' | 'SCREEN' | 'BLITZ' | 'COVER_2' | 'COVER_3' | 'MAN';

export interface PlayerStats {
  speed: number;      // 0-99
  catch: number;      // 0-99
  throw_power: number; // 0-99 (QB only)
  tackle: number;     // 0-99
  coverage: number;   // 0-99 (defense)
  break_tackle: number; // 0-99
}

export interface Route {
  x: number;      // Target X position on field
  y: number;      // Target Y position (depth)
  timing: number; // Seconds to reach target
}

export interface Playbook {
  id: string;
  play_type: PlayType;
  formation: string;
  routes: Record<string, Route>;
  blitzers?: string[];
}

export interface PlayerState {
  id: string;
  position: string;
  stats: PlayerStats;
  x: number;
  y: number;
  hasBall: boolean;
  isTackled: boolean;
}

export type GamePhase = 'PRE_SNAP' | 'ACTIVE' | 'PASS_IN_AIR' | 'TACKLE_RESOLUTION' | 'COMPLETE';

export type PlayOutcome =
  | 'COMPLETE'
  | 'INCOMPLETE'
  | 'RUN_GAIN'
  | 'SACK'
  | 'INT'
  | 'TOUCHDOWN'
  | 'TURNOVER_DOWN'
  | 'PASS_DEFENDED';

export interface PlayResult {
  outcome: PlayOutcome;
  yardsGained: number;
  ballCarrierId: string | null;
  tacklerId: string | null;
  passDistance: number;
  timeOfPlay: number;
  events: PlayEvent[];
}

export interface PlayEvent {
  time: number;
  type: string;
  actorId: string;
  targetId?: string;
  position: { x: number; y: number };
}

export class GridironEngine {
  private prng: Mulberry32;
  private offense: PlayerState[];
  private defense: PlayerState[];
  private phase: GamePhase = 'PRE_SNAP';
  private ballPosition: { x: number; y: number } = { x: 0, y: 20 };
  private timeElapsed: number = 0;
  private events: PlayEvent[] = [];
  private passRushTime: number = 0;
  private passInAir: boolean = false;

  constructor(
    seed: number,
    offense: PlayerState[],
    defense: PlayerState[],
    private lineOfScrimmage: number = 20
  ) {
    this.prng = new Mulberry32(seed);
    this.offense = offense.map(p => ({ ...p, x: p.x, y: p.y }));
    this.defense = defense.map(p => ({ ...p, x: p.x, y: p.y }));
    this.ballPosition = { x: 0, y: lineOfScrimmage };
  }

  /**
   * Execute full play simulation
   */
  simulatePlay(offPlay: Playbook, defPlay: Playbook): PlayResult {
    this.phase = 'PRE_SNAP';
    this.events = [];
    this.timeElapsed = 0;

    // 1. Formation Alignment (0.0s - 1.0s)
    this.alignFormation(offPlay, defPlay);

    // 2. Snap & Active Phase
    this.phase = 'ACTIVE';
    this.timeElapsed = 1.0;

    // 3. Pass Rush Resolution (OL vs DL)
    this.passRushTime = this.resolvePassRush();

    // 4. Route Running & Coverage
    const qb = this.offense.find(p => p.position === 'QB');
    if (!qb) throw new Error('No QB found');

    // Determine play type outcome
    if (offPlay.play_type === 'RUN') {
      return this.resolveRunPlay(qb, offPlay);
    } else {
      return this.resolvePassPlay(qb, offPlay, defPlay);
    }
  }

  /**
   * Align players to formation
   */
  private alignFormation(offPlay: Playbook, defPlay: Playbook): void {
    // Set offense positions based on formation
    const formations: Record<string, Array<{ pos: string; x: number; y: number }>> = {
      'SHOTGUN': [
        { pos: 'QB', x: 0, y: this.lineOfScrimmage - 5 },
        { pos: 'RB', x: 0, y: this.lineOfScrimmage - 2 },
        { pos: 'WR', x: -8, y: this.lineOfScrimmage },
        { pos: 'WR', x: 8, y: this.lineOfScrimmage },
        { pos: 'OL', x: 0, y: this.lineOfScrimmage },
      ],
      'I_FORM': [
        { pos: 'QB', x: 0, y: this.lineOfScrimmage - 2 },
        { pos: 'RB', x: 0, y: this.lineOfScrimmage + 3 },
        { pos: 'WR', x: -10, y: this.lineOfScrimmage },
        { pos: 'WR', x: 10, y: this.lineOfScrimmage },
        { pos: 'OL', x: 0, y: this.lineOfScrimmage },
      ],
    };

    const offFormation = formations[offPlay.formation] || formations['SHOTGUN'];
    offFormation.forEach((pos, i) => {
      if (this.offense[i]) {
        this.offense[i].x = pos.x;
        this.offense[i].y = pos.y;
      }
    });

    // Set defense positions
    this.defense.forEach((p, i) => {
      p.x = (i - 2) * 6;
      p.y = this.lineOfScrimmage + 10;
    });
  }

  /**
   * Resolve pass rush - time until pressure
   */
  private resolvePassRush(): number {
    const olStrength = this.offense
      .filter(p => p.position === 'OL')
      .reduce((sum, p) => sum + p.stats.tackle, 0) / 3;

    const dlStrength = this.defense
      .filter(p => p.position === 'DL')
      .reduce((sum, p) => sum + p.stats.tackle, 0) / 2;

    // Logarithmic scaling
    const pressureChance = this.logarithmicScale(dlStrength, olStrength);
    const random = this.prng.next();

    if (random < pressureChance * 0.3) {
      // Quick pressure (2-3 seconds)
      return 2.0 + this.prng.next() * 1.0;
    } else if (random < pressureChance * 0.7) {
      // Moderate pressure (3-4 seconds)
      return 3.0 + this.prng.next() * 1.0;
    } else {
      // Clean pocket (4-6 seconds)
      return 4.0 + this.prng.next() * 2.0;
    }
  }

  /**
   * Resolve pass play
   */
  private resolvePassPlay(qb: PlayerState, offPlay: Playbook, defPlay: Playbook): PlayResult {
    // Find best open receiver
    const receivers = this.offense.filter(p => p.position === 'WR' || p.position === 'RB');
    const coverages = this.defense.filter(p => p.position === 'CB' || p.position === 'LB');

    let bestReceiver: PlayerState | null = null;
    let bestSeparation = -Infinity;
    let bestRoute: Route | null = null;

    for (const receiver of receivers) {
      const route = offPlay.routes[receiver.position + (receivers.indexOf(receiver) + 1)];
      if (!route) continue;

      // Check if receiver can complete route before pressure
      if (route.timing > this.passRushTime) continue;

      // Calculate separation from nearest defender
      const nearestDefender = coverages.reduce((closest, def) => {
        const dist = Math.hypot(def.x - route.x, def.y - route.y);
        return dist < closest.dist ? { def, dist } : closest;
      }, { def: coverages[0], dist: Infinity });

      const separation = nearestDefender.dist;
      const coverageRoll = this.prng.next() * 100;
      const coverageSuccess = coverageRoll < nearestDefender.def.stats.coverage;

      if (!coverageSuccess && separation > bestSeparation) {
        bestSeparation = separation;
        bestReceiver = receiver;
        bestRoute = route;
      }
    }

    // Sack check
    if (!bestReceiver || this.passRushTime < 2.5) {
      const sackRoll = this.prng.next();
      if (sackRoll < 0.4) {
        return this.resolveSack(qb);
      }
    }

    if (!bestReceiver || !bestRoute) {
      return {
        outcome: 'INCOMPLETE',
        yardsGained: 0,
        ballCarrierId: null,
        tacklerId: null,
        passDistance: 0,
        timeOfPlay: this.passRushTime,
        events: this.events,
      };
    }

    // Calculate pass accuracy
    const throwAccuracy = this.logarithmicScale(qb.stats.throw_power, 30);
    const accuracyRoll = this.prng.next();

    if (accuracyRoll > throwAccuracy) {
      // Inaccurate pass
      const intRoll = this.prng.next();
      if (intRoll < 0.2) {
        return this.resolveInterception(qb, bestRoute);
      }

      return {
        outcome: 'INCOMPLETE',
        yardsGained: 0,
        ballCarrierId: null,
        tacklerId: null,
        passDistance: bestRoute.y - this.lineOfScrimmage,
        timeOfPlay: this.passRushTime + bestRoute.timing,
        events: this.events,
      };
    }

    // Complete pass - resolve YAC
    return this.resolveCatchAndRun(bestReceiver, bestRoute);
  }

  /**
   * Resolve run play
   */
  private resolveRunPlay(qb: PlayerState, offPlay: Playbook): PlayResult {
    const rb = this.offense.find(p => p.position === 'RB');
    if (!rb) throw new Error('No RB found');

    rb.hasBall = true;
    this.ballPosition = { x: rb.x, y: rb.y };

    // OL blocking effectiveness
    const olPush = this.offense
      .filter(p => p.position === 'OL')
      .reduce((sum, p) => sum + this.logarithmicScale(p.stats.tackle, 50), 0) / 3;

    // Initial gap
    const gap = 2 + olPush * 5 + this.prng.next() * 3;

    // First contact resolution
    const contactY = this.lineOfScrimmage + gap;
    const nearestDefender = this.defense.reduce((closest, def) => {
      const dist = Math.hypot(def.x - rb.x, def.y - contactY);
      return dist < closest.dist ? { def, dist } : closest;
    }, { def: this.defense[0], dist: Infinity });

    const breakTackleRoll = this.prng.next();
    const breakChance = this.logarithmicScale(rb.stats.break_tackle || 50, nearestDefender.def.stats.tackle);

    if (breakTackleRoll < breakChance) {
      // Broken tackle - extra yards
      const yac = this.prng.next() * 10 * (rb.stats.speed / 100);
      const totalYards = gap + yac;

      this.events.push({
        time: this.timeElapsed + 2.0,
        type: 'BROKEN_TACKLE',
        actorId: rb.id,
        targetId: nearestDefender.def.id,
        position: { x: rb.x, y: contactY },
      });

      return {
        outcome: totalYards > 20 ? 'TOUCHDOWN' : 'RUN_GAIN',
        yardsGained: Math.floor(totalYards),
        ballCarrierId: rb.id,
        tacklerId: null,
        passDistance: 0,
        timeOfPlay: 4.0 + yac * 0.2,
        events: this.events,
      };
    } else {
      // Tackled
      return {
        outcome: 'RUN_GAIN',
        yardsGained: Math.floor(gap),
        ballCarrierId: rb.id,
        tacklerId: nearestDefender.def.id,
        passDistance: 0,
        timeOfPlay: 3.0,
        events: this.events,
      };
    }
  }

  /**
   * Resolve sack
   */
  private resolveSack(qb: PlayerState): PlayResult {
    const tackler = this.defense.find(p => p.position === 'DL') || this.defense[0];

    this.events.push({
      time: this.passRushTime,
      type: 'SACK',
      actorId: tackler.id,
      targetId: qb.id,
      position: { x: qb.x, y: qb.y },
    });

    return {
      outcome: 'SACK',
      yardsGained: -Math.floor(2 + this.prng.next() * 8),
      ballCarrierId: null,
      tacklerId: tackler.id,
      passDistance: 0,
      timeOfPlay: this.passRushTime,
      events: this.events,
    };
  }

  /**
   * Resolve interception
   */
  private resolveInterception(qb: PlayerState, route: Route): PlayResult {
    const interceptor = this.defense.find(p => p.position === 'CB') || this.defense[0];

    this.events.push({
      time: this.passRushTime + route.timing * 0.5,
      type: 'INTERCEPTION',
      actorId: interceptor.id,
      targetId: qb.id,
      position: { x: route.x, y: route.y * 0.5 },
    });

    return {
      outcome: 'INT',
      yardsGained: 0,
      ballCarrierId: null,
      tacklerId: interceptor.id,
      passDistance: route.y - this.lineOfScrimmage,
      timeOfPlay: this.passRushTime + route.timing,
      events: this.events,
    };
  }

  /**
   * Resolve catch and run
   */
  private resolveCatchAndRun(receiver: PlayerState, route: Route): PlayResult {
    const catchY = route.y;
    const airYards = catchY - this.lineOfScrimmage;

    this.events.push({
      time: this.passRushTime + route.timing,
      type: 'CATCH',
      actorId: receiver.id,
      position: { x: route.x, y: catchY },
    });

    // YAC resolution
    const nearestDefender = this.defense.reduce((closest, def) => {
      const dist = Math.hypot(def.x - route.x, def.y - catchY);
      return dist < closest.dist ? { def, dist } : closest;
    }, { def: this.defense[0], dist: Infinity });

    const yacRoll = this.prng.next();
    const breakChance = this.logarithmicScale(receiver.stats.break_tackle || 40, nearestDefender.def.stats.tackle);

    let yac = 0;
    let outcome: PlayOutcome = 'COMPLETE';
    let tacklerId: string | null = nearestDefender.def.id;

    if (yacRoll < breakChance * 0.3) {
      // Big YAC - broken tackle
      yac = 15 + this.prng.next() * 20;
      tacklerId = null;

      if (catchY + yac > 100) {
        outcome = 'TOUCHDOWN';
        yac = 100 - catchY;
      }

      this.events.push({
        time: this.passRushTime + route.timing + 2.0,
        type: 'BROKEN_TACKLE_YAC',
        actorId: receiver.id,
        targetId: nearestDefender.def.id,
        position: { x: route.x, y: catchY + yac },
      });
    } else if (yacRoll < breakChance) {
      // Moderate YAC
      yac = 5 + this.prng.next() * 10;
    } else {
      // Immediate tackle
      yac = this.prng.next() * 3;
    }

    return {
      outcome,
      yardsGained: Math.floor(airYards + yac),
      ballCarrierId: receiver.id,
      tacklerId,
      passDistance: airYards,
      timeOfPlay: this.passRushTime + route.timing + yac * 0.1,
      events: this.events,
    };
  }

  /**
   * Logarithmic scaling for stat comparisons
   */
  private logarithmicScale(stat: number, difficulty: number): number {
    const normalized = Math.min(99, Math.max(0, stat)) / 100;
    const diffNormalized = Math.min(99, Math.max(0, difficulty)) / 100;
    const scaled = Math.log(1 + normalized * 9) / Math.log(10);
    return Math.max(0.1, Math.min(0.9, scaled * (1.2 - diffNormalized * 0.4)));
  }
}

// Export for hash verification
export async function hashPlayEvents(events: unknown[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(events));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
