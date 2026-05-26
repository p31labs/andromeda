import { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: { transcript: string };
}

interface VoiceButtonProps {
  onCommand: (transcript: string) => void;
}

export function VoiceButton({ onCommand }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('');
      };

      rec.onend = () => {
        setIsListening(false);
        if (transcript) {
          onCommand(transcript);
        }
      };

      rec.onresult = (event) => {
        const text = Array.from(event.results as unknown as Array<{[index: number]: {transcript: string}}>)
          .map((r) => r[0].transcript)
          .join('');
        setTranscript(text);
      };

      rec.onerror = (event) => {
        setError(event.error);
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setError('Voice not supported');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
      {(isListening || transcript) && (
        <div className="mb-2 px-4 py-2 rounded-xl bg-p31-cyan/20 backdrop-blur-sm border border-p31-cyan/30 text-sm max-w-xs text-center">
          {isListening ? <span className="animate-pulse">Listening...</span> : transcript}
        </div>
      )}
      <button
        onClick={toggleListening}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
          isListening ? 'bg-red-500 animate-pulse' : 'bg-p31-cyan hover:scale-110 active:scale-95'
        }`}
        style={{ minHeight: '64px', minWidth: '64px' }}
        title={isListening ? 'Stop listening' : 'Voice command'}
      >
        {isListening ? <MicOff className="w-7 h-7 text-white" /> : <Mic className="w-7 h-7 text-p31-void" />}
      </button>
      {error && <span className="mt-2 text-xs text-red-400">{error}</span>}
    </div>
  );
}
