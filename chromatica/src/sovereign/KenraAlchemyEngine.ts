/**
 * Kenra Alchemy Engine v1.0
 * Specialized color formulation logic for Kenra Professional
 */

export interface Formula {
  color: string;
  developer: string;
  ratio: string;
  notes: string;
}

export interface HairAnalysis {
  baseLevel: number; // 1-10
  targetLevel: number; // 1-10
  underlyingPigment: string;
  porosity: 'low' | 'average' | 'high';
  grayPercentage: number;
}

export const KenraAlchemyEngine = {
  /**
   * Generates a recommended Kenra formula based on hair analysis
   */
  generateFormula: (analysis: HairAnalysis): Formula => {
    const { baseLevel, targetLevel, underlyingPigment, porosity } = analysis;
    
    let color = "";
    let developer = "";
    let ratio = "1:1";
    let notes = "";

    // Simplified logic for MVP
    if (targetLevel > baseLevel) {
      const lift = targetLevel - baseLevel;
      developer = lift <= 2 ? "20 Volume" : "30 Volume";
      color = `${targetLevel}N + ${targetLevel}WB`;
      notes = `Kenra Permanent. Underlying ${underlyingPigment} detected. Use ${developer} for lift.`;
    } else if (targetLevel === baseLevel) {
      developer = "9 Volume (Demi)";
      color = `${targetLevel}N`;
      notes = "Kenra Demi-Permanent for tone-on-tone or deposit.";
    } else {
      developer = "9 Volume (Demi)";
      color = `${targetLevel}N + ${targetLevel}G`;
      notes = "Going darker. Ensure underlying pigment is filled if skipping levels.";
    }

    if (porosity === 'high') {
      notes += " High porosity: Reduce processing time by 5-10 mins.";
    }

    return { color, developer, ratio, notes };
  },

  /**
   * Provides the underlying pigment for a given level
   */
  getUnderlyingPigment: (level: number): string => {
    const pigments: Record<number, string> = {
      1: "Blue",
      2: "Blue/Violet",
      3: "Violet",
      4: "Red/Violet",
      5: "Red",
      6: "Red/Orange",
      7: "Orange",
      8: "Yellow/Orange",
      9: "Yellow",
      10: "Pale Yellow"
    };
    return pigments[level] || "Unknown";
  }
};