/**
 * useKeyboardShortcuts - Arthritis-Friendly Keyboard Navigation
 * Single-key shortcuts, no complex combinations
 */

import { useEffect } from 'react';
import { useChromaticaStore } from '../stores/useChromaticaStore';

interface UseKeyboardShortcutsProps {
  onCreateNew?: () => void;
  onSave?: () => void;
  onSearchFocus?: () => void;
  onHelpOpen?: () => void;
  onSettingsOpen?: () => void;
  onRestTimer?: () => void;
  onVoiceToggle?: () => void;
}

export function useKeyboardShortcuts({
  onCreateNew,
  onSave,
  onSearchFocus,
  onHelpOpen,
  onSettingsOpen,
  onRestTimer,
  onVoiceToggle,
}: UseKeyboardShortcutsProps) {
  const { setPreferences, preferences } = useChromaticaStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // Arthritis-friendly: single key shortcuts, no modifiers needed
      switch (e.key) {
        case '?':
        case 'h':
        case 'H':
          e.preventDefault();
          onHelpOpen?.();
          break;

        case 'n':
        case 'N':
          e.preventDefault();
          onCreateNew?.();
          break;

        case 's':
        case 'S':
          e.preventDefault();
          onSave?.();
          break;

        case '/':
          e.preventDefault();
          onSearchFocus?.();
          break;

        case ',':
        case 'c':
        case 'C':
          e.preventDefault();
          onSettingsOpen?.();
          break;

        case 'r':
        case 'R':
          e.preventDefault();
          onRestTimer?.();
          break;

        case 'v':
        case 'V':
          e.preventDefault();
          setPreferences({ voiceEnabled: !preferences.voiceEnabled });
          onVoiceToggle?.();
          break;

        case 'Escape':
          // Global escape handler
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCreateNew, onSave, onSearchFocus, onHelpOpen, onSettingsOpen, onRestTimer, onVoiceToggle, preferences.voiceEnabled, setPreferences]);
}

export default useKeyboardShortcuts;
