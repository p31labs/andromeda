import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  calcium: number;
  onAcknowledge: () => void;
}

export function EmergencyPulse({ calcium, onAcknowledge }: Props) {
  const [pulseCount, setPulseCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  
  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Visual pulse counter
  useEffect(() => {
    const pulse = setInterval(() => {
      setPulseCount(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(pulse);
  }, []);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      {/* Pulsing rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-red-500/30"
            style={{
              width: 200 + i * 100,
              height: 200 + i * 100,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      {/* Central emergency indicator */}
      <motion.div
        className="relative z-10 text-center space-y-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Emergency icon */}
        <div className="w-24 h-24 mx-auto rounded-full bg-red-500/20 
                      flex items-center justify-center animate-pulse">
          <span className="text-4xl">🚨</span>
        </div>
        
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-red-500">
          CRITICAL CALCIUM
        </h1>
        
        {/* Current reading */}
        <div className="text-6xl md:text-7xl font-mono text-white">
          {calcium.toFixed(1)}
          <span className="text-2xl text-white/50 ml-2">mg/dL</span>
        </div>
        
        {/* Instructions */}
 <div className="max-w-md mx-auto space-y-3 text-center">
          <p className="text-lg text-white/80">
            Take your emergency calcium NOW
          </p>
          <p className="text-sm text-white/50">
            Emergency protocol active • {formatTime(timeLeft)}
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <button
            onClick={onAcknowledge}
            className="px-6 py-3 rounded-full bg-red-500 hover:bg-red-600 
                     text-white font-semibold transition-all
                     border-2 border-red-500 animate-pulse"
          >
            I took calcium
          </button>
          
          <button
            onClick={() => window.location.href = 'tel:911'}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 
                     text-white font-semibold transition-all
                     border border-white/20"
          >
            Call 911
          </button>
          
          <button
            onClick={() => {
              // Would trigger cage-wide emergency
              console.log('[PHOS] Emergency broadcast to cage');
            }}
            className="px-6 py-3 rounded-full bg-p31-teal/20 hover:bg-p31-teal/30 
                     text-p31-teal font-semibold transition-all
                     border border-p31-teal/30"
          >
            Alert Family
          </button>
        </div>
        
        {/* Pulse count */}
        <div className="text-xs text-white/30 pt-4">
          Emergency pulse {pulseCount}
        </div>
      </motion.div>
      
      {/* Background flash */}
      <motion.div
        className="fixed inset-0 bg-red-500/5 pointer-events-none"
        animate={{
          opacity: [0, 0.3, 0],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
