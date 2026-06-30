export const STAGE_COLORS = {
  VOID: 'var(--color-muted)',
  SEED: '#94a3b8',
  SPROUT: '#4ade80',
  SAPLING: '#facc15',
  BLOOM: '#f97316',
  FRUIT: 'var(--color-fuchsia)',
} as const;

export type GrowthStage = keyof typeof STAGE_COLORS;

export function getStageColor(stage: GrowthStage): string {
  return STAGE_COLORS[stage] ?? 'var(--color-muted)';
}
