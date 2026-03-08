// D3.2: useJitterbugCompiler hook
// Unified interface for compiling JSX cartridges, sandboxing them,
// persisting to IndexedDB, and mounting to dynamic slots.

import { useState, useCallback, useEffect, useRef } from 'react';
import { ensureBabel, compileCentaurCode, moduleRegistry } from '../services/jitterbugCompiler';
import { buildSrcdoc, validateManifest } from '../services/cartridgeSandbox';
import { saveCartridge, listCartridges } from '../services/cartridgeStore';
import type { CartridgeRecord } from '../services/cartridgeStore';
import type { CartridgeTelemetry, P31AppManifest } from '../services/cartridgeSandbox';
import { useSovereignStore } from '../sovereign/useSovereignStore';

export type CompilerStatus = 'idle' | 'loading' | 'ready' | 'compiling' | 'error';

export interface JitterbugCompiler {
  status: CompilerStatus;
  error: string | null;
  telemetry: CartridgeTelemetry[];
  cartridges: CartridgeRecord[];

  // Compile JSX source → transpiled JS (does not mount)
  compile: (source: string) => string | null;

  // Compile + mount as in-process React component (fast, no sandbox)
  compileAndMount: (source: string, slot: number, name: string) => boolean;

  // Compile + build sandboxed srcdoc (safe, isolated)
  buildSandboxed: (source: string, title: string) => string | null;

  // Persist cartridge to IndexedDB
  persist: (record: Omit<CartridgeRecord, 'createdAt' | 'updatedAt'>) => Promise<void>;

  // Validate a p31app.json manifest
  validateManifest: (manifest: unknown) => { valid: boolean; errors: string[] };

  // Reload cartridge list from IndexedDB
  refreshCartridges: () => Promise<void>;
}

export function useJitterbugCompiler(): JitterbugCompiler {
  const [status, setStatus] = useState<CompilerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<CartridgeTelemetry[]>([]);
  const [cartridges, setCartridges] = useState<CartridgeRecord[]>([]);
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;

  // Load Babel on mount
  useEffect(() => {
    setStatus('loading');
    ensureBabel()
      .then(() => setStatus('ready'))
      .catch((err) => {
        setStatus('error');
        setError(err.message);
      });
  }, []);

  // Listen for PostMessage telemetry from sandboxed iframes
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.channel !== 'P31_CARTRIDGE') return;
      const msg: CartridgeTelemetry = {
        type: event.data.type,
        payload: event.data.payload,
        timestamp: event.data.timestamp ?? Date.now(),
      };
      // Cap telemetry buffer at 200 entries
      setTelemetry(prev => [...prev.slice(-199), msg]);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Load cartridges from IndexedDB on mount
  useEffect(() => {
    listCartridges().then(setCartridges).catch(() => {});
  }, []);

  const compile = useCallback((source: string): string | null => {
    try {
      setStatus('compiling');
      setError(null);
      // compileCentaurCode returns a component, but we need the transpiled code
      // So we do the Babel transform directly
      if (!window.Babel) {
        throw new Error('Babel not loaded');
      }
      let code = source.trim();
      if (code.startsWith('```')) {
        code = code.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
      }
      const transformed = window.Babel.transform(code, { presets: ['react'] });
      if (!transformed.code) throw new Error('Babel transform returned empty');
      setStatus('ready');
      return transformed.code;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
      return null;
    }
  }, []);

  const compileAndMountFn = useCallback((source: string, slot: number, name: string): boolean => {
    try {
      setStatus('compiling');
      setError(null);
      const Component = compileCentaurCode(source);
      moduleRegistry.set(`SLOT_${slot}`, Component);
      useSovereignStore.getState().mountToSlot(slot, name);
      setStatus('ready');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus('error');
      return false;
    }
  }, []);

  const buildSandboxedFn = useCallback((source: string, title: string): string | null => {
    const compiled = compile(source);
    if (!compiled) return null;
    return buildSrcdoc(compiled, title);
  }, [compile]);

  const persist = useCallback(async (record: Omit<CartridgeRecord, 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const full: CartridgeRecord = {
      ...record,
      createdAt: now,
      updatedAt: now,
    };
    await saveCartridge(full);
    const updated = await listCartridges();
    setCartridges(updated);
  }, []);

  const refreshCartridges = useCallback(async () => {
    const list = await listCartridges();
    setCartridges(list);
  }, []);

  return {
    status,
    error,
    telemetry,
    cartridges,
    compile,
    compileAndMount: compileAndMountFn,
    buildSandboxed: buildSandboxedFn,
    persist,
    validateManifest,
    refreshCartridges,
  };
}
