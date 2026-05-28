import { useEffect } from 'react';

export const usePanicEject = (onEject: () => void, isActive: boolean) => {
  useEffect(() => {
    if (!isActive) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      if (touchEndY - touchStartY > 150) {
        onEject();
      }
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      const { acceleration } = event;
      if (!acceleration) return;

      const force = Math.abs(acceleration.x || 0) +
                    Math.abs(acceleration.y || 0) +
                    Math.abs(acceleration.z || 0);

      if (force > 15) {
        onEject();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [onEject, isActive]);
};
