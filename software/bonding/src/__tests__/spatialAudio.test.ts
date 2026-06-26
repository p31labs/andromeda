


      const initialPannerCount = createdPannerNodes.length;

      playSpatialSound([0, 0, 0], 440, 0.1, 'sine', 0.5);

      expect(createdPannerNodes.length).toBeGreaterThan(initialPannerCount);


      const initialOscCount = createdOscillators.length;

      playSpatialSound([0, 0, 0], 440, 0.1, 'sine', 0.5);



      const types = ['sine', 'square', 'sawtooth', 'triangle'] as const;


      const initialOscCount = createdOscillators.length;


      playAtomPlacementSound(mockAtom, 440);


      const initialOscCount = createdOscillators.length;

      playBondSpatialSound([0, 0, 0], [1, 1, 1], 523.25);


});
