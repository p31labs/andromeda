import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateVoiceResponse, quickConscienceCheck, useVoiceSynthesis } from '../services/ollama';
import { useCompanionStore } from '../stores/companionStore';

interface Props {
  isAwake: boolean;
  calcium: number;
  spoons: number;
  qmuState: 'normal' | 'low' | 'critical';
  pendingAction: { type: string; message: string; priority: string } | null;
  onAcknowledge: () => void;
}

export function CompanionVoice({ 
  isAwake, 
  calcium, 
  spoons, 
  qmuState,
  pendingAction,
  onAcknowledge 
}: Props) {
  const [currentLine, setCurrentLine] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  
  const { addContext } = useCompanionStore();
  const { speak, stop } = useVoiceSynthesis();
  
  // Check companion API connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const SIMPLEX_URL = import.meta.env.VITE_SIMPLEX_URL || 'https://simplex-worker.trimtab-signal.workers.dev';
        const response = await fetch(`${SIMPLEX_URL}/api/health`);
        setOllamaConnected(response.ok);
      } catch {
        setOllamaConnected(false);
      }
    };
    checkConnection();
  }, []);
  
  // Type out message letter by letter with optional voice
  const typeMessage = useCallback(async (message: string, priority: 'normal' | 'urgent' | 'critical' = 'normal') => {
    setIsTyping(true);
    setCurrentLine('');
    
    // Speak the message
    speak(message, priority);
    
    // Type it out visually
    let i = 0;
    const interval = setInterval(() => {
      if (i < message.length) {
        setCurrentLine(prev => prev + message[i]);
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setHistory(prev => [...prev.slice(-4), message]);
        onAcknowledge();
      }
    }, qmuState === 'critical' ? 30 : 50);
    
    return () => clearInterval(interval);
  }, [qmuState, onAcknowledge, speak]);
  
  // Stream from Ollama
  const streamFromOllama = useCallback(async (userMessage: string) => {
    setIsStreaming(true);
    setIsTyping(true);
    setCurrentLine('');
    
    const bioState = { calcium, spoons, hrv: 62 }; // TODO: real HRV
    
    try {
      let fullResponse = '';
      
      for await (const chunk of generateVoiceResponse(userMessage, bioState)) {
        fullResponse += chunk;
        setCurrentLine(fullResponse);
      }
      
      // Speak the full response
      speak(fullResponse, qmuState === 'critical' ? 'critical' : 'normal');
      
      setHistory(prev => [...prev.slice(-4), fullResponse]);
      addContext(fullResponse);
    } catch (error) {
      console.error('[PHOS] Stream error:', error);
      const fallback = qmuState === 'critical' 
        ? "Critical calcium. Take emergency dose now."
        : "I'm here.";
      setCurrentLine(fallback);
      speak(fallback, 'critical');
    } finally {
      setIsStreaming(false);
      setIsTyping(false);
      onAcknowledge();
    }
  }, [calcium, spoons, qmuState, addContext, onAcknowledge, speak]);
  
  // Handle pending actions (from bio-state changes)
  useEffect(() => {
    if (pendingAction && !isTyping && !isStreaming) {
      if (ollamaConnected && pendingAction.type !== 'emergency') {
        // Use Ollama for non-emergency
        streamFromOllama(pendingAction.message);
      } else {
        // Use direct message for emergency or no Ollama
        typeMessage(pendingAction.message, pendingAction.priority as any);
      }
    }
  }, [pendingAction, isTyping, isStreaming, ollamaConnected, typeMessage, streamFromOllama]);
  
  // Greeting on wake
  useEffect(() => {
    if (isAwake && !currentLine && !isTyping && !isStreaming) {
      const greet = async () => {
        const greeting = await quickConscienceCheck({ calcium, spoons, hrv: 62 });
        typeMessage(greeting, qmuState === 'critical' ? 'critical' : 'normal');
      };
      greet();
    }
  }, [isAwake]); // Only on wake
  
  // Periodic check-ins
  useEffect(() => {
    if (!isAwake || isTyping || isStreaming) return;
    
    const interval = setInterval(async () => {
      if (Math.random() > 0.7) {
        const check = await quickConscienceCheck({ calcium, spoons, hrv: 62 });
        if (check) {
          typeMessage(check, 'normal');
        }
      }
    }, 25000 + Math.random() * 15000); // Every 25-40 seconds
    
    return () => clearInterval(interval);
  }, [isAwake, isTyping, isStreaming, calcium, spoons, typeMessage]);
  
  // Stop speech when component unmounts
  useEffect(() => {
    return () => stop();
  }, [stop]);
  
  if (!isAwake) {
    return (
      <div className="text-center text-white/20 text-sm">
        <span className="animate-pulse">●</span>
        {!ollamaConnected && (
          <span className="ml-2 text-xs">(Ollama offline)</span>
        )}
      </div>
    );
  }
  
  return (
    <div className="w-full space-y-4">
      {/* Current voice line */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLine + isStreaming}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <p className={`text-lg md:text-xl leading-relaxed font-light min-h-[3rem]
                       ${qmuState === 'critical' ? 'text-red-300' : 'text-white/90'}`}>
            {currentLine || (isStreaming ? '...' : '')}
            {isTyping && !isStreaming && (
              <span className="inline-block w-0.5 h-5 bg-p31-teal ml-1 animate-pulse" />
            )}
          </p>
        </motion.div>
      </AnimatePresence>
      
      {/* Recent history - fades out */}
      {history.length > 1 && (
        <div className="space-y-1 text-center">
          {history.slice(-3, -1).map((line, i) => (
            <p 
              key={i} 
              className="text-sm text-white/20 font-light"
            >
              {line}
            </p>
          ))}
        </div>
      )}
      
      {/* Voice input mode indicator */}
      {ollamaConnected && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-p31-teal animate-pulse" />
          <span className="text-p31-teal/60">
            {isStreaming ? 'Thinking...' : 'Listening'}
          </span>
        </div>
      )}
      
      {/* Quick responses - tap to speak */}
      {!isTyping && !isStreaming && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap justify-center gap-2 mt-4"
        >
          {qmuState === 'critical' ? (
            <>
              <ResponseChip 
                text="I took calcium" 
                onClick={() => streamFromOllama("I took my emergency calcium.")}
              />
              <ResponseChip 
                text="Call for help" 
                onClick={() => window.location.href = 'tel:911'}
                urgent
              />
              <ResponseChip 
                text="Need family" 
                onClick={() => streamFromOllama("I need to reach my family.")}
              />
            </>
          ) : qmuState === 'low' ? (
            <>
              <ResponseChip 
                text="Just resting" 
                onClick={() => streamFromOllama("I'm just resting today.")}
              />
              <ResponseChip 
                text="Hard day" 
                onClick={() => streamFromOllama("It's been a hard day.")}
              />
              <ResponseChip 
                text="Doing okay" 
                onClick={() => streamFromOllama("I'm doing okay.")}
              />
              <ResponseChip 
                text="Tell me something" 
                onClick={() => streamFromOllama("Tell me something helpful.")}
              />
            </>
          ) : (
            <>
              <ResponseChip 
                text="How am I?" 
                onClick={() => streamFromOllama("How am I doing?")}
              />
              <ResponseChip 
                text="Check family" 
                onClick={() => streamFromOllama("How's my family cage?")}
              />
              <ResponseChip 
                text="Need encouragement" 
                onClick={() => streamFromOllama("I need some encouragement.")}
              />
              <ResponseChip 
                text="Calcium check" 
                onClick={() => streamFromOllama("What's my calcium status?")}
              />
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

function ResponseChip({ 
  text, 
  onClick, 
  urgent = false 
}: { 
  text: string; 
  onClick: () => void;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs transition-all
                ${urgent 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30' 
                  : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 hover:border-white/20'
                }`}
    >
      {text}
    </button>
  );
}
