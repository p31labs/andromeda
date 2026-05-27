import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { routeIntent } from '../lib/IntentEngine';
import { logIntentRouted } from '../lib/EventLogger';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

/**
 * ── BIOLOGICAL ORB STATE ENGINE ──────────────────────────
 * Maps the four biological states to precise visual and
 * motion properties for the central anchor element.
 *
 * The Orb is the digital heartbeat of the interface — it must
 * physically breathe, glow, and pulse in synchrony with the
 * user's parasympathetic nervous system.
 *
 *   QUANTUM:  Fast mechanical pulse, tight neon shadow, diamond/angular
 *   BRIDGE:   Balanced pulse, indigo glow, soft rounded
 *   SANCTUARY: 6-second vagal breathing, warm amber-rose gradient, diffuse halo
 *   CRISIS:   Dead flat, no motion, no shadow, gray/neutral
 */
function getOrbState(spoons: number, grayRock: boolean, isListening: boolean) {
  // ── CRISIS / GRAY ROCK: absolute zero sensory input ──
  if (grayRock || spoons === 0) {
    return {
      size: 'w-24 h-24',
      shape: 'rounded-full',
      inner: null,
      className: 'bg-gray-800 shadow-none animate-none border-gray-700 cursor-default',
      style: {},
      listeningRing: null,
    };
  }

  // ── SANCTUARY (1-2): parasympathetic breathing, warm halo ──
  if (spoons <= 2) {
    return {
      size: 'w-28 h-28',
      shape: 'rounded-full',
      inner: <div className="w-14 h-14 bg-white/10 rounded-full blur-xl" />,
      className: `bg-gradient-to-tr from-amber-400 to-rose-400 border-white/10 ${
        isListening
          ? 'animate-biomimetic-breath'
          : 'animate-sanctuary-drift'
      } cursor-pointer`,
      style: { 
        boxShadow: '0 0 60px rgba(251,146,60,0.4), 0 0 120px rgba(251,146,60,0.15)' 
      },
      listeningRing: isListening ? (
        <div className="absolute inset-0 rounded-full border-[3px] border-amber-300/60 animate-glow-pulse" />
      ) : null,
    };
  }

  // ── BRIDGE (3): balanced focus, indigo editorial glow ──
  if (spoons === 3) {
    return {
      size: 'w-24 h-24',
      shape: 'rounded-full',
      inner: <div className="w-10 h-10 bg-white/20 rounded-full blur-md" />,
      className: `bg-indigo-400 border-indigo-200/50 ${
        isListening ? 'animate-pulse' : 'animate-breathe-slow'
      } cursor-pointer`,
      style: { 
        boxShadow: '0 0 40px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.1)' 
      },
      listeningRing: isListening ? (
        <div className="absolute inset-0 rounded-full border-2 border-indigo-300/50 animate-ping" />
      ) : null,
    };
  }

  // ── QUANTUM (4-5): high energy, mechanical precision, angular ──
  return {
    size: 'w-24 h-24',
    shape: 'rounded-none rotate-45 overflow-hidden',
    inner: <div className="w-10 h-10 border-2 border-emerald-300/30 rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />,
    className: `bg-emerald-400 border-emerald-300/30 ${
      isListening ? 'animate-quantum-spin' : 'animate-pulse'
    } cursor-pointer`,
    style: { 
      boxShadow: '0 0 50px rgba(52,211,153,0.8), 0 0 100px rgba(52,211,153,0.4)' 
    },
    listeningRing: isListening ? (
      <div className="absolute inset-0 rounded-none border-2 border-emerald-300/50 animate-ping" />
    ) : null,
  };
}

const PHOSOrb: React.FC = () => {
  const { spoons, grayRock, setSurface } = useAtmosphere();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }
      if (finalTranscript.trim()) {
        setTranscript(finalTranscript.trim());
        const target = routeIntent(finalTranscript.trim(), spoons);
        logIntentRouted(finalTranscript.trim(), target, spoons);
        setSurface(target);
        const url = new URL(window.location.href);
        url.searchParams.set('surface', target.toLowerCase());
        window.history.replaceState({}, '', url.toString());
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
      setTimeout(() => setTranscript(''), 3000);
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    setIsListening(true);
    recognition.start();
  }, [setSurface, spoons]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop();
      isListeningRef.current = false;
    }
    setIsListening(false);
  }, []);

  const handleOrbDown = useCallback(() => {
    if (grayRock || spoons === 0) return;
    startListening();
  }, [grayRock, spoons, startListening]);

  const handleOrbUp = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const orbState = getOrbState(spoons, grayRock, isListening);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* ── CSS Injection for biomimetic keyframes ── */}
      <style>{`
        @keyframes biomimetic-breath {
          0%, 100% { transform: scale(0.92); opacity: 0.75; filter: brightness(0.9) saturate(0.8); }
          33% { transform: scale(1.08); opacity: 1; filter: brightness(1.15) saturate(1.1); }
          66% { transform: scale(1.05); opacity: 0.95; filter: brightness(1.05) saturate(1.0); }
        }
        .animate-biomimetic-breath {
          animation: biomimetic-breath 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes sanctuary-drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-sanctuary-drift {
          animation: sanctuary-drift 7s ease-in-out infinite;
        }
        @keyframes quantum-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-quantum-spin {
          animation: quantum-spin 8s linear infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        .animate-glow-pulse {
          animation: glow-pulse 3s ease-in-out infinite;
        }
      `}</style>

      <div
        onMouseDown={handleOrbDown}
        onMouseUp={handleOrbUp}
        onMouseLeave={handleOrbUp}
        onTouchStart={handleOrbDown}
        onTouchEnd={handleOrbUp}
        className={`relative flex items-center justify-center transition-all duration-1000 ${orbState.size} ${orbState.shape} ${orbState.className} ${isListening ? 'brightness-125' : ''}`}
        style={orbState.style}
        title={
          grayRock || spoons === 0
            ? 'System locked. All sensory input suspended.'
            : spoons <= 2
              ? 'Hold to speak — the Sanctuary hears you.'
              : spoons === 3
                ? 'Hold to speak — balanced and listening.'
                : 'Hold to speak — QUANTUM mode active.'
        }
      >
        {/* Inner core visual */}
        {orbState.inner}

        {/* Listening indicator ring */}
        {orbState.listeningRing}
      </div>

      {transcript && (
        <div className="absolute mt-32 text-sm opacity-80 animate-fade-in font-mono text-center max-w-xs">
          &ldquo;{transcript}&rdquo;
        </div>
      )}
    </div>
  );
};

export default PHOSOrb;