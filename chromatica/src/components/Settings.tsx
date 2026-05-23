/**
 * Settings Component v2.0
 * Preferences Palace - Dark P31 Theme
 * 
 * Features:
 * - 96px toggle switches
 * - Font size preview
 * - Voice command settings
 * - High contrast preview
 * - Theme selection
 * - Export data
 * - Credits section
 */

import React, { useState } from 'react';
import { useChromaticaStore, Preferences } from '../stores/useChromaticaStore';
import { BigButton } from './BigButton';

export const Settings: React.FC = () => {
  const { preferences, setPreferences, setContext, context } = useChromaticaStore();
  const [showExportSuccess, setShowExportSuccess] = useState(false);

  const handleToggle = (key: keyof Preferences) => {
    setPreferences({ [key]: !preferences[key] });
  };

  const handleExport = () => {
    const data = {
      preferences,
      context,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chromatica-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  const fontSizePreview = preferences.fontSize === 'extra-large' ? 24 : 
                         preferences.fontSize === 'large' ? 20 : 16;

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 200px)',
        background: 'linear-gradient(180deg, #0f1115 0%, #161920 100%)',
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          color: '#5DCAA5', 
          margin: '0 0 8px 0',
          fontWeight: 700,
        }}>
          ⚙️ Preferences Palace
        </h1>
        <p style={{ color: '#888', fontSize: '18px', margin: 0 }}>
          Customize your experience • Every setting for your comfort
        </p>
      </div>

      {/* Context Section */}
      <Section title="🌍 Context Mode" description="Choose your current focus area">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { id: 'home', icon: '🏠', label: 'Home', desc: 'Personal projects' },
            { id: 'business', icon: '💼', label: 'Business', desc: 'Work tasks' },
            { id: 'family', icon: '👨‍👩‍👧‍👦', label: 'Family', desc: 'Shared with loved ones' },
          ].map((ctx) => (
            <button
              key={ctx.id}
              onClick={() => setContext(ctx.id as any)}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '24px',
                backgroundColor: context === ctx.id ? 'rgba(93,202,165,0.15)' : '#161920',
                border: context === ctx.id ? '2px solid #5DCAA5' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>{ctx.icon}</div>
              <div style={{ fontSize: '20px', color: context === ctx.id ? '#5DCAA5' : '#D8D6D0', fontWeight: 600 }}>
                {ctx.label}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>{ctx.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Theme Section */}
      <Section title="🎨 Theme" description="Choose your visual style">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[
            { id: 'dark', icon: '🌙', label: 'Dark', desc: 'Easy on the eyes' },
            { id: 'light', icon: '☀️', label: 'Light', desc: 'Bright and airy' },
            { id: 'system', icon: '🔄', label: 'Auto', desc: 'Follow system' },
          ].map((theme) => (
            <button
              key={theme.id}
              onClick={() => setPreferences({ theme: theme.id as any })}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '20px',
                backgroundColor: preferences.theme === theme.id ? 'rgba(93,202,165,0.15)' : '#161920',
                border: preferences.theme === theme.id ? '2px solid #5DCAA5' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{theme.icon}</div>
              <div style={{ fontSize: '18px', color: preferences.theme === theme.id ? '#5DCAA5' : '#D8D6D0' }}>
                {theme.label}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Font Size Section with Preview */}
      <Section title="📏 Font Size" description="Adjust text size for comfortable reading">
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              padding: '24px',
              backgroundColor: '#161920',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '16px',
            }}
          >
            <p style={{ 
              fontSize: `${fontSizePreview}px`, 
              color: '#D8D6D0',
              margin: 0,
              lineHeight: 1.6,
            }}>
              This is how text will look. Pick a size that feels comfortable for your eyes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { id: 'normal', label: 'Normal', size: 16 },
              { id: 'large', label: 'Large', size: 20 },
              { id: 'extra-large', label: 'XL', size: 24 },
            ].map((size) => (
              <button
                key={size.id}
                onClick={() => setPreferences({ fontSize: size.id as any })}
                style={{
                  flex: 1,
                  padding: '20px',
                  backgroundColor: preferences.fontSize === size.id ? 'rgba(93,202,165,0.15)' : '#161920',
                  border: preferences.fontSize === size.id ? '2px solid #5DCAA5' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: `${size.size}px`,
                  color: preferences.fontSize === size.id ? '#5DCAA5' : '#D8D6D0',
                }}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Accessibility Toggles */}
      <Section title="♿ Accessibility" description="Features to make the app more comfortable">
        <ToggleSwitch
          label="High Contrast Mode"
          description="Stronger colors for better visibility"
          checked={preferences.highContrast}
          onChange={() => handleToggle('highContrast')}
        />
        <ToggleSwitch
          label="Reduce Motion"
          description="Minimize animations and transitions"
          checked={preferences.reduceMotion}
          onChange={() => handleToggle('reduceMotion')}
        />
        <ToggleSwitch
          label="Large Touch Targets"
          description="96px minimum buttons for easier tapping"
          checked={preferences.touchTarget === 'large'}
          onChange={() => setPreferences({ touchTarget: preferences.touchTarget === 'large' ? 'standard' : 'large' })}
        />
        <ToggleSwitch
          label="Voice Commands"
          description="Enable voice control throughout the app"
          checked={preferences.voiceEnabled}
          onChange={() => handleToggle('voiceEnabled')}
        />
      </Section>

      {/* Data Management */}
      <Section title="💾 Data" description="Manage your settings and data">
        <BigButton onClick={handleExport} variant="secondary" fullWidth style={{ marginBottom: '16px' }}>
          📥 Export Settings
        </BigButton>
        {showExportSuccess && (
          <div
            style={{
              padding: '16px',
              backgroundColor: 'rgba(93,202,165,0.1)',
              border: '1px solid rgba(93,202,165,0.3)',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#5DCAA5',
            }}
          >
            ✅ Settings exported successfully!
          </div>
        )}
      </Section>

      {/* About / Credits */}
      <Section title="💚 About" description="">
        <div
          style={{
            padding: '32px',
            background: 'linear-gradient(135deg, rgba(93,202,165,0.1) 0%, rgba(107,141,214,0.1) 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(93,202,165,0.2)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
          <h3 style={{ fontSize: '24px', color: '#5DCAA5', margin: '0 0 8px 0' }}>
            Chromatica v2.0
          </h3>
          <p style={{ fontSize: '16px', color: '#888', margin: '0 0 16px 0', lineHeight: 1.6 }}>
            Built with love for wife.<br />
            Arthritis-optimized • Voice-enabled • 12-Pillar Certified
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '8px 16px', backgroundColor: 'rgba(93,202,165,0.1)', color: '#5DCAA5', borderRadius: '8px', fontSize: '14px' }}>
              🎤 Voice Commands
            </span>
            <span style={{ padding: '8px 16px', backgroundColor: 'rgba(93,202,165,0.1)', color: '#5DCAA5', borderRadius: '8px', fontSize: '14px' }}>
              ♿ Accessible
            </span>
            <span style={{ padding: '8px 16px', backgroundColor: 'rgba(93,202,165,0.1)', color: '#5DCAA5', borderRadius: '8px', fontSize: '14px' }}>
              🔒 Privacy First
            </span>
          </div>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '24px' }}>
            © 2026 P31 Labs • Made with 💚 in Georgia
          </p>
        </div>
      </Section>
    </div>
  );
};

// Section Component
interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, description, children }) => (
  <div
    style={{
      marginBottom: '32px',
      padding: '24px',
      backgroundColor: '#161920',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}
  >
    <h2 style={{ fontSize: '22px', color: '#D8D6D0', margin: '0 0 8px 0' }}>{title}</h2>
    {description && <p style={{ fontSize: '14px', color: '#666', margin: '0 0 20px 0' }}>{description}</p>}
    {children}
  </div>
);

// Toggle Switch Component
interface ToggleSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label, description, checked, onChange }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}
  >
    <div style={{ flex: 1 }}>
      <label style={{ fontSize: '18px', color: '#D8D6D0', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>{description}</p>
    </div>
    <button
      onClick={onChange}
      style={{
        width: '80px',
        height: '48px',
        backgroundColor: checked ? '#5DCAA5' : 'rgba(255,255,255,0.1)',
        border: 'none',
        borderRadius: '24px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background-color 0.2s',
        padding: '4px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#fff',
          borderRadius: '50%',
          transform: checked ? 'translateX(32px)' : 'translateX(0)',
          transition: 'transform 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  </div>
);

export default Settings;
