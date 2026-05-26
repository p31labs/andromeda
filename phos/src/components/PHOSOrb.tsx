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

const PHOSOrb: React.FC = () => {
  const { spoons, grayRock, setSurface, preset } = useAtmosphere();
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

  const getOrbState = () => {
    if (grayRock || spoons === 0) {
      return {
        className: 'bg-gray-800 shadow-none animate-none border-gray-700',
        style: {},
      };
    }
    if (spoons <= 2) {
      return {
        className: 'bg-gradient-to-tr from-amber-400 to-rose-400 animate-breathe-slow border-white/10',
        style: { boxShadow: '0 0 60px rgba(251,146,60,0.3)' },
      };
    }
    if (spoons === 3) {
      return {
        className: 'bg-blue-400 animate-pulse border-blue-200/50',
        style: { boxShadow: '0 0 40px rgba(96,165,250,0.4)' },
      };
    }
    return {
      className: 'animate-pulse',
      style: {
        backgroundColor: preset.palette.primary,
        borderColor: preset.palette.primary,
        boxShadow: `0 0 50px ${preset.palette.primary}88`,
      },
    };
  };

  const orbState = getOrbState();

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        onMouseDown={handleOrbDown}
        onMouseUp={handleOrbUp}
        onMouseLeave={handleOrbUp}
        onTouchStart={handleOrbDown}
        onTouchEnd={handleOrbUp}
        className={`relative flex items-center justify-center w-24 h-24 rounded-full border cursor-pointer transition-all duration-1000 ${orbState.className} ${isListening ? 'scale-110 brightness-150' : ''}`}
        style={orbState.style}
        title={grayRock || spoons === 0 ? 'System locked.' : 'Hold to speak intent'}
      >
        {isListening && (
          <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-ping" />
        )}
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
