import { useRef, useEffect } from 'react';
  const swUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (swUpdateInterval.current !== null) {
        clearInterval(swUpdateInterval.current);
        swUpdateInterval.current = null;
      }
    };
  }, []);

        swUpdateInterval.current = setInterval(() => {
