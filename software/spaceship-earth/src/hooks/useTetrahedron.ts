/**
 * @file useTetrahedron.ts — React hook for tetrahedron state management
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * Manages:
 * - Current tetrahedron data (by scale and id)
 * - Recursive zoom (drilling into sub_tetras)
 * - View transformation state (rotation, jitterbug phase, etc.)
 * - Auto-refresh polling
 */

import { useState, useEffect, useCallback } from 'react';
import { TetraData, TetraVertex } from '../lib/tetra/schema';
import tetraLoader from '../services/tetraLoader';

export type TetraViewState = {
  data: TetraData | null;
  scale: string;
  id: string;
  depth: number;
  parentChain: Array<{ id: string; label: string }>;
};

export function useTetrahedron(
  initialScale: string = 'personal',
  initialId: string = 'will'
) {
  const [viewState, setViewState] = useState<TetraViewState>({
    data: null,
    scale: initialScale,
    id: initialId,
    depth: 0,
    parentChain: [],
  });
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transform, setTransform] = useState({
    autoRotate: true,
    rotationSpeed: 0.5,
    jitterbugPhase: 0,
  });

  // Load tetrahedron data on mount and when scale/id changes
  useEffect(() => {
    let cancelled = false;
<<<<<<< HEAD
    
    const load = async () => {
      setIsLoading(true);
      setError(null);
      
=======

    const load = async () => {
      setIsLoading(true);
      setError(null);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      try {
        // Initialize loader on first load
        if (!tetraLoader['isInitialized']) {
          await tetraLoader.initialize();
        }
<<<<<<< HEAD
        
        const data = await tetraLoader.refresh(initialScale, initialId);
        
        if (cancelled) return;
        
=======

        const data = await tetraLoader.refresh(initialScale, initialId);

        if (cancelled) return;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        if (data) {
          setViewState({
            data,
            scale: initialScale,
            id: initialId,
            depth: 0,
            parentChain: [],
          });
        } else {
          setError('Failed to load tetrahedron data');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
<<<<<<< HEAD
    
    load();
    
=======

    load();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return () => { cancelled = true; };
  }, [initialScale, initialId]);

  // Subscribe to updates for current tetra
  useEffect(() => {
    const unsubscribe = tetraLoader.subscribe((tetra, receivedId) => {
      // Only update if this is the tetra we're viewing (or a parent/child we care about)
      if (tetra && tetra.id === viewState.id || tetra?.parent_id === viewState.id) {
        setViewState(prev => ({ ...prev, data: tetra }));
      }
    });
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    return unsubscribe;
  }, [viewState.id]);

  // Zoom into a vertex (recursive drill-down)
  const zoomIntoVertex = useCallback((vertex: TetraVertex) => {
    if (!viewState.data?.sub_tetras?.[vertex.id]) {
      // If children not loaded yet, generate them
<<<<<<< HEAD
      const children = tetraLoader.generateChildren(viewState.data);
      const childData = children[vertex.id];
      
      if (childData) {
        setViewState(prev => ({
=======
      if (viewState.data) {
        const children = tetraLoader.generateChildren(viewState.data);
        const childData = children[vertex.id];

        if (childData) {
          setViewState(prev => ({
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          ...prev,
          data: childData,
          scale: childData.metadata.scale,
          id: childData.id,
          depth: prev.depth + 1,
          parentChain: [
            ...prev.parentChain,
            { id: prev.id, label: prev.data?.metadata.class || prev.id }
          ],
        }));
<<<<<<< HEAD
=======
        }
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      }
    } else {
      // Children already exist
      const childData = viewState.data.sub_tetras[vertex.id];
      setViewState(prev => ({
        ...prev,
        data: childData,
        scale: childData.metadata.scale,
        id: childData.id,
        depth: prev.depth + 1,
        parentChain: [
          ...prev.parentChain,
          { id: prev.id, label: prev.data?.metadata.class || prev.id }
        ],
      }));
    }
  }, [viewState]);

  // Zoom out to parent
  const zoomOut = useCallback(() => {
    if (viewState.parentChain.length === 0) return;
<<<<<<< HEAD
    
    const newParentChain = [...viewState.parentChain];
    const parent = newParentChain.pop()!;
    
=======

    const newParentChain = [...viewState.parentChain];
    const parent = newParentChain.pop()!;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Re-fetch parent data (it might have updated)
    tetraLoader.refresh(parent.id.split('-').pop() || parent.id, viewState.data?.metadata.parent_id || 'personal').then(parentData => {
      if (parentData) {
        setViewState(prev => ({
          ...prev,
          data: parentData,
          scale: parentData.metadata.scale,
          id: parentData.id,
          depth: prev.depth - 1,
          parentChain: newParentChain,
        }));
      }
    });
  }, [viewState]);

  // Manual refresh
  const refresh = useCallback(async () => {
    if (!viewState.data) return;
    const refreshed = await tetraLoader.refresh(viewState.data.metadata.scale, viewState.data.id);
    if (refreshed) {
      setViewState(prev => ({ ...prev, data: refreshed }));
    }
  }, [viewState]);

  // Set jitterbug phase (for urgent override animations)
  const setJitterbugPhase = useCallback((phase: number) => {
    setTransform(prev => ({ ...prev, jitterbugPhase: phase }));
  }, []);

  return {
    ...viewState,
    isLoading,
    error,
    transform,
    setTransform,
    zoomIntoVertex,
    zoomOut,
    refresh,
    tetraLoader,
  };
}

export default useTetrahedron;
