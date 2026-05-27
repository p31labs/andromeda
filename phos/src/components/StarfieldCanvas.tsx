import React, { useRef, useEffect, useCallback } from 'react';
import { useAtmosphere } from './AtmosphereProvider';

/**
 * Persistent Starfield background.
 *
 * Spoon-aware aesthetics:
 * - spoons >= 4 (Quantum): Full neon starfield, sharp and fast
 * - spoons === 3 (Bridge): Moderate starfield
 * - spoons === 1-2 (Sanctuary): Very dim, slow, warm — stars barely visible
 * - spoons === 0 (Gray Rock): Void — no stars, no animation
 */
const StarfieldCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const { preset, grayRock, spoons } = useAtmosphere();

  const particleCount = preset.motion.particleCount;
  const speed = preset.motion.speed;
  const presetType = preset.starfield;
  const primaryColor = preset.palette.primary;

  // Spoon-based visual dimming
  // spoons 4-5: full brightness (1.0)
  // spoons 0.5-0.75
  // spoons 0: void (handled by grayRock)
  const spoonOpacity =
    grayRock ? 0 :
    spoons <= 1 ? 0.08 :
    spoons === 2 ? 0.25 :
    spoons === 3 ? 0.6 :
    1.0;

  interface Star {
    x: number;
    y: number;
    size: number;
    opacity: number;
    twinkleSpeed: number;
    twinklePhase: number;
  }

  const initStars = useCallback((count: number) => {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 2 + 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Re-init when particleCount or presetType changes
  useEffect(() => {
    if (grayRock || spoons === 0) {
      initStars(0);
      return;
    }
    // Reduce particle count at low spoons
    const multiplier =
      spoons <= 1 ? 0.1 :
      spoons === 2 ? 0.3 :
      spoons === 3 ? 0.7 : 1.0;
    const effectiveCount = presetType === 'void' ? 0 : Math.floor(particleCount * multiplier);
    initStars(effectiveCount);
  }, [particleCount, presetType, grayRock, spoons, initStars]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (presetType !== 'void' && starsRef.current.length > 0) {
        const width = canvas.width;
        const height = canvas.height;
        const timeDelta = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
        lastTimeRef.current = time;

        // Slow down speed at low spoons
        const effectiveSpeed = speed * (spoons <= 1 ? 0.2 : spoons === 2 ? 0.4 : spoons === 3 ? 0.7 : 1.0);

        const stars = starsRef.current;

        for (let i = 0; i < stars.length; i++) {
          const star = stars[i];

          star.y += timeDelta * effectiveSpeed * 0.02;
          star.x += Math.sin(time * 0.001 * star.twinkleSpeed) * timeDelta * effectiveSpeed * 0.005;

          if (star.y > 1) star.y = -1;
          if (star.y < -1) star.y = 1;
          if (star.x > 1) star.x = -1;
          if (star.x < -1) star.x = 1;

          const twinkle = Math.sin(time * 0.002 * star.twinkleSpeed + star.twinklePhase);
          const alpha = star.opacity * (0.5 + 0.5 * twinkle) * spoonOpacity;

          const screenX = (star.x + 1) * width * 0.5;
          const screenY = (star.y + 1) * height * 0.5;

      ctx.beginPath();
          ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);

          // Sanctuary state: warm amber stars instead of cold neon
          const isWarm = spoons <= 2 && !grayRock;
          const starColor = isWarm
            ? `rgba(251, 191, 120, ${alpha})`
            : primaryColor
              ? `${primaryColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`
              : `rgba(255, 255, 255, ${alpha})`;
          ctx.fillStyle = starColor;
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [presetType, primaryColor, spoonOpacity, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
};

export default StarfieldCanvas;
