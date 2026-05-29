import { useState, useEffect, useCallback } from 'react';
import { VoiceOrb } from './components/VoiceOrb';
import { useBioStore } from './stores/bioStore';
import { useCompanionStore } from './stores/companionStore';
import { CompanionVoice } from './components/CompanionVoice';
import { FamilyLink } from './components/FamilyLink';
import { EmergencyPulse } from './components/EmergencyPulse';
import { QuickActions } from './components/QuickActions';
import './App.css';

function App() {
  const [isAwake, setIsAwake] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const { calcium, spoons, getQMUState } = useBioStore();
  const { 
    lastCheckIn, 
    pendingAction,
    acknowledge,
    queueAction,
    clearAction 
  } = useCompanionStore();
  
  const qmuState = getQMUState();
  const isGrayRock = qmuState === 'critical';
  const isLow = qmuState === 'low';
  
  // Wake on interaction
  const wake = useCallback(() => {
    if (!isAwake) {
      setIsAwake(true);
      // Play subtle activation sound
      const audio = new Audio();
      audio.volume = 0.3;
    }
  }, [isAwake]);
  
  // Emergency: Auto-activate on critical calcium
  useEffect(() => {
    if (isGrayRock && !isAwake) {
      setIsAwake(true);
      queueAction({
        type: 'emergency',
        message: 'Calcium critical. I am here. You are not alone.',
        priority: 'critical'
      });
    }
  }, [isGrayRock, isAwake, queueAction]);
  
  // Gentle check-ins based on bio-state
  useEffect(() => {
    const now = Date.now();
    const minutesSinceCheckIn = (now - lastCheckIn) / 60000;
    
    // Check in every 15 minutes normally, every 5 if low spoons
    const checkInInterval = spoons < 0.3 ? 5 : 15;
    
    if (minutesSinceCheckIn > checkInInterval && isAwake) {
      if (calcium < 8) {
        queueAction({
          type: 'whisper',
          message: `Your calcium is ${calcium.toFixed(1)}. Consider your emergency kit.`,
          priority: 'normal'
        });
      } else if (spoons < 0.3) {
        queueAction({
          type: 'whisper',
          message: 'Spoons are low. What can we set down?',
          priority: 'normal'
        });
      }
    }
  }, [calcium, spoons, lastCheckIn, isAwake, queueAction]);

  // Gray Rock: Full screen emergency mode
  if (isGrayRock && pendingAction?.type === 'emergency') {
    return (
      <EmergencyPulse 
        calcium={calcium}
        onAcknowledge={() => {
          acknowledge();
          clearAction();
        }}
      />
    );
  }

  return (
    <div 
      className={`min-h-screen flex flex-col items-center justify-center
                  transition-colors duration-1000
                  ${isGrayRock ? 'bg-black' : 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'}
                  ${isLow ? 'animate-pulse-slow' : ''}`}
      onClick={wake}
      onTouchStart={wake}
    >
      {/* Ambient background pulse based on HRV/bio-state */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 50% 50%, 
              ${isGrayRock ? '#ef4444' : isLow ? '#fbbf24' : '#5DCAA5'} 0%, 
              transparent 70%)`,
            animation: `breathe ${isLow ? '3s' : '6s'} ease-in-out infinite`
          }}
        />
      </div>

      {/* Main Voice Interface */}
      <main className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center gap-8">
        
        {/* Status whisper - top */}
        <div className="h-8 text-center">
          {isAwake && (
            <span className="text-xs tracking-widest uppercase text-white/40 animate-fade-in">
              {isGrayRock ? 'Emergency Active' : isLow ? 'Gentle Mode' : 'Present'}
            </span>
          )}
        </div>

        {/* The Voice Orb - Centerpiece */}
        <VoiceOrb 
          isListening={isAwake}
          isGrayRock={isGrayRock}
          isLow={isLow}
          onClick={() => setIsAwake(!isAwake)}
        />

        {/* Companion Text - Conscience voice */}
        <div className="w-full min-h-[120px] text-center">
          <CompanionVoice 
            isAwake={isAwake}
            calcium={calcium}
            spoons={spoons}
            qmuState={qmuState}
            pendingAction={pendingAction}
            onAcknowledge={acknowledge}
          />
        </div>

        {/* Quick Actions - Minimal */}
        {isAwake && (
          <div className="flex items-center gap-4 animate-fade-in">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFamily(!showFamily);
              }}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 
                       text-white/60 hover:text-white text-sm transition-all
                       border border-white/10 hover:border-white/20"
            >
              {showFamily ? 'Hide Family' : 'Family'}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                queueAction({
                  type: 'whisper',
                  message: 'Noted. I will remember this.',
                  priority: 'normal'
                });
              }}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 
                       text-white/60 hover:text-white text-sm transition-all
                       border border-white/10 hover:border-white/20"
            >
              Note
            </button>
            
            {isGrayRock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Emergency: Contact cage
                  window.location.href = 'tel:+1'; // Would be actual emergency contact
                }}
                className="px-4 py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 
                         text-red-400 text-sm transition-all animate-pulse
                         border border-red-500/30"
              >
                🚨 Help
              </button>
            )}
          </div>
        )}

        {/* Family Cage Link */}
        {showFamily && (
          <FamilyLink 
            onSelect={(member) => {
              queueAction({
                type: 'whisper',
                message: `Reaching out to ${member}...`,
                priority: 'normal'
              });
              setShowFamily(false);
            }}
          />
        )}

        {/* Bio State - Whispered numbers */}
        <div className="fixed bottom-8 left-0 right-0 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-white/30">
            <span className={`transition-colors ${calcium < 8 ? 'text-red-400' : ''}`}>
              Ca: {calcium.toFixed(1)}
            </span>
            <span className={`transition-colors ${spoons < 0.3 ? 'text-yellow-400' : ''}`}>
              ⚡: {Math.round(spoons * 100)}%
            </span>
            <span className="text-white/20">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </main>

      {/* Voice recognition status */}
      {isAwake && (
        <div className="fixed top-4 right-4 flex items-center gap-2 text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-p31-teal animate-pulse" />
          <span>Listening</span>
        </div>
      )}

      {/* Quick Actions Dock */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <QuickActions />
      </div>
    </div>
  );
}

export default App;
