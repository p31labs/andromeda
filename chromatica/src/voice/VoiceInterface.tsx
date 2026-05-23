/**
 * Chromatica Voice Interface
 * 19 voice commands for creative work (arthritis-optimized)
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

// Audio feedback frequencies
const FREQUENCIES = {
  CREATE: 440,      // A4 - new
  SAVE: 523,        // C5 - success
  COLOR: 349,       // F4 - color
  OPEN: 330,        // E4 - open
  DUPLICATE: 294,   // D4 - copy
  DELETE: 200,      // Low - warning
  REST: 262,        // C4 - gentle
  HELP: 392,        // G4 - help
  TEXT: 466,        // Bb4 - text
  CONTRAST: 311,    // Eb4 - dark
  EXPORT: 277,      // Db4 - send
  SHARE: 370,       // Fs4 - share
  COLOR_NAME: 415,  // Ab4 - identify
  UNDO: 220,        // A3 - reverse
  REDO: 880,        // A5 - forward
  FULLSCREEN: 185,  // Fs3 - expand
  ZOOM_IN: 554,     // Cs5 - up
  ZOOM_OUT: 138,    // C3 - down
  CLOSE: 150        // Low - exit
};

export interface VoiceCommand {
  phrases: string[];
  action: string;
  requiresConfirmation: boolean;
  frequency: number;
  category: 'creative' | 'system' | 'health';
}

export const CHROMATICA_COMMANDS: VoiceCommand[] = [
  {
    phrases: ['create new', 'new project', 'start new'],
    action: 'CREATE_PROJECT',
    requiresConfirmation: false,
    frequency: FREQUENCIES.CREATE,
    category: 'creative'
  },
  {
    phrases: ['add color', 'pick color', 'new color'],
    action: 'OPEN_COLOR_PICKER',
    requiresConfirmation: false,
    frequency: FREQUENCIES.COLOR,
    category: 'creative'
  },
  {
    phrases: ['save project', 'save work', 'save now'],
    action: 'SAVE_PROJECT',
    requiresConfirmation: false,
    frequency: FREQUENCIES.SAVE,
    category: 'system'
  },
  {
    phrases: ['open recent', 'recent projects', 'show recent'],
    action: 'SHOW_RECENT',
    requiresConfirmation: false,
    frequency: FREQUENCIES.OPEN,
    category: 'system'
  },
  {
    phrases: ['duplicate', 'copy this', 'make copy'],
    action: 'DUPLICATE_PROJECT',
    requiresConfirmation: true,
    frequency: FREQUENCIES.DUPLICATE,
    category: 'creative'
  },
  {
    phrases: ['delete this', 'remove this', 'delete project'],
    action: 'DELETE_PROJECT',
    requiresConfirmation: true,
    frequency: FREQUENCIES.DELETE,
    category: 'system'
  },
  {
    phrases: ['rest now', 'take break', 'start rest'],
    action: 'START_REST',
    requiresConfirmation: false,
    frequency: FREQUENCIES.REST,
    category: 'health'
  },
  {
    phrases: ['voice help', 'help me', 'what commands'],
    action: 'SHOW_HELP',
    requiresConfirmation: false,
    frequency: FREQUENCIES.HELP,
    category: 'system'
  },
  {
    phrases: ['bigger text', 'increase text', 'larger text'],
    action: 'INCREASE_TEXT',
    requiresConfirmation: false,
    frequency: FREQUENCIES.TEXT,
    category: 'system'
  },
  {
    phrases: ['high contrast', 'dark mode', 'contrast mode'],
    action: 'TOGGLE_CONTRAST',
    requiresConfirmation: false,
    frequency: FREQUENCIES.CONTRAST,
    category: 'system'
  },
  {
    phrases: ['export png', 'save as image', 'download image'],
    action: 'EXPORT_PNG',
    requiresConfirmation: false,
    frequency: FREQUENCIES.EXPORT,
    category: 'creative'
  },
  {
    phrases: ['share project', 'send project', 'get link'],
    action: 'SHARE_PROJECT',
    requiresConfirmation: false,
    frequency: FREQUENCIES.SHARE,
    category: 'system'
  },
  {
    phrases: ['what color', 'current color', 'say color'],
    action: 'READ_COLOR',
    requiresConfirmation: false,
    frequency: FREQUENCIES.COLOR_NAME,
    category: 'creative'
  },
  {
    phrases: ['undo', 'go back', 'reverse'],
    action: 'UNDO',
    requiresConfirmation: false,
    frequency: FREQUENCIES.UNDO,
    category: 'system'
  },
  {
    phrases: ['redo', 'go forward', 'restore'],
    action: 'REDO',
    requiresConfirmation: false,
    frequency: FREQUENCIES.REDO,
    category: 'system'
  },
  {
    phrases: ['fullscreen', 'full screen', 'expand'],
    action: 'TOGGLE_FULLSCREEN',
    requiresConfirmation: false,
    frequency: FREQUENCIES.FULLSCREEN,
    category: 'system'
  },
  {
    phrases: ['zoom in', 'closer', 'enlarge'],
    action: 'ZOOM_IN',
    requiresConfirmation: false,
    frequency: FREQUENCIES.ZOOM_IN,
    category: 'creative'
  },
  {
    phrases: ['zoom out', 'farther', 'shrink'],
    action: 'ZOOM_OUT',
    requiresConfirmation: false,
    frequency: FREQUENCIES.ZOOM_OUT,
    category: 'creative'
  },
  {
    phrases: ['close app', 'exit', 'quit'],
    action: 'CLOSE_APP',
    requiresConfirmation: true,
    frequency: FREQUENCIES.CLOSE,
    category: 'system'
  }
];

export function useChromaticaVoice(
  handlers: Partial<Record<string, () => void>>
) {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTone = useCallback((frequency: number, duration: number = 200) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = frequency;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  }, []);

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // Slower for clarity
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Voice recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
      
      setLastCommand(transcript);
      
      // Find matching command
      for (const cmd of CHROMATICA_COMMANDS) {
        for (const phrase of cmd.phrases) {
          if (transcript.includes(phrase)) {
            playTone(cmd.frequency);
            
            if (cmd.requiresConfirmation) {
              speak(`Confirm ${phrase}?`);
              // Would implement confirmation logic here
            } else {
              handlers[cmd.action]?.();
            }
            return;
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [handlers, playTone, speak]);

  const startListening = useCallback(() => {
    recognitionRef.current?.start();
    setIsListening(true);
    playTone(FREQUENCIES.SAVE, 100);
    speak('Voice active. Say "voice help" for commands.');
  }, [playTone, speak]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    isListening,
    lastCommand,
    error,
    startListening,
    stopListening,
    speak,
    commands: CHROMATICA_COMMANDS
  };
}

// VoiceInterface Component for React usage
interface VoiceInterfaceProps {
  onCommand: (command: string) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onCommand }) => {
  const { isListening, lastCommand, error, startListening, stopListening } = useChromaticaVoice({});

  useEffect(() => {
    if (lastCommand) {
      onCommand(lastCommand);
    }
  }, [lastCommand, onCommand]);

  if (error) {
    return null; // Voice not supported, render nothing
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={isListening ? stopListening : startListening}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: isListening ? '#ef4444' : '#22c55e',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.2s ease',
        }}
        aria-label={isListening ? 'Stop voice commands' : 'Start voice commands'}
      >
        {isListening ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default useChromaticaVoice;
