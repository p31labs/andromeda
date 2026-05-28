/**
 * KarmaEngine — L.O.V.E. (Ledger of Ontological Volume and Entropy).
 *
 * balance_cents stored as integer to avoid floating-point drift.
 * Display layer converts to decimal via toDollars().
 */

const BALANCE_KEY = "phos_love_balance_cents";
const HISTORY_KEY = "phos_love_history";
const MAX_HISTORY = 50;

export interface LoveTransaction {
  amountCents: number;
  reason: string;
  timestamp: string;
}

export function toDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export class KarmaEngine {
  static getBalanceCents(): number {
    try {
      const raw = localStorage.getItem(BALANCE_KEY);
      if (!raw) return 0;
      return parseInt(raw, 10) || 0;
    } catch {
      return 0;
    }
  }

  static getBalance(): number {
    return this.getBalanceCents() / 100;
  }

  static getHistory(): LoveTransaction[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as LoveTransaction[];
    } catch {
      return [];
    }
  }

  static addLove(cents: number, reason: string): number {
    const current = this.getBalanceCents();
    const newBalance = current + cents;
    try {
      localStorage.setItem(BALANCE_KEY, String(newBalance));
      const history = this.getHistory();
      history.push({ amountCents: cents, reason, timestamp: new Date().toISOString() });
      if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* silently fail */
    }
    return newBalance;
  }

  static reset(): void {
    try {
      localStorage.removeItem(BALANCE_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* silently fail */
    }
  }
}
