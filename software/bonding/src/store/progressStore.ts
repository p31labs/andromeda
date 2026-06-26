import {
  createBadgeCollection,

  // Badge collection
  badgeCollection: BadgeCollection;

  // Recently earned badges (for celebration)
  recentBadges: string[];

  // Family challenge progress
  familyChallengeProgress: FamilyChallengeProgress | null;



      // ── Core stat actions ──


          const newlyEarned = newCollection.newlyEarned.map(b => b.id);


        // Check for new badge unlocks
        return get().checkAndUpdateBadges();
      },


          const newlyEarned = newCollection.newlyEarned.map(b => b.id);


      addMolecule: (formula: string) => {
        set((state) => {
          const isNew = !state.uniqueMolecules.includes(formula);
          const newUnique = isNew
            ? [...state.uniqueMolecules, formula]
            : state.uniqueMolecules;


          const newlyEarned = newCollection.newlyEarned.map(b => b.id);



          const newlyEarned = newCollection.newlyEarned.map(b => b.id);



          const newlyEarned = newCollection.newlyEarned.map(b => b.id);



        const newlyEarned = newCollection.newlyEarned;

              ...state.recentBadges,

        return { newlyEarned };
      },

      clearRecentBadges: () => {
        set({ recentBadges: [] });
      },


      // ── Family Challenge actions ──

      startFamilyChallenge: (challengeId: string) => {
        const challenge = getFamilyChallengeById(challengeId);
        if (!challenge) return;


      updateFamilyChallenge: (progress: number) => {
        set((state) => {
          if (!state.familyChallengeProgress) return state;


          return { familyChallengeProgress: newProgress };
        });
      },

      completeFamilyChallenge: () => {
        set((state) => {
          if (!state.familyChallengeProgress) return state;

          // Add sparks/rewards
          // TODO: Add to LOVE balance



export default useProgressStore;
