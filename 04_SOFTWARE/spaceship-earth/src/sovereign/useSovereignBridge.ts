// Uni-directional bridge: NodeContext → useSovereignStore
// Syncs spoons, love, tier, game data into the sovereign store
// so the 3D HUD arc can display live production data.
import { useEffect } from 'react';
import { useNode } from '../contexts/NodeContext';
import { useSovereignStore } from './useSovereignStore';

export function useSovereignBridge(love: number) {
  const {
    spoons, maxSpoons, tier, nodeId,
    structures, activeChallenge,
  } = useNode();

  useEffect(() => {
    useSovereignStore.setState({
      spoons,
      maxSpoons,
      tier,
      love,
      nodeId: nodeId ?? null,
      structureCount: structures.length,
      challengeName: activeChallenge?.title ?? null,
    });
  }, [spoons, maxSpoons, tier, love, nodeId, structures.length, activeChallenge]);

  // Map spoons to coherence: full spoons = high coherence
  useEffect(() => {
    if (maxSpoons > 0) {
      const spoonsRatio = spoons / maxSpoons;
      const coherenceFromSpoons = 0.3 + spoonsRatio * 0.69; // 0.3 - 0.99
      useSovereignStore.setState({ coherence: coherenceFromSpoons });
    }
  }, [spoons, maxSpoons]);
}
