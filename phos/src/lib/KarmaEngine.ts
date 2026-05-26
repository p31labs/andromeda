const BALANCE_KEY = 'phos_love_balance';
const HISTORY_KEY = 'phos_love_history';
const MAX_HISTORY = 50;

export interface LoveTransaction {
  amount: number;
  reason: string;
  timestamp: string;
}

export class KarmaEngine {
  static getBalance(): number {
    try {
      const raw = localStorage.getItem(BALANCE_KEY);
      if (!raw) return 0;
      return parseFloat(raw) || 0;
    } catch {
      return 0;
    }
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

  static addLove(amount: number, reason: string): number {
    const current = this.getBalance();
    const newBalance = parseFloat((current + amount).toFixed(2));
    try {
      localStorage.setItem(BALANCE_KEY, String(newBalance));
      const history = this.getHistory();
      history.push({ amount, reason, timestamp: new Date().toISOString() });
      if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // silently fail
    }
    return newBalance;
  }

  static reset(): void {
    try {
      localStorage.removeItem(BALANCE_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // silently fail
    }
  }
}
