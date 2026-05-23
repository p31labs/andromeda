/**
 * RestTimer Component v2.0
 * Rest & Recovery Sanctuary - Dark P31 Theme
 * 
 * Features:
 * - Breathing animation ring
 * - Gentle bell sounds
 * - Stretch guide
 * - Progress visualization
 * - Calming gradients
 */

import React, { useState, useEffect, useRef } from 'react';
import { BigButton } from './BigButton';

interface RestTimerProps {
  workDuration?: number;
  onRestStart?: () => void;
  onRestEnd?: () => void;
}

const stretches = [
  { name: 'Finger Spread', emoji: '🖐️', duration: 30 },
  { name: 'Wrist Circles', emoji: '🔄', duration: 30 },
  { name: 'Thumb Stretch', emoji: '👍', duration: 20 },
  { name: 'Finger Taps', emoji: '👆', duration: 20 },
  { name: 'Arm Shake', emoji: '💪', duration: 15 },
  { name: 'Deep Breath', emoji: '🫁', duration: 30 },
];

const playBell = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = 528; // Healing frequency
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 3);
  } catch {}
};

export const RestTimer: React.FC<RestTimerProps> = ({
  workDuration = 20,
  onRestStart,
  onRestEnd,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(workDuration * 60);
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(5 * 60);
  const [showWarning, setShowWarning] = useState(false);
  const [currentStretch, setCurrentStretch] = useState(0);
  const [showStretchGuide, setShowStretchGuide] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out' | 'wait'>('in');
  
  const workProgress = ((workDuration * 60 - timeRemaining) / (workDuration * 60)) * 100;
  const restProgress = ((5 * 60 - restTimeRemaining) / (5 * 60)) * 100;

  // Breathing animation
  useEffect(() => {
    if (!isResting) return;
    
    const breathCycle = async () => {
      setBreathPhase('in');
      await new Promise(r => setTimeout(r, 4000));
      setBreathPhase('hold');
      await new Promise(r => setTimeout(r, 2000));
      setBreathPhase('out');
      await new Promise(r => setTimeout(r, 4000));
      setBreathPhase('wait');
      await new Promise(r => setTimeout(r, 2000));
    };
    
    breathCycle();
    const interval = setInterval(breathCycle, 12000);
    return () => clearInterval(interval);
  }, [isResting]);

  useEffect(() => {
    if (isResting) {
      playBell();
      const interval = setInterval(() => {
        setRestTimeRemaining(prev => {
          if (prev <= 1) {
            setIsResting(false);
            setTimeRemaining(workDuration * 60);
            onRestEnd?.();
            playBell();
            return 5 * 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsResting(true);
            onRestStart?.();
            playBell();
            return 0;
          }
          if (prev === 5 * 60) {
            setShowWarning(true);
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isResting, workDuration, onRestStart, onRestEnd]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBreathScale = () => {
    switch (breathPhase) {
      case 'in': return 1.2;
      case 'hold': return 1.2;
      case 'out': return 1;
      default: return 1;
    }
  };

  const getBreathText = () => {
    switch (breathPhase) {
      case 'in': return 'Breathe In...';
      case 'hold': return 'Hold...';
      case 'out': return 'Breathe Out...';
      default: return 'Wait...';
    }
  };

  if (isResting) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - 200px)',
          background: 'linear-gradient(180deg, #1a1d35 0%, #0f1115 100%)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h1 style={{ fontSize: '36px', color: '#6B8DD6', margin: '0 0 8px 0' }}>
          🌸 Rest Break
        </h1>
        <p style={{ color: '#888', fontSize: '18px', margin: '0 0 32px 0' }}>
          Time to rest your hands and breathe
        </p>

        {/* Breathing Ring */}
        <div
          style={{
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, #5DCAA520 0%, #6B8DD620 100%)`,
            border: '4px solid rgba(93,202,165,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            transform: `scale(${getBreathScale()})`,
            transition: 'transform 4s ease-in-out',
            boxShadow: `0 0 60px rgba(93,202,165,0.2)`,
          }}
        >
          <div
            style={{
              width: '200px',
              height: '200px',
              borderRadius: '50%',
              backgroundColor: '#161920',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(93,202,165,0.2)',
            }}
          >
            <span style={{ fontSize: '56px', fontWeight: 'bold', color: '#5DCAA5' }}>
              {formatTime(restTimeRemaining)}
            </span>
            <span style={{ fontSize: '18px', color: '#6B8DD6', marginTop: '8px' }}>
              {getBreathText()}
            </span>
          </div>
        </div>

        {/* Progress Ring */}
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            height: '12px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '6px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: `${restProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #5DCAA5, #6B8DD6)',
              borderRadius: '6px',
              transition: 'width 1s linear',
            }}
          />
        </div>

        {/* Stretch Guide Toggle */}
        <button
          onClick={() => setShowStretchGuide(!showStretchGuide)}
          style={{
            padding: '16px 32px',
            backgroundColor: showStretchGuide ? 'rgba(93,202,165,0.2)' : 'rgba(255,255,255,0.05)',
            border: showStretchGuide ? '2px solid #5DCAA5' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            color: showStretchGuide ? '#5DCAA5' : '#888',
            cursor: 'pointer',
            fontSize: '18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>🧘</span>
          {showStretchGuide ? 'Hide Stretch Guide' : 'Show Stretch Guide'}
        </button>

        {/* Stretch Guide */}
        {showStretchGuide && (
          <div
            style={{
              backgroundColor: '#161920',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              marginBottom: '24px',
            }}
          >
            <h3 style={{ fontSize: '20px', color: '#D8D6D0', margin: '0 0 16px 0' }}>
              Gentle Stretches for Your Hands
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stretches.map((stretch, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    backgroundColor: currentStretch === i ? 'rgba(93,202,165,0.1)' : 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: currentStretch === i ? '1px solid rgba(93,202,165,0.3)' : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => setCurrentStretch(i)}
                >
                  <span style={{ fontSize: '32px' }}>{stretch.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#D8D6D0', margin: 0, fontWeight: 600 }}>{stretch.name}</p>
                    <p style={{ color: '#666', margin: '4px 0 0 0', fontSize: '14px' }}>{stretch.duration}s</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <BigButton
          onClick={() => {
            setIsResting(false);
            setTimeRemaining(workDuration * 60);
            onRestEnd?.();
          }}
          variant="secondary"
          fullWidth
          style={{ maxWidth: '400px' }}
        >
          End Rest Early
        </BigButton>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: '#161920',
        borderRadius: '20px',
        padding: '24px',
        border: showWarning ? '2px solid #cc6247' : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '22px', color: '#D8D6D0', margin: '0 0 4px 0' }}>⏱️ Work Timer</h3>
          <p style={{ fontSize: '16px', color: showWarning ? '#cc6247' : '#888', margin: 0 }}>
            {showWarning ? '⚠️ Rest break coming up!' : 'Working session in progress'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: showWarning ? '#cc6247' : '#5DCAA5' }}>
            {formatTime(timeRemaining)}
          </div>
          <p style={{ fontSize: '14px', color: '#666', margin: '4px 0 0 0' }}>
            of {workDuration}:00
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: `${workProgress}%`,
            height: '100%',
            background: showWarning 
              ? 'linear-gradient(90deg, #cc6247, #e74c3c)'
              : 'linear-gradient(90deg, #5DCAA5, #6B8DD6)',
            borderRadius: '6px',
            transition: 'width 1s linear',
          }}
        />
      </div>

      <BigButton
        onClick={() => {
          setIsResting(true);
          onRestStart?.();
        }}
        variant="secondary"
        fullWidth
      >
        🌸 Start Rest Now
      </BigButton>

      <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginTop: '16px' }}>
        Voice: Say "rest now" anytime
      </p>
    </div>
  );
};

export default RestTimer;
