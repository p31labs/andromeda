import { useEffect, useState } from 'react';
import { mesh } from '../lib/engine/kenosisMesh';
import { useSovereignStore } from '../sovereign/useSovereignStore';

/**
 * P31 Hook: Snaps a React component into the Kenosis CRDT Mesh
 */
export function useMesh(roomName: string) {
  const [isMeshActive, setIsMeshActive] = useState(false);

  useEffect(() => {
    mesh.ignite(roomName);
    setIsMeshActive(true);

    const unsubscribe = useSovereignStore.subscribe((state, prevState) => {
      if (state.spoons !== prevState.spoons) {
        mesh.broadcastState('spoons', state.spoons);
      }
      if (state.genesisSyncStatus !== prevState.genesisSyncStatus) {
        mesh.broadcastState('genesisSyncStatus', state.genesisSyncStatus);
      }
    });

    return () => {
      unsubscribe();
      mesh.halt();
      setIsMeshActive(false);
    };
  }, [roomName]);

  return { isMeshActive, broadcast: mesh.broadcastState.bind(mesh) };
}