
      const closest = CONSONANT_RATIOS.reduce((prev, curr) =>
          (Math.abs(curr.ratio - ratio) < Math.abs(prev.ratio - ratio) ? curr : prev));


        const closest = CONSONANT_RATIOS.reduce((prev, curr) =>
