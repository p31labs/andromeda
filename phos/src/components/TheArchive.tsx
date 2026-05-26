import React, { useState, useRef, useEffect } from 'react';
import { useAtmosphere } from './AtmosphereProvider';

interface ChatMessage {
  role: 'user' | 'archive';
  text: string;
}

const MOCK_RESPONSES: string[] = [
  'Accessing local embeddings. The document states that the calcium cage is stable. Cognition is externalized. All systems nominal.',
  'Querying sovereign knowledge base. P31 Labs incorporated April 3, 2026. EIN 42-1888158. Status: active.',
  'Searching local archive. Node Zero telemetry contract locked. ESP32-S3 firmware ready for flash.',
];

const TheArchive: React.FC = () => {
  const { spoons } = useAtmosphere();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (spoons <= 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-fade-in"
        style={{ backgroundColor: '#001122', color: '#00e5ff' }}
      >
        <div className="max-w-md">
          <div className="mb-6 text-4xl font-thin tracking-widest uppercase opacity-30">~</div>
          <p className="text-lg font-mono leading-relaxed opacity-80">
            Deep query mode requires higher cognitive energy.<br />
            Rest now, or use the Compass if you are lost.
          </p>
        </div>
      </div>
    );
  }

  const handleQuery = async () => {
    const query = input.trim();
    if (!query || processing) return;

    setMessages((prev) => [...prev, { role: 'user', text: query }]);
    setInput('');
    setProcessing(true);

    await new Promise((r) => setTimeout(r, 1500));

    const idx = Math.floor(Math.random() * MOCK_RESPONSES.length);
    setMessages((prev) => [...prev, { role: 'archive', text: MOCK_RESPONSES[idx] }]);
    setProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const userStyle = {
    background: '#003355',
    border: '1px solid #00e5ff33',
    color: '#cce0ff',
    borderRadius: '12px 12px 4px 12px',
  };

  const archiveStyle = {
    background: '#001a33',
    border: '1px solid #39ff1433',
    color: '#b0ffb0',
    borderRadius: '12px 12px 12px 4px',
  };

  const processingStyle = {
    background: '#001a33',
    border: '1px solid #39ff1433',
    borderRadius: '12px 12px 12px 4px',
    color: '#b0ffb0',
    opacity: 0.6,
  };

  return (
    <div className="flex flex-col w-full min-h-screen animate-fade-in"
      style={{ backgroundColor: '#001122', color: '#00e5ff' }}
    >
      <div className="text-center py-6 border-b" style={{ borderColor: '#00e5ff22' }}>
        <h1 className="text-xl font-light tracking-wide" style={{ color: '#39ff14' }}>THE_ARCHIVE</h1>
        <p className="text-xs font-mono mt-1 opacity-40">Sovereign Knowledge Base</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-16 opacity-50">
            <p className="text-sm font-mono">Ask anything about the documents in your local archive.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className="max-w-4/5 px-4 py-3 text-sm font-mono leading-relaxed"
              style={msg.role === 'user' ? userStyle : archiveStyle}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {processing && (
          <div className="flex justify-start">
            <div className="px-4 py-3 text-sm font-mono" style={processingStyle}>
              Processing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t px-4 py-4" style={{ borderColor: '#00e5ff22' }}>
        <div className="flex gap-3 max-w-lg mx-auto w-full">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Query your archive..."
            className="flex-1 px-4 py-3 text-sm font-mono outline-none transition-all"
            style={{
              backgroundColor: '#002244',
              border: '1px solid #00e5ff33',
              color: '#cce0ff',
            }}
            disabled={processing}
          />
          <button
            onClick={handleQuery}
            disabled={processing || !input.trim()}
            className="px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all"
            style={{
              backgroundColor: '#003355',
              color: processing || !input.trim() ? '#00e5ff55' : '#00e5ff',
              border: '1px solid #00e5ff44',
            }}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
};

export default TheArchive;
