// Copied from culinary-matria, converted from Tailwind to inline styles
import { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

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
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const { isVoiceListening, setVoiceListening, voiceEnabled } = useAppStore();

  useEffect(() => {
    if (!voiceEnabled) return;

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new Ctor();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setVoiceListening(true);
        setError(null);
        setTranscript('');
      };

      rec.onend = () => {
        setVoiceListening(false);
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
        setVoiceListening(false);
      };

      setRecognition(rec);
    }
  }, [voiceEnabled]);

  const toggleListening = () => {
    if (!recognition) {
      setError('Voice not supported');
      return;
    }
    if (isVoiceListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  if (!voiceEnabled) return null;

  return (
    <div style={styles.container}>
      {(isVoiceListening || transcript) && (
        <div style={styles.transcriptBubble}>
          {isVoiceListening ? <span style={styles.pulse}>Listening...</span> : transcript}
        </div>
      )}
      <button
        onClick={toggleListening}
        style={{
          ...styles.button,
          backgroundColor: isVoiceListening ? '#ef4444' : '#5DCAA5',
          animation: isVoiceListening ? 'pulse 1.5s infinite' : undefined,
        }}
        title={isVoiceListening ? 'Stop listening' : 'Voice command'}
      >
        {isVoiceListening ? <MicOff style={styles.icon} /> : <Mic style={{ ...styles.icon, color: '#0f1115' }} />}
      </button>
      {error && <span style={styles.error}>{error}</span>}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '96px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 40,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  transcriptBubble: {
    marginBottom: '8px',
    padding: '8px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(93, 202, 165, 0.2)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(93, 202, 165, 0.3)',
    fontSize: '14px',
    maxWidth: '250px',
    textAlign: 'center',
  },
  pulse: {
    animation: 'pulse 1.5s infinite',
  },
  button: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minHeight: '64px',
    minWidth: '64px',
  },
  icon: {
    width: '28px',
    height: '28px',
    color: 'white',
  },
  error: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#ef4444',
  },
};

export default VoiceButton;
