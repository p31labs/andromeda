/**
 * phos/src/lib/PassportContext.tsx
 * Reads p31CogPass from localStorage (via p31-cogpass-reader.mjs),
 * applies audience-matrix gating, and exposes a read-only hardened
 * context to the PHOS component tree.
 *
 * SECURITY:
 * - Raw CognitivePassport NEVER enters React context.
 * - Only HardenedPhosContext (projected primitives) is exposed.
 * - avoidList strings are compiled to RegExp closures — never rendered as DOM text.
 * - PII fields (med, leg, vault, fin) are gated out at the transform boundary
 *   per the audience matrix profile 'phos-os'.
 *
 * PERFORMANCE:
 * - Context value is memoized — only re-emits when passport data actually changes.
 * - DOM attribute writes happen once per change (not per consumer).
 * - No re-render cascade: only components that call useHardenedPassport() re-render.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type {
  CognitivePassport,
  HardenedPhosContext,
  PhosIdentityProjection,
  PhosVisualState,
  PhosLinguisticProfile,
  PhosContextSnapshot,
} from '../types/passport';

// ── Baseline fallback (Gray Rock / zero-context runtime) ──

const BASELINE_IDENTITY: PhosIdentityProjection = {
  isOperator: false,
  displayName: '',
};

const BASELINE_VISUALS: PhosVisualState = {
  motion: 'reduced',
  density: 'standard',
  highContrast: false,
  screenComfort: 50,
  theme: 'hub',
  mode: 'default',
  appearance: 'auto',
  glassEnabled: false,
  animationsEnabled: true,
};

const BASELINE_LINGUISTICS: PhosLinguisticProfile = {
  tone: 'direct',
  responseLength: 'standard',
  formatPreference: 'mixed',
  avoidPatterns: [],
};

const BASELINE_CONTEXT: PhosContextSnapshot = {
  currentFocus: undefined,
  toolsUsed: [],
};

const INITIAL_BASELINE: HardenedPhosContext = {
  identity: BASELINE_IDENTITY,
  visuals: BASELINE_VISUALS,
  linguistics: BASELINE_LINGUISTICS,
  context: BASELINE_CONTEXT,
};

// ── Context shape ──

interface PassportContextValue {
  state: HardenedPhosContext;
  isHydrated: boolean;
  refresh: () => void;
}

const PassportCtx = createContext<PassportContextValue>({
  state: INITIAL_BASELINE,
  isHydrated: false,
  refresh: () => {},
});

// ── Transform: CognitivePassport → HardenedPhosContext ──
// This is the ONLY place raw passport data is projected into PHOS shape.
// All downstream components receive only the hardened projection.

function transformPassport(raw: CognitivePassport | null): HardenedPhosContext {
  if (!raw) return INITIAL_BASELINE;

  const acc = raw.accessibility ?? {};
  const style = raw.stylePreferences ?? {};
  const comm = raw.communication;
  const ctx = raw.context;
  const id = raw.identity ?? {};

  // Identity projection — no PII beyond displayName + truncated key
  const identity: PhosIdentityProjection = {
    isOperator: id.accessLevel === 'operator',
    displayName: id.displayName ?? '',
    truncatedKeyId: id.keyId ? id.keyId.slice(0, 8) : undefined,
  };

  // Visual state — drives PHOS rendering behavior
  const visuals: PhosVisualState = {
    motion: acc.motionPreference ?? 'auto',
    density: acc.informationDensity ?? 'standard',
    highContrast: acc.contrastPreference === 'high' || acc.contrastPreference === 'max',
    screenComfort: typeof acc.screenComfort === 'number'
      ? Math.max(0, Math.min(100, acc.screenComfort))
      : 50,
    theme: style.theme ?? 'hub',
    mode: style.mode ?? 'default',
    appearance: style.appearance ?? 'auto',
    glassEnabled: style.glassEnabled ?? false,
    animationsEnabled: style.animationsEnabled !== false,
  };

  // Linguistic profile — drives FawnGuard, ChaosIngest, TheBuffer
  // avoidList is compiled to RegExp closures here — never exposed as raw strings in DOM
  const avoidList: string[] = comm?.avoidList ?? [];
  const linguistics: PhosLinguisticProfile = {
    tone: comm?.preferredTone ?? 'direct',
    responseLength: comm?.responseLength ?? 'standard',
    formatPreference: comm?.formatPreference ?? 'mixed',
    // Compile to case-insensitive whole-word matchers in closure scope only
    avoidPatterns: avoidList
      .filter(s => s.trim().length > 0)
      .map(term => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'gi');
      }),
  };

  // Context snapshot — drives AI agent injection
  const contextSnap: PhosContextSnapshot = {
    currentFocus: ctx?.currentFocus,
    toolsUsed: ctx?.toolsUsed ?? [],
    domain: ctx?.domain,
  };

  return { identity, visuals, linguistics, context: contextSnap };
}

// ── DOM attribute sync ──
// Writes operational tokens to <html> for CSS consumption.
// Called once per passport change — not per component render.

function syncDomAttributes(hardened: HardenedPhosContext): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.setAttribute('data-p31-motion', hardened.visuals.motion);
  root.setAttribute('data-p31-density', hardened.visuals.density);
  root.setAttribute('data-p31-cogpass-role', hardened.identity.isOperator ? 'operator' : 'user');
  root.style.setProperty('--p31-font-scale', {
    small: '0.875',
    standard: '1.0',
    large: '1.125',
    xl: '1.25',
  }[hardened.visuals.density === 'minimal' ? 'small' : 'standard']);

  root.setAttribute('data-p31-glass', hardened.visuals.glassEnabled ? 'on' : 'off');
  root.setAttribute('data-p31-animations', hardened.visuals.animationsEnabled ? 'on' : 'off');
}

function clearDomAttributes(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.removeAttribute('data-p31-motion');
  root.removeAttribute('data-p31-density');
  root.removeAttribute('data-p31-cogpass-role');
  root.removeAttribute('data-p31-glass');
  root.removeAttribute('data-p31-animations');
  root.style.removeProperty('--p31-font-scale');
}

// ── Provider ──

interface PassportProviderProps {
  children: React.ReactNode;
}

export const PassportProvider: React.FC<PassportProviderProps> = ({ children }) => {
  const [rawPassport, setRawPassport] = useState<CognitivePassport | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const evaluate = useCallback(() => {
    try {
      const api = (window as any).p31CogPass;
      if (!api || typeof api.get !== 'function') {
        setRawPassport(null);
        setIsHydrated(true);
        return;
      }
      const p = api.get();
      setRawPassport(p ? normalizePassport(p) : null);
      setIsHydrated(true);
    } catch {
      setRawPassport(null);
      setIsHydrated(true);
    }
  }, []);

  // Memoize the hardened transform — only recompute when rawPassport reference changes
  const hardened = useMemo(() => transformPassport(rawPassport), [rawPassport]);

  // Sync DOM attributes when hardened state changes
  useEffect(() => {
    if (isHydrated) {
      syncDomAttributes(hardened);
    }
    return () => {
      // Cleanup not needed on every render — only on unmount
    };
  }, [hardened, isHydrated]);

  useEffect(() => {
    evaluate();

    // Listen to canonical CogPass events (fired by p31-cogpass-reader.mjs)
    const onLoaded = () => evaluate();
    const onCleared = () => {
      setRawPassport(null);
      clearDomAttributes();
    };

    document.addEventListener('p31:cogpass-loaded', onLoaded);
    document.addEventListener('p31:cogpass-cleared', onCleared);

    return () => {
      document.removeEventListener('p31:cogpass-loaded', onLoaded);
      document.removeEventListener('p31:cogpass-cleared', onCleared);
    };
  }, [evaluate]);

  const value = useMemo(
    () => ({ state: hardened, isHydrated, refresh: evaluate }),
    [hardened, isHydrated, evaluate],
  );

  return (
    <PassportCtx.Provider value={value}>
      {children}
    </PassportCtx.Provider>
  );
};

export const useHardenedPassport = (): PassportContextValue => useContext(PassportCtx);

// ── Lightweight normalization (mirrors p31-cogpass-reader normalize) ──

function normalizePassport(raw: any): CognitivePassport | null {
  if (!raw || typeof raw !== 'object') return null;

  const p: CognitivePassport = {
    $schema: 'p31.cognitivePassport/1.1.0',
    identity: {
      ...(raw.identity || {}),
      accessLevel: raw.identity?.accessLevel === 'operator' ? 'operator' : 'user',
      displayName: raw.identity?.displayName ?? '',
    },
    accessibility: {
      screenComfort: clampInt(raw.accessibility?.screenComfort, 0, 100, 50),
      motionPreference: oneOf(raw.accessibility?.motionPreference, ['auto', 'reduced', 'none', 'full'], 'auto'),
      contrastPreference: oneOf(raw.accessibility?.contrastPreference, ['standard', 'high', 'max'], 'standard'),
      fontSize: oneOf(raw.accessibility?.fontSize, ['small', 'standard', 'large', 'xl'], 'standard'),
      informationDensity: oneOf(raw.accessibility?.informationDensity, ['minimal', 'standard', 'dense', 'comfortable', 'compact', 'spacious'], 'standard'),
      temperaturePreference: oneOf(raw.accessibility?.temperaturePreference, ['cool', 'neutral', 'warm'], 'neutral'),
      colorSensitivity: raw.accessibility?.colorSensitivity,
      audioPreference: raw.accessibility?.audioPreference,
    },
    stylePreferences: {
      theme: oneOf(raw.stylePreferences?.theme, ['auto', 'hub', 'org', 'midnight', 'genesis', 'paper', 'matrix'], 'hub'),
      mode: oneOf(raw.stylePreferences?.mode, ['default', 'focus', 'calm', 'vibrant', 'muted'], 'default'),
      appearance: oneOf(raw.stylePreferences?.appearance, ['auto', 'light', 'dark'], 'auto'),
      glassEnabled: !!raw.stylePreferences?.glassEnabled,
      animationsEnabled: raw.stylePreferences?.animationsEnabled !== false,
      phosGuide: raw.stylePreferences?.phosGuide !== false,
      phosRegister: oneOf(raw.stylePreferences?.phosRegister, ['auto', 'warm', 'technical', 'minimal'], 'auto'),
    },
    communication: raw.communication ? {
      preferredTone: oneOf(raw.communication.preferredTone, ['direct', 'warm', 'formal', 'casual', 'technical'], 'direct'),
      avoidList: Array.isArray(raw.communication.avoidList)
        ? raw.communication.avoidList.filter((s: unknown) => typeof s === 'string')
        : [],
      responseLength: oneOf(raw.communication.responseLength, ['brief', 'standard', 'detailed'], 'standard'),
      formatPreference: oneOf(raw.communication.formatPreference, ['prose', 'bullets', 'code', 'mixed'], 'mixed'),
      languagePrimary: raw.communication.languagePrimary ?? 'en',
    } : undefined,
    context: raw.context ? {
      currentFocus: raw.context.currentFocus,
      toolsUsed: Array.isArray(raw.context.toolsUsed) ? raw.context.toolsUsed : [],
      domain: raw.context.domain,
      additionalNotes: raw.context.additionalNotes,
    } : undefined,
  };

  // screenComfort cascade (mirrors cogpass-reader)
  if (p.accessibility.screenComfort < 30) {
    p.stylePreferences.glassEnabled = false;
    p.stylePreferences.animationsEnabled = false;
    if (p.accessibility.motionPreference === 'auto' || p.accessibility.motionPreference === 'full') {
      p.accessibility.motionPreference = 'reduced';
    }
  }
  if (p.accessibility.screenComfort < 10) {
    if (p.accessibility.motionPreference !== 'none') {
      p.accessibility.motionPreference = 'none';
    }
  }

  // phosRegister auto-resolution
  if (p.stylePreferences.phosRegister === 'auto') {
    const tone = p.communication?.preferredTone ?? 'direct';
    p.stylePreferences.phosRegister =
      tone === 'technical' ? 'technical' :
      tone === 'warm' || tone === 'casual' ? 'warm' :
      'minimal';
  }

  return p;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
