/**
 * Chromatica Type Definitions
 */

// Project Types
export interface Project {
  id: string;
  name: string;
  description: string;
  colorPalette: ColorSwatch[];
  createdAt: number;
  updatedAt: number;
  autoSaveEnabled: boolean;
  pqcSignature?: string;
}

export interface ColorSwatch {
  id: string;
  projectId: string;
  hexColor: string;
  name: string;
  usageCount: number;
  createdByVoice: boolean;
  pqcSignature?: string;
}

// Asset Types
export interface CreativeAsset {
  id: string;
  projectId: string;
  assetType: AssetType;
  r2Key: string;
  thumbnailR2Key: string;
  encryptedMetadata: string;
  createdViaVoice: boolean;
  pqcSignature?: string;
}

export type AssetType = 'image' | 'palette' | 'gradient' | 'font';

// Accessibility Types
export interface UsagePattern {
  id: string;
  sessionStart: number;
  sessionEnd?: number;
  voiceCommandsUsed: number;
  touchInteractions: number;
  restBreaksTaken: number;
  fatigueScore: number;
  painReports: number;
  pqcSignature?: string;
}

export interface PainLogEntry {
  id: string;
  timestamp: number;
  painLevel: number;
  triggerAction: string;
  mitigatedBy: string;
  notes?: string;
  slhSignature?: string;
}

// Voice Types
export interface VoiceCommandResult {
  recognized: boolean;
  command?: string;
  confidence: number;
  requiresConfirmation: boolean;
}

// PQC Types
export interface PQCSignature {
  signature: string;
  publicKey: string;
  algorithm: 'ML-DSA-65' | 'SLH-DSA-SHA2-128s';
}

export interface PQCEncryption {
  ciphertext: string;
  publicKey: string;
  algorithm: 'ML-KEM-768';
}

// UI Types
export interface AccessibilitySettings {
  touchTargetSize: 96 | 64 | 48;
  fontSize: 24 | 32 | 40;
  contrastMode: 'normal' | 'high' | 'dark';
  voiceEnabled: boolean;
  restIntervalMinutes: number;
  autoRestEnabled: boolean;
}

// API Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pqcSignature?: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  createdViaVoice: boolean;
  pqcPublicKey: string;
}

export interface VoiceCommandRequest {
  audio: string;
  sessionId: string;
  expectedPhrases: string[];
}

export interface FatigueStatus {
  fatigueScore: number;
  recommendedAction: 'continue' | 'rest_break' | 'stop';
  estimatedRecoverySeconds: number;
}
