// ═══════════════════════════════════════════════════════════
// @p31/k4-mesh-core: LOVE Balance
// Pure functions for LOVE economy calculations from CENTAUR Wallet
// ═══════════════════════════════════════════════════════════

/**
 * Calculate LOVE transaction vesting schedule
 * Pure function - no side effects
 */
export function calculateLOVEVesting(
  amount: number,
  timestamp: number,
  vestingPeriod: number = 7 * 24 * 60 * 60 * 1000, // 7 days default
  now: number = Date.now()
): {
  vested: number;
  unvested: number;
  progress: number;
  fullyVestedAt: number;
} {
  const timeElapsed = now - timestamp;
  const progress = Math.min(1, timeElapsed / vestingPeriod);
  const vested = Math.round(amount * progress * 100) / 100;
  const unvested = amount - vested;
  
  return {
    vested,
    unvested,
    progress: Math.round(progress * 100) / 100,
    fullyVestedAt: timestamp + vestingPeriod,
  };
}

/**
 * Calculate LOVE multiplier based on relationship and context
 * Pure function
 */
export function calculateLOVEMultiplier(
  fromRelationship: string,
  context: 'ping' | 'care' | 'bond' | 'milestone' = 'ping'
): number {
  const baseMultipliers: Record<string, number> = {
    'spouse': 1.5,
    'child': 2.0,
    'family': 1.2,
    'friend': 1.0,
    'support': 1.1,
    'community': 0.8,
  };
  
  const contextMultipliers: Record<string, number> = {
    'ping': 1.0,
    'care': 1.5,
    'bond': 2.0,
    'milestone': 3.0,
  };
  
  const base = baseMultipliers[fromRelationship] || 1.0;
  const contextMult = contextMultipliers[context] || 1.0;
  
  return base * contextMult;
}

/**
 * Calculate daily LOVE cap for a user
 * Pure function
 */
export function calculateDailyLOVECap(
  trustScore: number, // 0-10
  accountAge: number // days
): number {
  const baseCap = 50;
  const trustBonus = trustScore * 5;
  const ageBonus = Math.min(accountAge / 30, 6) * 10;
  
  return baseCap + trustBonus + ageBonus;
}

/**
 * Calculate LOVE decay over time for inactivity
 * Pure function
 */
export function calculateLOVEDecay(
  balance: number,
  lastActivity: number,
  now: number = Date.now()
): number {
  const daysInactive = (now - lastActivity) / (1000 * 60 * 60 * 24);
  
  if (daysInactive < 7) return balance;
  if (daysInactive < 30) return balance * 0.9;
  if (daysInactive < 90) return balance * 0.75;
  return balance * 0.5;
}

/**
 * Validate LOVE transaction
 * Pure function
 */
export function validateLOVETransaction(
  sender: { balance: number; dailySpent: number; dailyCap: number },
  recipient: string,
  amount: number,
  context: string
): {
  valid: boolean;
  error?: string;
  fee?: number;
} {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }
  
  if (sender.balance < amount) {
    return { valid: false, error: 'Insufficient balance' };
  }
  
  if (sender.dailySpent + amount > sender.dailyCap) {
    return { valid: false, error: 'Daily cap exceeded' };
  }
  
  // 1% transaction fee for all transfers
  const fee = Math.round(amount * 0.01 * 100) / 100;
  
  return { valid: true, fee };
}
