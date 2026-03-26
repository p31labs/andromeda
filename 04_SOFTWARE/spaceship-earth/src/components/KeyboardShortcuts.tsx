// spaceship-earth/src/components/KeyboardShortcuts.tsx
// Comprehensive keyboard shortcuts system for quantum-level accessibility
import React, { useEffect, useCallback, useState } from 'react';
import { useAccessibility } from '../hooks/useAccessibility';

interface Shortcut {
  key: string;
  description: string;
  action: () => void;
  category: 'navigation' | 'interaction' | 'system';
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
}

export interface ShortcutConfig {
  enabled: boolean;
  global: boolean;
  showHints: boolean;
}

/**
 * Keyboard shortcuts component with comprehensive accessibility support
 */
export function KeyboardShortcuts({ config }: { config: ShortcutConfig }) {
  const { registerShortcut, unregisterShortcut, preferences } = useAccessibility();
  const [activeShortcuts, setActiveShortcuts] = useState<Shortcut[]>([]);
  const [showHints, setShowHints] = useState(config.showHints);

  // Define all available shortcuts
  const shortcuts: Shortcut[] = [
    // Navigation shortcuts
    {
      key: 'h',
      description: 'Toggle help overlay',
      action: () => setShowHints(!showHints),
      category: 'system',
      modifiers: { ctrl: true },
    },
    {
      key: 'k',
      description: 'Focus search',
      action: () => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"]') as HTMLElement;
        if (searchInput) searchInput.focus();
      },
      category: 'navigation',
      modifiers: { ctrl: true },
    },
    {
      key: 'g',
      description: 'Go to main content',
      action: () => {
        const main = document.getElementById('main-content') || document.querySelector('main');
        if (main) main.scrollIntoView({ behavior: 'smooth' });
      },
      category: 'navigation',
      modifiers: { ctrl: true },
    },
    {
      key: 'r',
      description: 'Refresh page',
      action: () => window.location.reload(),
      category: 'system',
      modifiers: { ctrl: true },
    },
    {
      key: 'f',
      description: 'Focus first interactive element',
      action: () => {
        const first = document.querySelector('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
        if (first) first.focus();
      },
      category: 'interaction',
      modifiers: { ctrl: true },
    },
    // Room navigation shortcuts
    {
      key: '1',
      description: 'Switch to Observatory',
      action: () => navigateToRoom('observatory'),
      category: 'navigation',
    },
    {
      key: '2',
      description: 'Switch to Collider',
      action: () => navigateToRoom('collider'),
      category: 'navigation',
    },
    {
      key: '3',
      description: 'Switch to Bridge',
      action: () => navigateToRoom('bridge'),
      category: 'navigation',
    },
    {
      key: '4',
      description: 'Switch to Vault',
      action: () => navigateToRoom('vault'),
      category: 'navigation',
    },
    {
      key: '5',
      description: 'Switch to Buffer',
      action: () => navigateToRoom('buffer'),
      category: 'navigation',
    },
    {
      key: '6',
      description: 'Switch to Sovereign',
      action: () => navigateToRoom('sovereign'),
      category: 'navigation',
    },
    // Accessibility shortcuts
    {
      key: 't',
      description: 'Toggle theme',
      action: () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme') || 'operator';
        const themes = ['operator', 'kids', 'aurora', 'gray_rock', 'high_contrast', 'low_motion'];
        const currentIndex = themes.indexOf(currentTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        root.setAttribute('data-theme', nextTheme);
      },
      category: 'system',
      modifiers: { ctrl: true },
    },
    {
      key: 'm',
      description: 'Toggle reduced motion',
      action: () => {
        const root = document.documentElement;
        const current = root.style.getPropertyValue('--reduce-motion');
        root.style.setProperty('--reduce-motion', current === '1' ? '0' : '1');
      },
      category: 'system',
      modifiers: { ctrl: true },
    },
    {
      key: 'l',
      description: 'Toggle large text',
      action: () => {
        const root = document.documentElement;
        const current = root.style.getPropertyValue('--text-scale');
        root.style.setProperty('--text-scale', current === '1.25' ? '1' : '1.25');
      },
      category: 'system',
      modifiers: { ctrl: true },
    },
    // System shortcuts
    {
      key: 'Escape',
      description: 'Close modal/overlay',
      action: () => {
        const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (modal) {
          const closeBtn = modal.querySelector('[data-close]');
          if (closeBtn instanceof HTMLElement) {
            closeBtn.click();
          }
        }
      },
      category: 'system',
    },
    {
      key: 'Enter',
      description: 'Activate focused element',
      action: () => {
        const active = document.activeElement as HTMLElement;
        if (active && active.click) {
          active.click();
        }
      },
      category: 'interaction',
    },
    {
      key: 'Space',
      description: 'Toggle checkbox/radio',
      action: () => {
        const active = document.activeElement as HTMLInputElement;
        if (active && (active.type === 'checkbox' || active.type === 'radio')) {
          active.checked = !active.checked;
        }
      },
      category: 'interaction',
    },
  ];

  // Register shortcuts when component mounts
  useEffect(() => {
    if (!config.enabled) return;

    const registeredIds: string[] = [];

    shortcuts.forEach((shortcut, index) => {
      const id = `shortcut-${index}`;
      registeredIds.push(id);
      
      registerShortcut(id, {
        key: shortcut.key,
        description: shortcut.description,
        action: shortcut.action,
        category: shortcut.category,
      });
    });

    setActiveShortcuts(shortcuts);

    return () => {
      registeredIds.forEach(id => unregisterShortcut(id));
    };
  }, [config.enabled, registerShortcut, unregisterShortcut]);

  // Global keyboard event handler
  useEffect(() => {
    if (!config.enabled || !config.global) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return;
      }

      // Check for modifier combinations
      const checkModifiers = (modifiers: Shortcut['modifiers']) => {
        if (!modifiers) return true;
        return (
          (modifiers.ctrl === undefined || modifiers.ctrl === e.ctrlKey) &&
          (modifiers.alt === undefined || modifiers.alt === e.altKey) &&
          (modifiers.shift === undefined || modifiers.shift === e.shiftKey) &&
          (modifiers.meta === undefined || modifiers.meta === e.metaKey)
        );
      };

      // Process shortcuts
      shortcuts.forEach(shortcut => {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifiersMatch = checkModifiers(shortcut.modifiers);

        if (keyMatch && modifiersMatch) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.enabled, config.global]);

  if (!config.enabled || !showHints) {
    return null;
  }

  return (
    <div className="keyboard-shortcuts-hint" style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      background: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid var(--neon-faint)',
      borderRadius: '8px',
      padding: '12px',
      maxWidth: '300px',
      fontFamily: 'var(--font-data)',
      fontSize: '11px',
      color: 'var(--cyan)',
      boxShadow: '0 4px 20px rgba(0, 255, 255, 0.1)',
      backdropFilter: 'blur(8px)',
      zIndex: 9997,
      maxHeight: '60vh',
      overflow: 'auto',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        borderBottom: '1px solid var(--neon-faint)',
        paddingBottom: '4px',
      }}>
        <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>KEYBOARD SHORTCUTS</span>
        <button
          onClick={() => setShowHints(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--dim)',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>NAVIGATION</div>
        {shortcuts
          .filter(s => s.category === 'navigation')
          .map((shortcut, index) => (
            <ShortcutItem key={index} shortcut={shortcut} />
          ))}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>INTERACTION</div>
        {shortcuts
          .filter(s => s.category === 'interaction')
          .map((shortcut, index) => (
            <ShortcutItem key={index} shortcut={shortcut} />
          ))}
      </div>

      <div>
        <div style={{ marginBottom: '4px', fontSize: '10px', opacity: 0.7 }}>SYSTEM</div>
        {shortcuts
          .filter(s => s.category === 'system')
          .map((shortcut, index) => (
            <ShortcutItem key={index} shortcut={shortcut} />
          ))}
      </div>

      <div style={{
        marginTop: '8px',
        fontSize: '9px',
        opacity: 0.5,
        borderTop: '1px solid var(--neon-faint)',
        paddingTop: '4px',
      }}>
        Tip: Press Ctrl+H to toggle this overlay
      </div>
    </div>
  );
}

/**
 * Individual shortcut display component
 */
function ShortcutItem({ shortcut }: { shortcut: Shortcut }) {
  const renderModifiers = () => {
    if (!shortcut.modifiers) return null;
    
    return (
      <span style={{ marginRight: '4px' }}>
        {shortcut.modifiers.ctrl && <span style={{ opacity: 0.7 }}>Ctrl+</span>}
        {shortcut.modifiers.alt && <span style={{ opacity: 0.7 }}>Alt+</span>}
        {shortcut.modifiers.shift && <span style={{ opacity: 0.7 }}>Shift+</span>}
        {shortcut.modifiers.meta && <span style={{ opacity: 0.7 }}>Meta+</span>}
      </span>
    );
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '4px 0',
      borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ opacity: 0.7 }}>{renderModifiers()}</span>
        <span style={{
          background: 'rgba(0, 255, 255, 0.1)',
          border: '1px solid var(--neon-faint)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontFamily: 'monospace',
          fontSize: '10px',
        }}>
          {shortcut.key}
        </span>
      </div>
      <div style={{ textAlign: 'right', opacity: 0.8, fontSize: '10px' }}>
        {shortcut.description}
      </div>
    </div>
  );
}

/**
 * Hook for managing keyboard shortcuts programmatically
 */
export function useKeyboardShortcuts() {
  const { registerShortcut, unregisterShortcut } = useAccessibility();

  const addShortcut = useCallback((id: string, shortcut: Shortcut) => {
    registerShortcut(id, {
      key: shortcut.key,
      description: shortcut.description,
      action: shortcut.action,
      category: shortcut.category,
    });
  }, [registerShortcut]);

  const removeShortcut = useCallback((id: string) => {
    unregisterShortcut(id);
  }, [unregisterShortcut]);

  return { addShortcut, removeShortcut };
}

/**
 * Utility function to navigate to a room (would integrate with room router)
 */
function navigateToRoom(roomId: string) {
  // This would integrate with the existing room navigation system
  // For now, we'll use a simple hash-based navigation
  window.location.hash = roomId;
  
  // Announce the navigation to screen readers
  const announcer = document.getElementById('p31-live-region');
  if (announcer) {
    announcer.textContent = `Navigated to ${roomId} room`;
    setTimeout(() => {
      if (announcer.textContent === `Navigated to ${roomId} room`) {
        announcer.textContent = '';
      }
    }, 2000);
  }
}

/**
 * Accessibility-focused focus management component
 */
export function FocusManager() {
  const { focusManagement } = useAccessibility();

  useEffect(() => {
    // Enhance all interactive elements with proper focus management
    const enhanceElement = (element: HTMLElement) => {
      // Add focus-visible support
      element.addEventListener('focus', () => {
        element.classList.add('focus-visible');
      });
      
      element.addEventListener('blur', () => {
        element.classList.remove('focus-visible');
      });

      // Enhance touch targets for motor accessibility
      element.style.minHeight = '44px';
      element.style.minWidth = '44px';
    };

    // Apply to all interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    interactiveElements.forEach(enhanceElement);

    // Observe for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            if (element.matches('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')) {
              enhanceElement(element);
            }
            // Check children too
            const children = element.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) as NodeListOf<HTMLElement>;
            children.forEach(enhanceElement);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}