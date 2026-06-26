

  const currentRequired = currentLevel.requiredBonds;
  const nextRequired = LEVELS[levelIndex + 1].requiredBonds;
  const progress = (bonds - currentRequired) / (nextRequired - currentRequired);


  if (levelIndex >= LEVELS.length - 1) {
    return undefined;
  }





  if (formula && !updated.uniqueMolecules.has(formula)) {
    updated.uniqueMolecules.add(formula);
  }

  if (isFamilySession) {
    updated.familyPlaySessions += 1;
  }

  const newlyEarned: Badge[] = [];
  const newBadges = new Map(updated.badges);

  for (const badge of BADGES) {
    const progress = newBadges.get(badge.id)!;
    if (progress.earned) continue;

    let current = 0;
    let shouldEarn = false;




  updated.badges = newBadges;

}
