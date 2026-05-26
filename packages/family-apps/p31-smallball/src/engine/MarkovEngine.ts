/**
 * Markov Baseball Engine
 * Deterministic simulation using seeded PRNG
 */

// Mulberry32 deterministic PRNG
export class Mulberry32 {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Range helper
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Integer range
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

// Types
export interface PlayerStats {
  contact: number;
  power: number;
  speed: number;
  defense: number;
  pitching: number;
}

export interface PitcherAI {
  pitchSequence: number[][]; // [balls][strikes] = pitch location quality (0-1)
  velocity: number; // 0-1 scale
  break: number; // 0-1 scale
}

export interface Count {
  balls: number;
  strikes: number;
}

export type PitchResult = 'ball' | 'strike' | 'foul' | 'contact' | 'walk' | 'strikeout';
export type AtBatResult = 'walk' | 'strikeout' | 'single' | 'double' | 'triple' | 'home_run' | 'out';

export class MarkovBaseballEngine {
  private prng: Mulberry32;
  private challengerStats: PlayerStats;
  private pitcherAI: PitcherAI;

  constructor(seed: number, challengerStats: PlayerStats, pitcherAI: PitcherAI) {
    this.prng = new Mulberry32(seed);
    this.challengerStats = challengerStats;
    this.pitcherAI = pitcherAI;
  }

  /**
   * Resolve a single pitch
   * Uses logarithmic scaling to weight randomness by stats
   */
  resolvePitch(count: Count): {
    result: PitchResult;
    newCount: Count;
    exitAtBat?: AtBatResult;
  } {
    // Get pitch quality from pitcher AI
    const pitchQuality = this.pitcherAI.pitchSequence[count.balls]?.[count.strikes] ?? 0.5;
    const randomVal = this.prng.next();

    // Contact check: contact stat vs pitch quality
    // Logarithmic scaling: high stat reduces randomness impact
    const contactThreshold = this.logarithmicScale(this.challengerStats.contact, pitchQuality);
    const powerThreshold = this.logarithmicScale(this.challengerStats.power, 0.3);
    const disciplineThreshold = this.logarithmicScale(this.challengerStats.contact * 0.7, 0.4);

    // Determine if batter swings
    const swings = randomVal < 0.7; // 70% swing rate on hittable pitches

    if (!swings) {
      // Take pitch
      if (pitchQuality > 0.6) {
        // Called strike
        const newStrikes = count.strikes + 1;
        if (newStrikes >= 3) {
          return { result: 'strike', newCount: { balls: count.balls, strikes: 3 }, exitAtBat: 'strikeout' };
        }
        return { result: 'strike', newCount: { balls: count.balls, strikes: newStrikes } };
      }
      // Ball
      const newBalls = count.balls + 1;
      if (newBalls >= 4) {
        return { result: 'ball', newCount: { balls: 4, strikes: count.strikes }, exitAtBat: 'walk' };
      }
      return { result: 'ball', newCount: { balls: newBalls, strikes: count.strikes } };
    }

    // Batter swings - determine outcome
    const swingQuality = this.prng.next();
    const contactMade = swingQuality < contactThreshold;

    if (!contactMade) {
      // Whiff
      const newStrikes = count.strikes + 1;
      if (newStrikes >= 3) {
        return { result: 'strike', newCount: { balls: count.balls, strikes: 3 }, exitAtBat: 'strikeout' };
      }
      return { result: 'strike', newCount: { balls: count.balls, strikes: newStrikes } };
    }

    // Contact made - determine quality
    const contactQuality = this.prng.next();

    if (contactQuality < 0.15) {
      // Foul ball (can only add strike if < 2 strikes)
      if (count.strikes < 2) {
        return { result: 'foul', newCount: { balls: count.balls, strikes: count.strikes + 1 } };
      }
      // Foul with 2 strikes = no change
      return { result: 'foul', newCount: count };
    }

    // Ball in play
    const hitQuality = contactQuality / contactThreshold; // Normalize

    if (hitQuality > powerThreshold && hitQuality > 0.85) {
      // Extra base or home run
      const powerRoll = this.prng.next();
      if (powerRoll > 0.7) {
        return { result: 'contact', newCount: count, exitAtBat: 'home_run' };
      } else if (powerRoll > 0.4) {
        return { result: 'contact', newCount: count, exitAtBat: 'triple' };
      } else {
        return { result: 'contact', newCount: count, exitAtBat: 'double' };
      }
    } else if (hitQuality > 0.5) {
      // Single
      return { result: 'contact', newCount: count, exitAtBat: 'single' };
    } else {
      // Out
      return { result: 'contact', newCount: count, exitAtBat: 'out' };
    }
  }

  /**
   * Resolve full at-bat
   */
  resolveAtBat(): {
    result: AtBatResult;
    pitches: Array<{ count: Count; result: PitchResult }>;
    pitchesThrown: number;
  } {
    const pitches: Array<{ count: Count; result: PitchResult }> = [];
    let count: Count = { balls: 0, strikes: 0 };
    let exitResult: AtBatResult | undefined;

    // Max 12 pitches before forcing outcome
    for (let i = 0; i < 12; i++) {
      const pitch = this.resolvePitch(count);
      pitches.push({ count: { ...count }, result: pitch.result });

      if (pitch.exitAtBat) {
        exitResult = pitch.exitAtBat;
        break;
      }

      count = pitch.newCount;
    }

    // Force out if too many pitches
    if (!exitResult) {
      exitResult = 'out';
    }

    return {
      result: exitResult,
      pitches,
      pitchesThrown: pitches.length,
    };
  }

  /**
   * Simulate full inning
   */
  simulateInning(): {
    runs: number;
    hits: number;
    outs: number;
    events: Array<{ type: AtBatResult; bases: number }>;
  } {
    let runs = 0;
    let hits = 0;
    let outs = 0;
    const events: Array<{ type: AtBatResult; bases: number }> = [];

    let bases = [false, false, false]; // 1st, 2nd, 3rd

    while (outs < 3) {
      const atBat = this.resolveAtBat();

      const baseMap: Record<AtBatResult, number> = {
        walk: 0,
        strikeout: 0,
        single: 1,
        double: 2,
        triple: 3,
        home_run: 4,
        out: 0,
      };

      const basesAdvanced = baseMap[atBat.result];

      if (atBat.result === 'strikeout' || atBat.result === 'out') {
        outs++;
      } else if (atBat.result !== 'walk') {
        hits++;
      }

      // Simple base advancement (not perfectly accurate but deterministic)
      if (atBat.result === 'home_run') {
        runs += 1 + bases.filter(Boolean).length;
        bases = [false, false, false];
      } else if (basesAdvanced > 0) {
        // Advance runners
        for (let i = 2; i >= 0; i--) {
          if (bases[i]) {
            const newBase = i + basesAdvanced;
            if (newBase >= 3) {
              runs++;
            } else {
              bases[newBase] = true;
            }
            bases[i] = false;
          }
        }
        // Batter to base
        if (basesAdvanced <= 3) {
          bases[basesAdvanced - 1] = true;
        }
      } else if (atBat.result === 'walk') {
        // Force advance if bases loaded
        if (bases[0] && bases[1] && bases[2]) {
          runs++;
        } else if (bases[0] && bases[1]) {
          bases[2] = true;
        } else if (bases[0]) {
          bases[1] = true;
        }
        bases[0] = true;
      }

      events.push({ type: atBat.result, bases: basesAdvanced });
    }

    return { runs, hits, outs, events };
  }

  /**
   * Logarithmic scaling function
   * Higher stats reduce randomness impact
   */
  private logarithmicScale(stat: number, difficulty: number): number {
    // Normalize stat to 0-1
    const normalizedStat = Math.min(100, Math.max(0, stat)) / 100;
    // Logarithmic curve: high stats have diminishing returns but higher floor
    const scaled = Math.log(1 + normalizedStat * 9) / Math.log(10);
    // Weight against difficulty
    return scaled * (1.2 - difficulty * 0.4);
  }
}

// Deterministic hash for match verification
export async function hashMatchEvents(events: unknown[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(events));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
