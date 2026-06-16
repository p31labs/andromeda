import * as v from 'valibot';

// Color validator: hex (#RGB, #RRGGBB, #RRGGBBAA) or rgba/hsla
const ColorSchema = v.pipe(
  v.string(),
  v.regex(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))$/)
);

// Spacing validator: CSS length units (rem, em, px, %)
const SpacingSchema = v.pipe(
  v.string(),
  v.regex(/^[\d.]+(rem|em|px|%)$/)
);

// Full token schema
export const TokenSchema = v.object({
  color: v.object({
    background: v.object({
      deepSpace: ColorSchema,
      voidMuted: ColorSchema,
      panelGlass: ColorSchema,
      // --- NEW: Vault Backgrounds ---
      vaultDark: ColorSchema,    // #050510
      vaultDeep: ColorSchema,    // #0a0a12
      vaultDeeper: ColorSchema,  // #0a0a14
      vaultCore: ColorSchema,    // #0c0c14
      vaultCore2: ColorSchema,   // #111
      vaultSurface: ColorSchema, // #2a2a35
      vaultSurface2: ColorSchema, // #333
    }),
    text: v.object({
      primary: ColorSchema,
      muted: ColorSchema,
      phosphor: ColorSchema,
      // --- NEW: Typography Variants ---
      bright: ColorSchema,       // var(--color-surface)
      bright2: ColorSchema,      // #e8e6e3
      dimmed: ColorSchema,       // #8a8a95
    }),
    status: v.object({
      // --- NEW: Semantic States ---
      error: ColorSchema,        // #ef4444
      errorLight: ColorSchema,   // #fecaca
      warning: ColorSchema,      // #ffbf00
      successLight: ColorSchema, // #86efac
    }),
    accent: v.object({
      // --- NEW: Brand Accents ---
      cyan: ColorSchema,         // #00e8ff
    }),
    stage: v.object({
      void: ColorSchema,
      seed: ColorSchema,
      sprout: ColorSchema,
      sapling: ColorSchema,
      bloom: ColorSchema,
      fruit: ColorSchema,
    }),
  }),
  space: v.object({
    xs: SpacingSchema,
    sm: SpacingSchema,
    md: SpacingSchema,
    lg: SpacingSchema,
    xl: SpacingSchema,
    base: SpacingSchema, // 0.75rem = 12px
  }),
  fontFamily: v.object({
    mono: v.string(),
    sans: v.string(),
  }),
});

export type Tokens = v.InferOutput<typeof TokenSchema>;

// The actual token values
export const tokens: Tokens = {
  color: {
    background: {
      deepSpace: '#0F0F19',
      voidMuted: '#1A1A24',
      panelGlass: 'rgba(255, 255, 255, 0.05)',
      vaultDark: '#050510',
      vaultDeep: '#0a0a12',
      vaultDeeper: '#0a0a14',
      vaultCore: '#0c0c14',
      vaultCore2: '#111',
      vaultSurface: '#2a2a35',
      vaultSurface2: '#333',
    },
    text: {
      primary: '#E2E8F0',
      muted: 'rgba(255, 255, 255, 0.5)',
      phosphor: 'var(--color-phosphor)',
      bright: 'var(--color-surface)',
      bright2: '#e8e6e3',
      dimmed: '#8a8a95',
    },
    status: {
      error: '#ef4444',
      errorLight: '#fecaca',
      warning: '#ffbf00',
      successLight: '#86efac',
    },
    accent: {
      cyan: '#00e8ff',
    },
    stage: {
      void: '#475569',
      seed: '#94A3B8',
      sprout: '#4ade80',
      sapling: '#FACC15',
      bloom: '#F97316',
      fruit: '#8B5CF6',
    },
  },
  space: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    base: '0.75rem',
  },
  fontFamily: {
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    sans: 'Inter, system-ui, -apple-system, sans-serif',
  },
};

// Runtime validation guard (optional, used in dev)
export function validateTokens(raw: unknown): Tokens {
  return v.parse(TokenSchema, raw);
}
