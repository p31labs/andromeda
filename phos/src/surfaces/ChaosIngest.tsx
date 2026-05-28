import React, { useState, useRef, useEffect } from 'react';
import { Mic, Shield } from 'lucide-react';

export const ChaosIngest: React.FC = () => {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files.length) {
        console.log('Intercepted file paste event.');
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className="relative flex flex-col h-full w-full bg-zinc-950 text-zinc-200">
      <textarea
        ref={textAreaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Brain dump. Paste evidence logs. Hold trigger to dictate."
        className="flex-grow w-full bg-transparent resize-none outline-none p-4 text-xl leading-relaxed text-zinc-300 placeholder:text-zinc-700 selection:bg-purple-900/50"
        autoFocus
      />
      <div className="flex items-center gap-2 p-4 text-xs text-zinc-500 font-mono border-t border-zinc-900">
        <Shield size={14} className="text-purple-500" />
        <span>FL TWO-PARTY CONSENT PROTECTED ENVIRONMENT. TRANSCRIPTION PROCESSES LOCALLY.</span>
      </div>
      <button
        onPointerDown={() => setIsRecording(true)}
        onPointerUp={() => setIsRecording(false)}
        onPointerLeave={() => setIsRecording(false)}
        className={`
          absolute bottom-16 right-4 w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-300 select-none touch-manipulation
          ${isRecording ? 'bg-purple-900 text-white scale-110 shadow-[0_0_30px_rgba(147,51,234,0.3)]' : 'bg-zinc-900 text-zinc-400'}
        `}
      >
        <Mic size={24} />
      </button>
    </div>
  );
};
