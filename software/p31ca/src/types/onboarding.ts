/**
 * onboarding.ts — Type definitions for K₄ Settlement onboarding
 * P31 Labs, Inc. | EIN 42-1888158
 */

export interface Step {
  id: string;
  title: string;
  description: string;
}

export interface PassportData {
  did: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SettlementData {
  id: string;
  name: string;
  inviteCode: string;
  vertices: string[];
  edges: Array<{ from: string; to: string }>;
  createdAt: string;
}

export interface LoveData {
  balance: number;
  currency: 'LOVE';
}

export interface OnboardingState {
  currentStep: number;
  passport: PassportData | null;
  settlement: SettlementData | null;
  love: LoveData | null;
  completed: boolean;
  error: string | null;
}
