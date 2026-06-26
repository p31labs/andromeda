import { useEffect, useState, useCallback } from 'react';
import { mesh, getKenosisMesh, type MeshConnectionState } from '../lib/engine/kenosisMesh';
import { useSovereignStore } from '../sovereign/useSovereignStore';

export function useMesh(roomName: string) {
  const [isMeshActive, setIsMeshActive] = useState(false);
  const [connectionState, setConnectionState] = useState<MeshConnectionState>('disconnected');

  const broadcast = useCallback((key: string, value: unknown) => {
    return mesh.broadcastState(key, value);
  }, []);

  useEffect(() => {
    const meshInstance = getKenosisMesh();
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    async function init() {
      const success = await meshInstance.ignite({ persistenceKey: roomName });
      setIsMeshActive(success);
      setConnectionState(meshInstance.getConnectionState());
    }

<<<<<<< HEAD
    init();
=======
    init().catch((err) => {
      console.error('[useMesh] ignite failed:', err);
      setIsMeshActive(false);
      setConnectionState('disconnected');
    });
>>>>>>> auto-heal/ui-ux-drift-20260620-120057

    const unsubscribe = useSovereignStore.subscribe((state, prevState) => {
      if (state.spoons !== prevState.spoons) {
        meshInstance.broadcastSpoons(state.spoons);
      }
      if (state.genesisSyncStatus !== prevState.genesisSyncStatus) {
        meshInstance.broadcastGenesisStatus(state.genesisSyncStatus);
      }
    });

    const stateInterval = setInterval(() => {
      setConnectionState(meshInstance.getConnectionState());
    }, 5000);

    return () => {
      clearInterval(stateInterval);
      unsubscribe();
      meshInstance.halt();
      setIsMeshActive(false);
      setConnectionState('disconnected');
    };
  }, [roomName]);

  return { isMeshActive, connectionState, broadcast };
<<<<<<< HEAD
}
=======
}
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
