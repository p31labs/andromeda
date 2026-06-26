



      // If current theme doesn't match system preference, find one that does
      if (currentTheme && currentTheme.scheme !== (prefersDark ? 'dark' : 'light')) {
        // Find best matching theme
        const alternatives = Object.values(P31_THEMES).filter(t =>




