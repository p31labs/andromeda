
      if (e.target instanceof HTMLInputElement ||

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;



      const handleFocus = () => {
        skipNav.style.top = '8px';
      };
      const handleBlur = () => {
        skipNav.style.top = '-100%';
      };
      skipNav.addEventListener('focus', handleFocus);
      skipNav.addEventListener('blur', handleBlur);
      document.body.appendChild(skipNav);
      return () => {
        skipNav.removeEventListener('focus', handleFocus);
        skipNav.removeEventListener('blur', handleBlur);
        document.body.removeChild(skipNav);
      };

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;


}
