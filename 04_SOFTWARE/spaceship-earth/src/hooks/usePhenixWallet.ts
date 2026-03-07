/**
 * usePhenixWallet — React hook for the Phenix Donation Wallet.
 * Wraps phenixWallet.ts service with React state management.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getWalletState,
  generateStealthKeys,
  createVault,
  unlockVault,
  lockVault as lockVaultService,
  logMemo as logMemoService,
  getMemos,
  getMemoStats,
  exportMemoLog,
  refreshAllBalances,
  type WalletState,
  type MemoEntry,
  type MemoStats,
} from '../services/phenixWallet';

interface PhenixWalletHook {
  state: WalletState;
  loading: boolean;
  error: string | null;
  logs: LogLine[];
  // Actions
  createWallet: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  refreshBalances: () => Promise<void>;
  addMemo: (entry: Partial<MemoEntry>) => void;
  getStats: () => MemoStats;
  exportLedger: () => Promise<void>;
  clearError: () => void;
}

export interface LogLine {
  time: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export function usePhenixWallet(): PhenixWalletHook {
  const [state, setState] = useState<WalletState>(getWalletState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);

  const log = useCallback((level: LogLine['level'], message: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev.slice(-49), { time, level, message }]);
  }, []);

  const refresh = useCallback(() => {
    setState(getWalletState());
  }, []);

  // Sync state on mount
  useEffect(() => {
    refresh();
    log('info', 'Phenix Wallet service initialized.');
  }, [refresh, log]);

  const createWallet = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    log('info', 'Generating stealth keypair...');
    try {
      const keys = await generateStealthKeys();
      await createVault(keys, password);
      log('success', 'Genesis Gate initialized. Meta-address generated.');
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      log('error', 'Genesis Gate FAILED: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [log, refresh]);

  const unlock = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);
    log('info', 'Decrypting vault...');
    try {
      await unlockVault(password);
      log('success', 'Vault unsealed. Viewing key cached in session.');
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      const display = msg === 'WRONG_PASSWORD' ? 'Wrong password.' : 'Unlock failed: ' + msg;
      setError(display);
      log('error', display);
    } finally {
      setLoading(false);
    }
  }, [log, refresh]);

  const lock = useCallback(() => {
    lockVaultService();
    log('warn', 'Vault sealed. Session cleared.');
    refresh();
  }, [log, refresh]);

  const refreshBalances = useCallback(async () => {
    log('info', 'Refreshing balances across stealth addresses...');
    try {
      const result = await refreshAllBalances();
      log('success', `Balances updated. Total: ${result.totalETH.toFixed(6)} ETH across ${result.addresses.length} addresses.`);
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log('error', 'Balance refresh failed: ' + msg);
    }
  }, [log, refresh]);

  const addMemo = useCallback((entry: Partial<MemoEntry>) => {
    try {
      logMemoService(entry);
      log('success', `Memo logged: [${entry.type || 'NOTE'}] ${(entry.memo || '').slice(0, 50)}...`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log('error', 'Memo logging failed: ' + msg);
    }
  }, [log]);

  const getStats = useCallback((): MemoStats => {
    return getMemoStats();
  }, []);

  const exportLedger = useCallback(async () => {
    log('info', 'Exporting memo ledger...');
    try {
      const exported = await exportMemoLog();
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phenix-ledger-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      log('success', 'Ledger exported. OQE ready for court filing.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      log('error', 'Export failed: ' + msg);
    }
  }, [log]);

  const clearError = useCallback(() => setError(null), []);

  return {
    state,
    loading,
    error,
    logs,
    createWallet,
    unlock,
    lock,
    refreshBalances,
    addMemo,
    getStats,
    exportLedger,
    clearError,
  };
}
