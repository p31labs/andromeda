// useCentaur — Direct browser fetch to Anthropic Claude API.
// Key read from localStorage ('p31_llm_key'). Never proxied.

import { useCallback, useRef } from 'react';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import type { CentaurStatus } from '../sovereign/types';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM_PROMPT =
  'You are the P31-OS Centaur Engine. Output ONLY valid, stateless React functional components using inline styles. ' +
  'Do not include markdown formatting or explanations. Assume React and useState are in scope.';

export interface CentaurMessage {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export function useCentaur() {
  const messagesRef = useRef<CentaurMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const setStatus = useSovereignStore((s) => s.setCentaurStatus);
  const status = useSovereignStore((s) => s.centaurStatus);

  const getKey = (): string => {
    const key = localStorage.getItem('p31_llm_key');
    if (!key) throw new Error('NO_KEY');
    return key;
  };

  const executePrompt = useCallback(async (prompt: string): Promise<string> => {
    const key = getKey();

    // Append user message
    messagesRef.current = [...messagesRef.current, { role: 'user', content: prompt, ts: Date.now() }];
    setStatus('GENERATING');

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: messagesRef.current.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = await res.json();
      const text: string = data.content?.[0]?.text ?? '';

      messagesRef.current = [...messagesRef.current, { role: 'assistant', content: text, ts: Date.now() }];
      setStatus('SUCCESS', text.slice(0, 120));
      return text;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStatus('IDLE');
        return '';
      }
      const msg = (err as Error).message ?? 'Unknown error';
      setStatus('ERROR', msg.slice(0, 120));
      throw err;
    }
  }, [setStatus]);

  const clearHistory = useCallback(() => {
    messagesRef.current = [];
    setStatus('IDLE', '');
  }, [setStatus]);

  return { executePrompt, clearHistory, messagesRef, status };
}
