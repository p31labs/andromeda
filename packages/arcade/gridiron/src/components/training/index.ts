// P31 Gridiron: Training Minigames Barrel Export (10000%)
export { SledPushGame } from './SledPushGame';
export { ConeDrillGame } from './ConeDrillGame';
export { SevenOnSevenGame } from './SevenOnSevenGame';
export { GauntletGame } from './GauntletGame';
export { FilmRoomGame } from './FilmRoomGame';

import type { MinigameResult, TrainingStationId, SpoonState } from '../../types';

export interface TrainingGameProps {
  spoonCount: SpoonState;
  onComplete: (result: MinigameResult) => void;
}

export const TRAINING_COMPONENTS = {
  sledPush: () => import('./SledPushGame').then(m => m.SledPushGame),
  coneDrills: () => import('./ConeDrillGame').then(m => m.ConeDrillGame),
  sevenOnSeven: () => import('./SevenOnSevenGame').then(m => m.SevenOnSevenGame),
  gauntlet: () => import('./GauntletGame').then(m => m.GauntletGame),
  filmRoom: () => import('./FilmRoomGame').then(m => m.FilmRoomGame),
} as const;

export function getTrainingComponent(stationId: TrainingStationId) {
  return TRAINING_COMPONENTS[stationId] || TRAINING_COMPONENTS.sledPush;
}
