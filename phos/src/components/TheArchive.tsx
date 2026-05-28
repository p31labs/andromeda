import React, { useState, useRef, useEffect } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { embedText } from '../lib/Embedder';
import { rankSearchResults, formatContext, buildSystemPrompt, isValidEmbedding } from '../lib/VectorMath';
import { getAllEmbeddedRows } from '../lib/ChaosVault';
interface ChatMessage {
  role: 'user' | 'archive' | 'error';
  text: string;
  contextCount?: number;
}

const LITELLM_CHAT_URL = 'http://localhost:4000/v1/chat/completions';

// cosineSimilarity removed — use rankSearchResults from ../lib/VectorMath

const TheArchive: React.FC = () => {
  const { spoons, grayRock } = useAtmosphere();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (spoons <= 2 && !grayRock) {
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

    try {
      const queryEmbedding = await embedText(query);
      let contextStr = '';
      let contextCount = 0;

      if (isValidEmbedding(queryEmbedding)) {
        try {
          const rows = await getAllEmbeddedRows();
          const results = rankSearchResults(queryEmbedding, rows, { topK: 3, threshold: 0.0 });
          contextCount = results.length;
          if (results.length > 0) {
            contextStr = formatContext(results, { maxPerChunk: 300, maxTotalChars: 2000 });
          }
        } catch {
          /* knowledge graph unavailable — proceed without context */
        }
      }

      const messagesPayload = [
        {
          role: 'system' as const,
          content: buildSystemPrompt(contextStr, { spoons, grayRock }),
        },
        { role: 'user' as const, content: query },
      ];

      const res = await fetch(LITELLM_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'ollama/qwen2.5-coder:7b', messages: messagesPayload, stream: true, temperature: 0.3, max_tokens: 1024 }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`LiteLLM returned ${res.status}: ${body}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let responseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              responseText += delta;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === 'archive') {
                  return [...prev.slice(0, -1), { ...last, text: responseText, contextCount }];
                }
                return [...prev, { role: 'archive' as const, text: responseText, contextCount }];
              });
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'error',
        text: err instanceof Error ? `Error: ${err.message}` : 'Query failed — is LiteLLM running?',
      }]);
    }

    setProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const userStyle = {
    background: '#003355', border: '1px solid #00e5ff33', color: '#cce0ff',
    borderRadius: '12px 12px 4px 12px',
  };
  const archiveStyle = {
    background: '#001a33', border: '1px solid #39ff1433', color: '#b0ffb0',
    borderRadius: '12px 12px 12px 4px',
  };
  const errorStyle = {
    background: '#2a0000', border: '1px solid #ff335533', color: '#fca5a5',
    borderRadius: '12px 12px 12px 4px',
  };
  const processingStyle = {
    background: '#001a33', border: '1px solid #39ff1433',
    borderRadius: '12px 12px 12px 4px', color: '#b0ffb0', opacity: 0.6,
  };

  return (
    <div className="flex flex-col w-full min-h-screen animate-fade-in"
      style={{ backgroundColor: '#001122', color: '#00e5ff' }}
    >
      <div className="text-center py-6 border-b" style={{ borderColor: '#00e5ff22' }}>
        <h1 className="text-xl font-light tracking-wide" style={{ color: '#39ff14' }}>THE_ARCHIVE</h1>
        <p className="text-xs font-mono mt-1 opacity-40">RAG-powered · Local embeddings · Zero API tokens</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-lg mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-16 opacity-50">
            <p className="text-sm font-mono">Ask anything about documents in your local knowledge graph.</p>
            <p className="text-[10px] font-mono mt-2 opacity-60">Queries are embedded locally and matched against stored documents. No cloud NLP.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-4/5 px-4 py-3 text-sm font-mono leading-relaxed"
              style={msg.role === 'user' ? userStyle : msg.role === 'error' ? errorStyle : archiveStyle}
            >
              {msg.text}
              {msg.contextCount !== undefined && msg.contextCount > 0 && (
                <div className="text-[9px] mt-1 opacity-40">{msg.contextCount} context chunks</div>
              )}
            </div>
          </div>
        ))}
        {processing && !messages.some((m) => m.role === 'archive' && m.text) && (
          <div className="flex justify-start">
            <div className="px-4 py-3 text-sm font-mono" style={processingStyle}>Searching knowledge graph...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t px-4 py-4" style={{ borderColor: '#00e5ff22' }}>
        <div className="flex gap-3 max-w-lg mx-auto w-full">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown} placeholder="Query your archive..."
            className="flex-1 px-4 py-3 text-sm font-mono outline-none transition-all"
            style={{ backgroundColor: '#002244', border: '1px solid #00e5ff33', color: '#cce0ff' }}
            disabled={processing}
          />
          <button onClick={handleQuery} disabled={processing || !input.trim()}
            className="px-6 py-3 text-sm font-mono uppercase tracking-wider transition-all"
            style={{ backgroundColor: '#003355', color: processing || !input.trim() ? '#00e5ff55' : '#00e5ff', border: '1px solid #00e5ff44' }}
          >{processing ? '...' : 'Ask'}</button>
        </div>
      </div>
    </div>
  );
};

export default TheArchive;
