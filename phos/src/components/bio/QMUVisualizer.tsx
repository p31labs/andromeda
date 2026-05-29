import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useBioStore } from '../stores/bioStore';

export function QMUVisualizer() {
  const { spoons, getQMUState } = useBioStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qmuState = getQMUState();
  
  // Animated background based on bio-state
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let time = 0;
    
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Color based on QMU state
      let hue = 160; // Teal default
      let saturation = spoons * 100;
      let lightness = 50;
      let speed = spoons * 2;
      
      if (qmuState === 'critical') {
        hue = 0; // Red
        saturation = 0; // Grayscale
        lightness = 50;
        speed = 0.1;
      } else if (qmuState === 'low') {
        hue = 45; // Yellow
        saturation = 80;
        lightness = 40;
        speed = 0.5;
      }
      
      // Draw flowing particles
      for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time * speed + i * 0.5) + 1) * canvas.width / 2;
        const y = (Math.cos(time * speed * 0.7 + i * 0.3) + 1) * canvas.height / 2;
        const radius = (Math.sin(time + i) + 2) * 10 * spoons;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue + i * 5}, ${saturation}%, ${lightness}%, ${0.1 + spoons * 0.2})`;
        ctx.fill();
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [spoons, qmuState]);
  
  return (
    <div className="p-4 border-b border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[#6b7280]">QMU Engine</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${
          qmuState === 'normal' ? 'bg-[#5DCAA5]/20 text-[#5DCAA5]' :
          qmuState === 'low' ? 'bg-[#fbbf24]/20 text-[#fbbf24]' :
          'bg-red-500/20 text-red-400'
        }`}>
          {qmuState === 'normal' ? 'Normal' : qmuState === 'low' ? 'Low Energy' : 'CRITICAL'}
        </span>
      </div>
      
      <div className="relative h-32 rounded-xl overflow-hidden bg-[#0a0b0d]">
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <motion.div 
              key={qmuState}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl mb-1"
            >
              {qmuState === 'normal' ? '🟢' : qmuState === 'low' ? '🟡' : '🔴'}
            </motion.div>
            <div className="text-xs text-[#6b7280]">
              {qmuState === 'normal' ? 'Full Theming' : qmuState === 'low' ? 'Reduced Motion' : 'Gray Rock'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-[#6b7280] space-y-1">
        <div className="flex justify-between">
          <span>Motion Factor</span>
          <span className="text-[#e8e8e8]">{Math.round(spoons * 100)}%</span>
        </div>
        <div className="flex justify-between">
          <span>Chroma Level</span>
          <span className="text-[#e8e8e8]">{qmuState === 'critical' ? '0%' : Math.round(spoons * 100) + '%'}</span>
        </div>
      </div>
    </div>
  );
}
