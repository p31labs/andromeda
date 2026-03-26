// ═══════════════════════════════════════════════════════════════════
// WCD-PASS-04: Minting Engine
// P31 Labs — Cognitive Passport System
//
// Delta topology: All minting happens on-device.
// Awards LOVE tokens for BONDING actions.
// ═══════════════════════════════════════════════════════════════════

import { usePassportStore } from '../stores/passportStore';
import type { LoveSource } from '../lib/crypto';

// ─────────────────────────────────────────────────────────────────
// Action Types
// ─────────────────────────────────────────────────────────────────
export type MintingAction =
  | 'ATOM_PLACED'
  | 'MOLECULE_COMPLETED'
  | 'PING_SENT'
  | 'PING_RECEIVED'
  | 'QUEST_COMPLETED'
  | 'DAILY_LOGIN';

// ─────────────────────────────────────────────────────────────────
// LOVE Amount Configuration
// ─────────────────────────────────────────────────────────────────
const LOVE_REWARDS: Record<MintingAction, number> = {
  ATOM_PLACED: 0.1,
  MOLECULE_COMPLETED: 5.0,
  PING_SENT: 1.0,
  PING_RECEIVED: 1.0,
  QUEST_COMPLETED: 10.0,
  DAILY_LOGIN: 2.0,
};

// ─────────────────────────────────────────────────────────────────
// Action to LoveSource Mapping
// ─────────────────────────────────────────────────────────────────
const ACTION_TO_SOURCE: Record<MintingAction, LoveSource> = {
  ATOM_PLACED: 'bonding_game',
  MOLECULE_COMPLETED: 'bonding_game',
  PING_SENT: 'bonding_game',
  PING_RECEIVED: 'bonding_game',
  QUEST_COMPLETED: 'milestone',
  DAILY_LOGIN: 'consistency',
};

// ─────────────────────────────────────────────────────────────────
// Action Descriptions
// ─────────────────────────────────────────────────────────────────
const ACTION_DESCRIPTIONS: Record<MintingAction, string> = {
  ATOM_PLACED: 'Placed an atom in BONDING',
  MOLECULE_COMPLETED: 'Completed a molecule in BONDING',
  PING_SENT: 'Sent a PING reaction in BONDING',
  PING_RECEIVED: 'Received a PING reaction in BONDING',
  QUEST_COMPLETED: 'Completed a quest in BONDING',
  DAILY_LOGIN: 'Daily login to BONDING',
};

// ─────────────────────────────────────────────────────────────────
// Processed Actions Tracking (for deduplication)
// ─────────────────────────────────────────────────────────────────
const processedActions = new Set<string>();

/**
 * Generate a unique action key for deduplication
 */
function generateActionKey(action: MintingAction, metadata?: Record<string, unknown>): string {
  const base = `${action}-${Date.now()}`;
  if (metadata?.atomicId) {
    return `${action}-${metadata.atomicId}`;
  }
  return base;
}

/**
 * Check if an action has already been processed
 */
function isActionProcessed(actionKey: string): boolean {
  return processedActions.has(actionKey);
}

/**
 * Mark an action as processed
 */
function markActionProcessed(actionKey: string): void {
  processedActions.add(actionKey);
  
  // Clean up old entries (keep set size manageable)
  if (processedActions.size > 1000) {
    const entries = Array.from(processedActions);
    entries.slice(-500).forEach((e) => processedActions.delete(e));
  }
}

// ─────────────────────────────────────────────────────────────────
// MintingEngine
// ─────────────────────────────────────────────────────────────────
export const MintingEngine = {
  /**
   * Process a BONDING action and award LOVE
   * Includes deduplication to prevent double-awarding
   */
  async processAction(
    action: MintingAction,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; loveAwarded: number; error?: string }> {
    // Generate action key for deduplication
    const actionKey = generateActionKey(action, metadata);
    
    // Check for duplicate
    if (isActionProcessed(actionKey)) {
      console.log('[MintingEngine] Action already processed:', actionKey);
      return { success: false, loveAwarded: 0, error: 'Action already processed' };
    }
    
    // Get the award amount
    const loveAmount = LOVE_REWARDS[action];
    const loveSource = ACTION_TO_SOURCE[action];
    const description = ACTION_DESCRIPTIONS[action];
    
    try {
      // Attempt to award LOVE through the passport store
      await usePassportStore.getState().awardLove(
        loveAmount,
        loveSource,
        description,
        metadata
      );
      
      // Mark as processed
      markActionProcessed(actionKey);
      
      console.log('[MintingEngine] LOVE awarded:', {
        action,
        amount: loveAmount,
        source: loveSource,
        totalNow: usePassportStore.getState().totalLove,
      });
      
      return { success: true, loveAwarded: loveAmount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MintingEngine] Failed to award LOVE:', error);
      
      // If passport not initialized, still mark as processed but return error
      if (errorMessage.includes('not initialized')) {
        return { success: false, loveAwarded: 0, error: errorMessage };
      }
      
      return { success: false, loveAwarded: 0, error: errorMessage };
    }
  },

  /**
   * Get the LOVE reward amount for an action
   */
  getRewardAmount(action: MintingAction): number {
    return LOVE_REWARDS[action];
  },

  /**
   * Get all available actions and their rewards
   */
  getActionRewards(): Array<{ action: MintingAction; reward: number; description: string }> {
    return Object.entries(LOVE_REWARDS).map(([action, reward]) => ({
      action: action as MintingAction,
      reward,
      description: ACTION_DESCRIPTIONS[action as MintingAction],
    }));
  },

  /**
   * Clear processed actions (for testing or reset)
   */
  clearProcessedActions(): void {
    processedActions.clear();
    console.log('[MintingEngine] Processed actions cleared');
  },

  /**
   * Check if passport is ready for minting
   */
  isReady(): boolean {
    const state = usePassportStore.getState();
    return state.isInitialized && state.passport !== null;
  },
};

// ─────────────────────────────────────────────────────────────────
// Convenience Hook for Components
// ─────────────────────────────────────────────────────────────────
export function useMintingEngine() {
  return {
    processAction: MintingEngine.processAction,
    getRewardAmount: MintingEngine.getRewardAmount,
    getActionRewards: MintingEngine.getActionRewards,
    isReady: MintingEngine.isReady,
  };
}
