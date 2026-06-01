const CREDITS_KEY = 'p31_karma_balance';
const EVENT_KEY = 'p31_karma_events';
const MAX_EVENTS = 200;

function loadStore(): { balance: number; events: { kind: string; delta: number }[] } {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    const events = JSON.parse(localStorage.getItem(EVENT_KEY) || '[]') as { kind: string; delta: number }[];
    return { balance: raw ? Number(raw) : 0, events };
  } catch {
    return { balance: 0, events: [] };
  }
}

function persist(balance: number, events: { kind: string; delta: number }[]): void {
  try {
    const capped = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    localStorage.setItem(CREDITS_KEY, String(balance));
    localStorage.setItem(EVENT_KEY, JSON.stringify(capped));
  } catch { /* ignore */ }
}

export function getBalance(): number {
  return loadStore().balance;
}

export function mintCredits(amount: number, kind: string): number {
  const { balance, events } = loadStore();
  const updated = { kind, delta: amount };
  persist(balance + amount, [...events, updated]);
  return balance + amount;
}

export function spendCredits(amount: number, kind: string): boolean {
  const { balance, events } = loadStore();
  if (balance < amount) return false;
  const updated = { kind, delta: -amount };
  persist(balance - amount, [...events, updated]);
  return true;
}
