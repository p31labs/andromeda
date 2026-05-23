/**
 * usePainLog Hook
 * Track pain levels over time for medical review
 */

import { useState, useCallback, useEffect } from 'react';
import { PainLogEntry } from '../types';

const STORAGE_KEY = 'chromatica_pain_log';

export function usePainLog() {
  const [entries, setEntries] = useState<PainLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEntries(parsed);
      } catch {
        // Ignore parse errors
      }
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries, loaded]);

  const addEntry = useCallback((
    painLevel: number,
    triggerAction: string,
    mitigatedBy: string,
    notes?: string
  ) => {
    const newEntry: PainLogEntry = {
      id: `pain-${Date.now()}`,
      timestamp: Date.now(),
      painLevel,
      triggerAction,
      mitigatedBy,
      notes,
      slhSignature: `slh-${Date.now()}` // Mock SLH-DSA signature
    };
    
    setEntries(prev => [...prev, newEntry]);
  }, []);

  const getRecentEntries = useCallback((hours: number = 24) => {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return entries.filter(e => e.timestamp >= cutoff);
  }, [entries]);

  const getAveragePainLevel = useCallback((hours: number = 24) => {
    const recent = getRecentEntries(hours);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, e) => sum + e.painLevel, 0) / recent.length;
  }, [getRecentEntries]);

  const getTriggers = useCallback(() => {
    const triggerCounts: Record<string, number> = {};
    entries.forEach(e => {
      triggerCounts[e.triggerAction] = (triggerCounts[e.triggerAction] || 0) + 1;
    });
    return Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [entries]);

  const clearHistory = useCallback(() => {
    setEntries([]);
  }, []);

  return {
    entries,
    loaded,
    addEntry,
    getRecentEntries,
    getAveragePainLevel,
    getTriggers,
    clearHistory
  };
}

export default usePainLog;
