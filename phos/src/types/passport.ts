/**
 * phos/src/types/passport.ts
 * Bridge: p31.cognitivePassport/1.1.0 → PHOS OS runtime type system.
 *
 * Source of truth: p31ca/ground-truth/cognitive-passport-v1-1.schema.json
 * Audience profiles: packages/shared/src/cognitive-passport-profiles.ts
 *
 * SECURITY POSTURE:
 * - This module projects PASSPORT data into PHOS-consumable shapes.
 * - The audience matrix (cognitive-passport-profiles.ts) gates which field
 *   groups cross the boundary per profile. PHOS OS uses profile 'phos-os'
 *   which excludes: med, leg, vault, fin, pii.sensitive.
 * - Raw passport stays in localStorage (p31-cogpass-v1 key).
 * - Only derived projections enter React context — never the full document.
 */

// ── Canonical schema identity (mirrors passport.astro + JSON schema) ──

export type AccessLevel = 'user' | 'operator';
export type MotionPref = 'auto' | 'reduced' | 'none' | 'full';
export type ContrastPref = 'standard' | 'high' | 'max';
export type TempPref = 'cool' | 'neutral' | 'warm';
export type ThemeId = 'auto' | 'hub' | 'org' | 'midnight' | 'genesis' | 'paper' | 'matrix';
export type ModeId = 'default' | 'focus' | 'calm' | 'vibrant' | 'muted';
export type Appearance = 'auto' | 'light' | 'dark';
export type TonePref = 'direct' | 'warm' | 'formal' | 'casual' | 'technical';
export type ResponseLength = 'brief' | 'standard' | 'detailed';
export type FormatPref = 'prose' | 'bullets' | 'code' | 'mixed';
export type FontSize = 'small' | 'standard' | 'large' | 'xl';
export type InfoDensity = 'minimal' | 'standard' | 'dense' | 'comfortable' | 'compact' | 'spacious';
export type PhosRegister = 'auto' | 'warm' | 'technical' | 'minimal';

// ── Full passport shape (localStorage wire format) ──

export interface CognitivePassport {
  $schema: 'p31.cognitivePassport/1.1.0';
  identity: {
    displayName: string;
    pronouns?: string;
    role?: string;
    oneLiner?: string;
    accessLevel: AccessLevel;
    keyId?: string;
  };
  accessibility: {
    screenComfort: number;
    motionPreference: MotionPref;
    contrastPreference: ContrastPref;
    fontSize: FontSize;
    informationDensity: InfoDensity;
    temperaturePreference: TempPref;
    colorSensitivity?: string[];
    audioPreference?: 'on' | 'optional' | 'off';
  };
  stylePreferences: {
    theme: ThemeId;
    mode: ModeId;
    appearance: Appearance;
    glassEnabled: boolean;
    animationsEnabled: boolean;
    phosGuide: boolean;
    phosRegister: PhosRegister;
  };
  communication?: {
    preferredTone: TonePref;
    avoidList: string[];
    responseLength: ResponseLength;
    formatPreference: FormatPref;
    languagePrimary?: string;
  };
  context?: {
    currentFocus?: string;
    toolsUsed?: string[];
    domain?: string;
    additionalNotes?: string;
  };
}

// ── PHOS-projected shapes (what components actually consume) → gated by audience matrix ──

export interface PhosIdentityProjection {
  readonly isOperator: boolean;
  readonly displayName: string;
  readonly truncatedKeyId?: string;
}

export interface PhosVisualState {
  readonly motion: MotionPref;
  readonly density: InfoDensity;
  readonly highContrast: boolean;
  readonly screenComfort: number;
  readonly theme: ThemeId;
  readonly mode: ModeId;
  readonly appearance: Appearance;
  readonly glassEnabled: boolean;
  readonly animationsEnabled: boolean;
}

export interface PhosLinguisticProfile {
  readonly tone: TonePref;
  readonly responseLength: ResponseLength;
  readonly formatPreference: FormatPref;
  readonly avoidPatterns: RegExp[];
}

export interface PhosContextSnapshot {
  readonly currentFocus?: string;
  readonly toolsUsed: string[];
  readonly domain?: string;
}

/**
 * The runtime context that PHOS components consume.
 * This is the ONLY passport-derived data that enters the React tree.
 * Derived from CognitivePassport by the PassportContext transformer.
 */
export interface HardenedPhosContext {
  readonly identity: PhosIdentityProjection;
  readonly visuals: PhosVisualState;
  readonly linguistics: PhosLinguisticProfile;
  readonly context: PhosContextSnapshot;
}
