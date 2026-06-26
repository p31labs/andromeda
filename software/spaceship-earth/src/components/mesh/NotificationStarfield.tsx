import { useMemo, useRef, useEffect } from 'react';
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

