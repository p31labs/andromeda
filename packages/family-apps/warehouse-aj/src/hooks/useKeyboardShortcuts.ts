import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

interface UseKeyboardShortcutsProps {
  onScanToggle?: () => void;
  onSearchFocus?: () => void;
  onHelpOpen?: () => void;
  onSettingsOpen?: () => void;
  onBatchToggle?: () => void;
}

export function useKeyboardShortcuts({
  onScanToggle,
  onSearchFocus,
  onHelpOpen,
  onSettingsOpen,
  onBatchToggle,
}: UseKeyboardShortcutsProps) {
  const { setActiveTab, setBatchMode } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Escape to close inputs
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          onHelpOpen?.();
          break;

        case ' ':
          e.preventDefault();
          onScanToggle?.();
          break;

        case 's':
        case 'S':
          setActiveTab('scan');
          break;

        case 'd':
        case 'D':
          setActiveTab('dashboard');
          break;

        case '/':
          e.preventDefault();
          onSearchFocus?.();
          break;

        case 'b':
        case 'B':
          onBatchToggle?.();
          setBatchMode(true);
          break;

        case ',':
        case '<':
          onSettingsOpen?.();
          break;

        case 'Escape':
          setBatchMode(false);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScanToggle, onSearchFocus, onHelpOpen, onSettingsOpen, onBatchToggle, setActiveTab, setBatchMode]);
}

export default useKeyboardShortcuts;
