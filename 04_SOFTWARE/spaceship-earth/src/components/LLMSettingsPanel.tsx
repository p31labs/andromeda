/**
 * @file LLMSettingsPanel — Configure LLM endpoint, model, and API key.
 *
 * Mounted inside BridgeOverlay. Settings are persisted via llmClient.saveLLMConfig()
 * which encrypts the API key with AES-GCM (key in IndexedDB, cipher in localStorage).
 */

import { useEffect, useState } from 'react';
import { loadLLMConfig, saveLLMConfig } from '../services/llmClient';

const PRESETS = [
  { label: 'Ollama (local)', endpoint: 'http://localhost:11434/v1', model: 'llama3' },
  { label: 'OpenAI',         endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { label: 'Groq',           endpoint: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
];

export function LLMSettingsPanel() {
  const [endpoint, setEndpoint] = useState('');
  const [model,    setModel]    = useState('llama3');
  const [apiKey,   setApiKey]   = useState('');
  const [status,   setStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    loadLLMConfig().then(cfg => {
      setEndpoint(cfg.endpoint);
      setModel(cfg.model);
      setApiKey(cfg.apiKey);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    try {
      await saveLLMConfig({ endpoint: endpoint.trim(), model: model.trim(), apiKey: apiKey.trim() });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setEndpoint(preset.endpoint);
    setModel(preset.model);
  };

  if (!loaded) {
    return <div style={{ padding: '20px 24px', color: 'var(--dim)', fontSize: 11 }}>Loading…</div>;
  }

  return (
    <div style={{ padding: '20px 24px', fontFamily: 'var(--font-data)', color: 'var(--text)' }}>
      {/* Presets */}
      <div style={{ fontSize: 10, opacity: 0.45, letterSpacing: 2, marginBottom: 10 }}>PRESETS</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {PRESETS.map(p => (
          <button
            key={p.endpoint}
            type="button"
            onClick={() => applyPreset(p)}
            style={{
              background: endpoint === p.endpoint ? 'var(--neon-faint)' : 'var(--s2)',
              border: `1px solid ${endpoint === p.endpoint ? 'var(--cyan)' : 'var(--dim2)'}`,
              borderRadius: 4, color: endpoint === p.endpoint ? 'var(--cyan)' : 'var(--dim)',
              fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: 1,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Endpoint */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="llm-endpoint" style={{ display: 'block', fontSize: 9, opacity: 0.45, letterSpacing: 2, marginBottom: 5 }}>
          ENDPOINT
        </label>
        <input
          id="llm-endpoint"
          type="url"
          value={endpoint}
          onChange={e => setEndpoint(e.target.value)}
          placeholder="http://localhost:11434/v1"
          className="glass-input"
          style={{ width: '100%', padding: '8px 10px', fontSize: 11, boxSizing: 'border-box' }}
        />
      </div>

      {/* Model */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="llm-model" style={{ display: 'block', fontSize: 9, opacity: 0.45, letterSpacing: 2, marginBottom: 5 }}>
          MODEL
        </label>
        <input
          id="llm-model"
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="llama3"
          className="glass-input"
          style={{ width: '100%', padding: '8px 10px', fontSize: 11, boxSizing: 'border-box' }}
        />
      </div>

      {/* API Key */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="llm-apikey" style={{ display: 'block', fontSize: 9, opacity: 0.45, letterSpacing: 2, marginBottom: 5 }}>
          API KEY <span style={{ opacity: 0.4 }}>(encrypted)</span>
        </label>
        <input
          id="llm-apikey"
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-… or leave blank for Ollama"
          className="glass-input"
          style={{ width: '100%', padding: '8px 10px', fontSize: 11, boxSizing: 'border-box' }}
          autoComplete="off"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={status === 'saving'}
        style={{
          width: '100%', background: 'var(--neon-faint)',
          border: `1px solid ${status === 'saved' ? 'var(--mint)' : status === 'error' ? 'var(--coral)' : 'var(--cyan)'}`,
          borderRadius: 6,
          color: status === 'saved' ? 'var(--mint)' : status === 'error' ? 'var(--coral)' : 'var(--cyan)',
          fontSize: 11, padding: '10px', cursor: 'pointer', letterSpacing: 1,
        }}
      >
        {status === 'saving' ? 'SAVING…' : status === 'saved' ? '✓ SAVED' : status === 'error' ? 'ERROR — RETRY' : 'SAVE LLM SETTINGS'}
      </button>
    </div>
  );
}
