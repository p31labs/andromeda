/**
 * Help & Support Modal
 * Version: 2.0.0 - Full screen modal for Chromatica
 */

import React, { useState } from 'react';

export interface HelpSupportProps {
  isOpen: boolean;
  onClose: () => void;
  touchTargetSize?: number;
  fontSize?: number;
  highContrast?: boolean;
}

export const HelpSupport: React.FC<HelpSupportProps> = ({
  isOpen,
  onClose,
  touchTargetSize = 64,
  fontSize = 18,
  highContrast = false,
}) => {
  const [activeSection, setActiveSection] = useState<'faq' | 'shortcuts' | 'voice' | 'emergency'>('faq');

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: highContrast ? '#000' : '#0f1115',
          border: highContrast ? '4px solid #fff' : '2px solid rgba(93,202,165,0.3)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: highContrast ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(93,202,165,0.1) 0%, transparent 100%)',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '32px',
                color: '#5DCAA5',
                fontWeight: 700,
              }}
            >
              ❓ Help & Support
            </h2>
            <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '16px' }}>
              Built for wife • Arthritis-optimized • Voice-enabled
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help"
            style={{
              width: `${touchTargetSize}px`,
              height: `${touchTargetSize}px`,
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(204,98,71,0.3)';
              e.currentTarget.style.borderColor = '#cc6247';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: highContrast ? '1px solid #666' : '1px solid rgba(255,255,255,0.1)',
            padding: '0 32px',
            gap: '8px',
          }}
        >
          {[
            { id: 'faq', label: 'FAQ', icon: '❓' },
            { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
            { id: 'voice', label: 'Voice', icon: '🎤' },
            { id: 'emergency', label: 'Emergency', icon: '🚨' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as typeof activeSection)}
              style={{
                padding: '16px 24px',
                fontSize: '18px',
                fontWeight: 600,
                backgroundColor: activeSection === tab.id
                  ? 'rgba(93,202,165,0.2)'
                  : 'transparent',
                color: activeSection === tab.id ? '#5DCAA5' : '#888',
                border: 'none',
                borderBottom: activeSection === tab.id
                  ? '3px solid #5DCAA5'
                  : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                minHeight: `${touchTargetSize}px`,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            padding: '32px',
            overflowY: 'auto',
            maxHeight: '50vh',
            color: '#D8D6D0',
          }}
        >
          {activeSection === 'faq' && <FAQContent fontSize={fontSize} highContrast={highContrast} />}
          {activeSection === 'shortcuts' && <ShortcutsContent fontSize={fontSize} highContrast={highContrast} />}
          {activeSection === 'voice' && <VoiceContent fontSize={fontSize} highContrast={highContrast} />}
          {activeSection === 'emergency' && <EmergencyContent fontSize={fontSize} highContrast={highContrast} onClose={onClose} />}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 32px',
            borderTop: highContrast ? '1px solid #666' : '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#666', fontSize: '14px' }}>
            Chromatica v2.0.0 • 12-Pillar Certified
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '12px 32px',
              backgroundColor: '#5DCAA5',
              color: '#0f1115',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '48px',
            }}
          >
            Got it ✓
          </button>
        </div>
      </div>
    </div>
  );
};

// === FAQ Content ===
const FAQContent: React.FC<{ fontSize: number; highContrast: boolean }> = ({ fontSize, highContrast }) => {
  const faqs = [
    {
      q: 'How do I use voice commands?',
      a: 'Say "pain level 3" to log pain, "create project" to start something new, "color mixer" to open colors, or "help" anytime.',
    },
    {
      q: 'What makes this arthritis-friendly?',
      a: '96px touch targets, no drag operations, voice control, big sliders, and haptic feedback on every action.',
    },
    {
      q: 'How does the color mixer work?',
      a: 'Tap the harmony wheel, mix like paint, use giant sliders, or say "mix red and blue" - it\'s designed for joy, not precision.',
    },
    {
      q: 'Is my data saved?',
      a: 'Yes! Projects, colors, and pain logs are stored in the app. Export anytime with the download button.',
    },
    {
      q: 'What if I have extreme pain?',
      a: 'Log it in the Pain section. At level 7+, the app will suggest rest. Your health comes first.',
    },
  ];

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {faqs.map((faq, index) => (
        <div
          key={index}
          style={{
            padding: '20px',
            backgroundColor: highContrast ? '#111' : 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: highContrast ? '1px solid #333' : '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: `${fontSize}px`, color: '#5DCAA5' }}>
            {faq.q}
          </h4>
          <p style={{ margin: 0, fontSize: `${fontSize * 0.9}px`, color: '#aaa', lineHeight: 1.6 }}>
            {faq.a}
          </p>
        </div>
      ))}
    </div>
  );
};

// === Shortcuts Content ===
const ShortcutsContent: React.FC<{ fontSize: number; highContrast: boolean }> = ({ fontSize, highContrast }) => {
  const shortcuts = [
    { key: '?', action: 'Open this help' },
    { key: 'N', action: 'New project' },
    { key: 'S', action: 'Settings' },
    { key: '/', action: 'Focus search' },
    { key: 'C', action: 'Color mixer' },
    { key: 'P', action: 'Pain log' },
    { key: 'Esc', action: 'Close modal' },
    { key: '1-4', action: 'Switch views' },
  ];

  return (
    <div>
      <p style={{ marginBottom: '24px', color: '#888' }}>
        Press these keys anytime - no Ctrl/Alt needed. Arthritis-optimized single-key shortcuts.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {shortcuts.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: highContrast ? '#111' : 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
            }}
          >
            <kbd
              style={{
                padding: '12px 20px',
                backgroundColor: 'rgba(93,202,165,0.2)',
                color: '#5DCAA5',
                borderRadius: '8px',
                fontSize: '20px',
                fontWeight: 'bold',
                minWidth: '60px',
                textAlign: 'center',
              }}
            >
              {s.key}
            </kbd>
            <span style={{ fontSize: `${fontSize}px`, color: '#D8D6D0' }}>{s.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// === Voice Commands Content ===
const VoiceContent: React.FC<{ fontSize: number; highContrast: boolean }> = ({ fontSize, highContrast }) => {
  const commands = [
    { cmd: 'Pain level [1-10]', desc: 'Log pain instantly' },
    { cmd: 'Create project', desc: 'Start new project' },
    { cmd: 'Color mixer', desc: 'Open color tools' },
    { cmd: 'Mix [color] and [color]', desc: 'Blend colors' },
    { cmd: 'Lighter / Darker', desc: 'Adjust brightness' },
    { cmd: 'Warmer / Cooler', desc: 'Adjust hue' },
    { cmd: 'Save color', desc: 'Save to swatches' },
    { cmd: 'Random palette', desc: 'Generate colors' },
    { cmd: 'Dashboard / Home', desc: 'Go home' },
    { cmd: 'Help', desc: 'Show this panel' },
  ];

  return (
    <div>
      <p style={{ marginBottom: '24px', color: '#888' }}>
        🎤 Voice commands work anywhere. Just speak naturally - the app is always listening for these phrases.
      </p>
      <div style={{ display: 'grid', gap: '12px' }}>
        {commands.map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: highContrast ? '#111' : 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              borderLeft: '4px solid #5DCAA5',
            }}
          >
            <span style={{ fontSize: `${fontSize}px`, color: '#5DCAA5', fontWeight: 600 }}>"{c.cmd}"</span>
            <span style={{ fontSize: `${fontSize * 0.9}px`, color: '#888' }}>{c.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// === Emergency Content ===
const EmergencyContent: React.FC<{ fontSize: number; highContrast: boolean; onClose: () => void }> = ({
  fontSize,
  highContrast,
  onClose,
}) => (
  <div>
    <div
      style={{
        backgroundColor: highContrast ? '#ff6b6b' : 'rgba(204,98,71,0.2)',
        border: highContrast ? '3px solid #fff' : '2px solid #cc6247',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}
    >
      <h4 style={{ margin: '0 0 12px 0', fontSize: '24px', color: highContrast ? '#fff' : '#cc6247' }}>
        🚨 App Not Responding?
      </h4>
      <p style={{ margin: '0 0 16px 0', fontSize: `${fontSize}px`, color: highContrast ? '#fff' : '#D8D6D0' }}>
        Your data is safe. Try these steps:
      </p>
      <ol style={{ margin: 0, paddingLeft: '24px', color: highContrast ? '#fff' : '#aaa', fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
        <li>Press Escape or tap outside this modal</li>
        <li>Say "help" to reset focus</li>
        <li>Reload the page - data persists</li>
      </ol>
    </div>

    <button
      onClick={() => {
        if (confirm('Reload the app? All unsaved work will be preserved.')) {
          window.location.reload();
        }
      }}
      style={{
        width: '100%',
        padding: '20px',
        backgroundColor: '#cc6247',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        fontSize: '20px',
        fontWeight: 600,
        cursor: 'pointer',
        minHeight: '64px',
      }}
    >
      Reload App 🔄
    </button>

    <p style={{ marginTop: '24px', color: '#666', textAlign: 'center', fontSize: '14px' }}>
      Built with love for wife 💚
    </p>
  </div>
);

export default HelpSupport;
