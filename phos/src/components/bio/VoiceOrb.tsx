import { useRef, useEffect } from 'react';

interface Props {
  isListening: boolean;
  isGrayRock: boolean;
  isLow: boolean;
  onClick: () => void;
}

export function VoiceOrb({ isListening, isGrayRock, isLow, onClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let time = 0;
    const particles: Array<{
      angle: number;
      radius: number;
      speed: number;
      size: number;
      opacity: number;
    }> = [];
    
    // Initialize particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        angle: (i / 60) * Math.PI * 2,
        radius: 80 + Math.random() * 40,
        speed: 0.002 + Math.random() * 0.003,
        size: 2 + Math.random() * 3,
        opacity: 0.3 + Math.random() * 0.4
      });
    }
    
    const animate = () => {
      time += 0.016;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Base orb
      const baseRadius = isListening ? 60 : 40;
      const pulse = isListening ? Math.sin(time * 3) * 5 : 0;
      
      // Outer glow
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, baseRadius + 40 + pulse
      );
      
      const color = isGrayRock 
        ? '239, 68, 68'  // Red
        : isLow 
          ? '251, 191, 36' // Yellow
          : '93, 202, 165'; // Teal
      
      gradient.addColorStop(0, `rgba(${color}, 0.4)`);
      gradient.addColorStop(0.5, `rgba(${color}, 0.1)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, 0.3)`;
      ctx.fill();
      
      // Inner core
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${color}, 0.6)`;
      ctx.fill();
      
      // Particles ring
      if (isListening) {
        particles.forEach((p, i) => {
          p.angle += p.speed;
          const x = centerX + Math.cos(p.angle + time * 0.5) * p.radius;
          const y = centerY + Math.sin(p.angle + time * 0.5) * p.radius * 0.6;
          
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color}, ${p.opacity * (0.5 + Math.sin(time * 2 + i) * 0.5)})`;
          ctx.fill();
        });
        
        // Voice wave visualization
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color}, 0.5)`;
        ctx.lineWidth = 2;
        
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
          const waveRadius = baseRadius + 20 + Math.sin(angle * 8 + time * 5) * 10;
          const x = centerX + Math.cos(angle) * waveRadius;
          const y = centerY + Math.sin(angle) * waveRadius;
          
          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isListening, isGrayRock, isLow]);
  
  return (
    <div 
      className="relative cursor-pointer group"
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="w-64 h-64 md:w-80 md:h-80 transition-transform duration-500 
                   group-hover:scale-105 active:scale-95"
      />
      
      {/* Touch indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {!isListening && (
          <span className="text-white/30 text-sm tracking-widest uppercase animate-pulse">
            Tap to wake
          </span>
        )}
      </div>
      
      {/* Ripple effect on click */}
      <div className="absolute inset-0 rounded-full bg-white/5 animate-ping 
                      opacity-0 group-active:opacity-100 pointer-events-none" />
    </div>
  );
}
