/**
 * useAccessibility Hook
 * Manage accessibility settings and preferences
 */

import { useState, useEffect, useCallback } from 'react';
import { AccessibilitySettings, DEFAULT_ACCESSIBILITY_SETTINGS } from '../utils/accessibility';

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(
    DEFAULT_ACCESSIBILITY_SETTINGS
  );
  const [loaded, setLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chromatica_accessibility');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_ACCESSIBILITY_SETTINGS, ...parsed });
      } catch {
        // Use defaults if parse fails
      }
    }
    setLoaded(true);
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem('chromatica_accessibility', JSON.stringify(settings));
    }
  }, [settings, loaded]);

  const updateSetting = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const increaseFontSize = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      fontSize: prev.fontSize === 24 ? 32 : prev.fontSize === 32 ? 40 : 40
    }));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      fontSize: prev.fontSize === 40 ? 32 : prev.fontSize === 32 ? 24 : 24
    }));
  }, []);

  const toggleContrast = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      contrastMode: prev.contrastMode === 'normal' ? 'high' : 
                    prev.contrastMode === 'high' ? 'dark' : 'normal'
    }));
  }, []);

  const toggleVoice = useCallback(() => {
    setSettings(prev => ({ ...prev, voiceEnabled: !prev.voiceEnabled }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
  }, []);

  return {
    settings,
    loaded,
    updateSetting,
    increaseFontSize,
    decreaseFontSize,
    toggleContrast,
    toggleVoice,
    resetToDefaults
  };
}

export default useAccessibility;
