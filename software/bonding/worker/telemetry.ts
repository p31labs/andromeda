

  // Exponential decay based on spoon deficit
  const deficitRatio = (20 - spoonCount) / 20;
  const varianceFactor = Math.exp(-3 * deficitRatio);


