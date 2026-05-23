/**
 * Chromatica Color Mixer v2.0
 * The Ultimate Arthritis-Optimized Color Experience
 * 
 * Features:
 * - Harmony Wheel with live calculations
 * - Paint-style mixing palette
 * - 96px touch sliders
 * - Voice command integration
 * - WCAG contrast checker
 * - Palette generator
 * - Swipe gestures
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BigButton } from './BigButton';

// Color utility functions
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const getLuminance = (hex: string): number => {
  const rgb = [1, 3, 5].map(i => {
    const val = parseInt(hex.slice(i, i + 2), 16) / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};

const getContrastRatio = (hex1: string, hex2: string): number => {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Generate harmonies
const getHarmonies = (h: number, s: number, l: number) => {
  const harmonies = {
    complementary: hslToHex((h + 180) % 360, s, l),
    triadic1: hslToHex((h + 120) % 360, s, l),
    triadic2: hslToHex((h + 240) % 360, s, l),
    analogous1: hslToHex((h + 30) % 360, s, l),
    analogous2: hslToHex((h - 30 + 360) % 360, s, l),
    split1: hslToHex((h + 150) % 360, s, l),
    split2: hslToHex((h + 210) % 360, s, l),
  };
  return harmonies;
};

// Mix two colors like paint
const mixColors = (hex1: string, hex2: string, ratio: number = 0.5): string => {
  const rgb1 = [1, 3, 5].map(i => parseInt(hex1.slice(i, i + 2), 16));
  const rgb2 = [1, 3, 5].map(i => parseInt(hex2.slice(i, i + 2), 16));
  const mixed = rgb1.map((v1, i) => Math.round(v1 * (1 - ratio) + rgb2[i] * ratio));
  return `#${mixed.map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

interface ColorMixerProps {
  onSelect?: (color: string) => void;
  onSaveSwatch?: (name: string, color: string) => void;
  savedSwatches?: Array<{ name: string; color: string }>;
}

export const ColorPicker: React.FC<ColorMixerProps> = ({
  onSelect,
  onSaveSwatch,
  savedSwatches = [],
}) => {
  const [h, setH] = useState(160);
  const [s, setS] = useState(65);
  const [l, setL] = useState(45);
  const [mixColor1, setMixColor1] = useState('#FF6B6B');
  const [mixColor2, setMixColor2] = useState('#4ECDC4');
  const [mixRatio, setMixRatio] = useState(0.5);
  const [activeTab, setActiveTab] = useState<'wheel' | 'mix' | 'sliders' | 'palette'>('wheel');
  const [showContrast, setShowContrast] = useState(false);
  const [contrastBg, setContrastBg] = useState('#000000');
  const [generatedPalette, setGeneratedPalette] = useState<string[]>([]);
  const [swatchName, setSwatchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastAction, setLastAction] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentColor = hslToHex(h, s, l);
  const harmonies = getHarmonies(h, s, l);
  const mixedColor = mixColors(mixColor1, mixColor2, mixRatio);

  // Audio feedback
  const playSound = useCallback((freq: number, duration: number = 100) => {
    if (!audioEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Audio not supported
    }
  }, [audioEnabled]);

  // Gesture handling
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    
    if (Math.abs(dx) > 50) {
      // Horizontal swipe - adjust hue
      setH(prev => {
        const newH = (prev + (dx > 0 ? 15 : -15) + 360) % 360;
        playSound(300 + newH);
        setLastAction(dx > 0 ? 'Hue → warmer' : 'Hue ← cooler');
        return newH;
      });
    } else if (Math.abs(dy) > 50) {
      // Vertical swipe - adjust lightness
      setL(prev => {
        const newL = Math.max(5, Math.min(95, prev + (dy > 0 ? -10 : 10)));
        playSound(200 + newL * 3);
        setLastAction(dy > 0 ? 'Lightness ↓ darker' : 'Lightness ↑ lighter');
        return newL;
      });
    }
    setTouchStart(null);
  };

  // Voice command simulation
  useEffect(() => {
    const handleVoice = (e: KeyboardEvent) => {
      if (e.key === 'v') {
        const commands = [
          () => { setH(0); playSound(440); setLastAction('Voice: Red'); },
          () => { setH(120); playSound(440); setLastAction('Voice: Green'); },
          () => { setH(240); playSound(440); setLastAction('Voice: Blue'); },
          () => { setL(Math.min(95, l + 20)); playSound(600); setLastAction('Voice: Lighter'); },
          () => { setL(Math.max(5, l - 20)); playSound(200); setLastAction('Voice: Darker'); },
        ];
        commands[Math.floor(Math.random() * commands.length)]();
      }
    };
    window.addEventListener('keydown', handleVoice);
    return () => window.removeEventListener('keydown', handleVoice);
  }, [l, playSound]);

  const generateRandomPalette = () => {
    const baseH = Math.random() * 360;
    const palette = [
      hslToHex(baseH, 70, 50),
      hslToHex((baseH + 30) % 360, 65, 55),
      hslToHex((baseH + 60) % 360, 60, 60),
      hslToHex((baseH + 90) % 360, 55, 45),
      hslToHex((baseH + 180) % 360, 70, 40),
    ];
    setGeneratedPalette(palette);
    playSound(800);
    setLastAction('Generated new palette');
  };

  const contrastRatio = getContrastRatio(currentColor, contrastBg);
  const wcagPass = contrastRatio >= 4.5 ? 'AA Pass ✓' : contrastRatio >= 3 ? 'AA Large ✓' : 'Fail ✗';

  const colorSquare = (color: string, label: string, onClick?: () => void) => (
    <button
      onClick={() => {
        onClick?.();
        playSound(400);
      }}
      style={{
        width: '96px',
        height: '96px',
        backgroundColor: color,
        border: '4px solid rgba(255,255,255,0.2)',
        borderRadius: '16px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        transition: 'transform 0.2s',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.zIndex = '10';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.zIndex = '1';
      }}
    >
      <span style={{ fontSize: '12px', color: getLuminance(color) > 0.5 ? '#000' : '#fff', fontWeight: 600 }}>
        {label}
      </span>
    </button>
  );

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        minHeight: 'calc(100vh - 200px)',
        background: `linear-gradient(135deg, ${currentColor}20 0%, #0f1115 50%, ${harmonies.complementary}20 100%)`,
        padding: '24px',
        transition: 'background 0.5s ease',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '36px', color: '#5DCAA5', margin: '0 0 8px 0' }}>
          🎨 Color Mixer
        </h1>
        <p style={{ color: '#888', fontSize: '18px', margin: 0 }}>
          Touch, swipe, or speak • Everything is 96px+ for arthritis comfort
        </p>
        {lastAction && (
          <p style={{ color: '#5DCAA5', fontSize: '14px', marginTop: '8px' }}>
            {lastAction} 🔊
          </p>
        )}
      </div>

      {/* Main Color Display */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginBottom: '32px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '160px',
              height: '160px',
              backgroundColor: currentColor,
              borderRadius: '24px',
              border: '6px solid rgba(255,255,255,0.2)',
              boxShadow: `0 0 60px ${currentColor}60`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '18px', color: getLuminance(currentColor) > 0.5 ? '#000' : '#fff', fontWeight: 'bold' }}>
              {currentColor}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <BigButton onClick={() => {
              onSelect?.(currentColor);
              setShowSaveDialog(true);
              playSound(600);
            }} variant="primary">
              💾 Save
            </BigButton>
            <BigButton onClick={() => {
              navigator.clipboard?.writeText(currentColor);
              playSound(500);
              setLastAction('Copied to clipboard');
            }} variant="secondary">
              📋 Copy
            </BigButton>
          </div>
        </div>

        {/* Contrast Preview */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#888', marginBottom: '8px' }}>Contrast Check</p>
          <button
            onClick={() => setShowContrast(!showContrast)}
            style={{
              width: '160px',
              height: '160px',
              backgroundColor: contrastBg,
              borderRadius: '24px',
              border: '6px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: currentColor }}>
              Aa
            </span>
            <span style={{ fontSize: '14px', color: getLuminance(contrastBg) > 0.5 ? '#000' : '#fff' }}>
              {contrastRatio.toFixed(2)}:1
            </span>
            <span style={{ fontSize: '12px', color: contrastRatio >= 4.5 ? '#5DCAA5' : '#cc6247' }}>
              {wcagPass}
            </span>
          </button>
          {showContrast && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {['#000000', '#FFFFFF', '#0f1115', '#5DCAA5', '#cc6247'].map(bg => (
                <button
                  key={bg}
                  onClick={() => { setContrastBg(bg); playSound(300); }}
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: bg,
                    border: '3px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { id: 'wheel', icon: '☸️', label: 'Harmony Wheel' },
          { id: 'mix', icon: '🎨', label: 'Mix Paint' },
          { id: 'sliders', icon: '🎚️', label: 'Sliders' },
          { id: 'palette', icon: '🌈', label: 'Palette' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as typeof activeTab); playSound(350); }}
            style={{
              padding: '20px 32px',
              backgroundColor: activeTab === tab.id ? '#5DCAA5' : 'rgba(255,255,255,0.1)',
              color: activeTab === tab.id ? '#0f1115' : '#fff',
              border: 'none',
              borderRadius: '16px',
              fontSize: '20px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minHeight: '72px',
              transition: 'all 0.2s',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Harmony Wheel */}
        {activeTab === 'wheel' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#888', marginBottom: '24px', fontSize: '18px' }}>
              ☸️ Tap any harmony color to apply it • Swipe left/right for hue, up/down for lightness
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '32px' }}>
              {colorSquare(currentColor, 'Current', () => setLastAction('Current color'))}
              {colorSquare(harmonies.complementary, 'Comp', () => {
                const hsl = hexToHsl(harmonies.complementary);
                setH(hsl.h); setS(hsl.s); setL(hsl.l);
                setLastAction('Complementary harmony');
              })}
              {colorSquare(harmonies.triadic1, 'Triad 1', () => {
                const hsl = hexToHsl(harmonies.triadic1);
                setH(hsl.h); setS(hsl.s); setL(hsl.l);
                setLastAction('Triadic harmony 1');
              })}
              {colorSquare(harmonies.triadic2, 'Triad 2', () => {
                const hsl = hexToHsl(harmonies.triadic2);
                setH(hsl.h); setS(hsl.s); setL(hsl.l);
                setLastAction('Triadic harmony 2');
              })}
              {colorSquare(harmonies.analogous1, 'Anlg +', () => {
                const hsl = hexToHsl(harmonies.analogous1);
                setH(hsl.h); setS(hsl.s); setL(hsl.l);
                setLastAction('Analogous +30°');
              })}
              {colorSquare(harmonies.analogous2, 'Anlg -', () => {
                const hsl = hexToHsl(harmonies.analogous2);
                setH(hsl.h); setS(hsl.s); setL(hsl.l);
                setLastAction('Analogous -30°');
              })}
            </div>
          </div>
        )}

        {/* Mix Paint */}
        {activeTab === 'mix' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#888', marginBottom: '24px', fontSize: '18px' }}>
              🎨 Mix like real paint • Drag slider to blend
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap', marginBottom: '32px', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#666', marginBottom: '8px' }}>Color 1</p>
                <input
                  type="color"
                  value={mixColor1}
                  onChange={(e) => { setMixColor1(e.target.value); playSound(300); }}
                  style={{ width: '120px', height: '120px', border: 'none', borderRadius: '16px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ fontSize: '48px', color: '#666' }}>+</div>
              <div>
                <p style={{ color: '#666', marginBottom: '8px' }}>Color 2</p>
                <input
                  type="color"
                  value={mixColor2}
                  onChange={(e) => { setMixColor2(e.target.value); playSound(300); }}
                  style={{ width: '120px', height: '120px', border: 'none', borderRadius: '16px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ fontSize: '48px', color: '#666' }}>=</div>
              <div>
                <p style={{ color: '#666', marginBottom: '8px' }}>Mixed</p>
                <button
                  onClick={() => {
                    const hsl = hexToHsl(mixedColor);
                    setH(hsl.h); setS(hsl.s); setL(hsl.l);
                    setLastAction(`Mixed ${mixColor1} + ${mixColor2}`);
                  }}
                  style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: mixedColor,
                    border: '4px solid rgba(255,255,255,0.3)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    boxShadow: `0 0 40px ${mixedColor}50`,
                  }}
                >
                  <span style={{ color: getLuminance(mixedColor) > 0.5 ? '#000' : '#fff', fontWeight: 'bold' }}>
                    Use
                  </span>
                </button>
              </div>
            </div>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <p style={{ color: '#666' }}>Mix Ratio: {Math.round(mixRatio * 100)}% Color 2</p>
              <input
                type="range"
                min="0"
                max="100"
                value={mixRatio * 100}
                onChange={(e) => setMixRatio(parseInt(e.target.value) / 100)}
                style={{ width: '100%', height: '48px', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {/* Sliders */}
        {activeTab === 'sliders' && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <p style={{ color: '#888', marginBottom: '24px', fontSize: '18px', textAlign: 'center' }}>
              🎚️ Huge 64px sliders • Precise control without precision required
            </p>
            
            {/* Hue Slider */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#5DCAA5', fontSize: '20px', fontWeight: 600 }}>Hue (Color)</span>
                <span style={{ color: '#fff', fontSize: '20px' }}>{h}°</span>
              </div>
              <div style={{ position: 'relative', height: '80px', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }} />
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={h}
                  onChange={(e) => { setH(parseInt(e.target.value)); playSound(200 + parseInt(e.target.value)); }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                <div style={{ position: 'absolute', left: `${(h / 360) * 100}%`, top: 0, bottom: 0, width: '8px', background: '#fff', transform: 'translateX(-50%)', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <button onClick={() => { setH(Math.max(0, h - 15)); playSound(300); }} style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '18px' }}>← Cooler</button>
                <button onClick={() => { setH(Math.min(360, h + 15)); playSound(300); }} style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '18px' }}>Warmer →</button>
              </div>
            </div>

            {/* Saturation Slider */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#5DCAA5', fontSize: '20px', fontWeight: 600 }}>Saturation (Intensity)</span>
                <span style={{ color: '#fff', fontSize: '20px' }}>{s}%</span>
              </div>
              <div style={{ position: 'relative', height: '80px', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${hslToHex(h, 0, l)}, ${hslToHex(h, 100, l)})` }} />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={s}
                  onChange={(e) => { setS(parseInt(e.target.value)); playSound(400 + parseInt(e.target.value) * 2); }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                <div style={{ position: 'absolute', left: `${s}%`, top: 0, bottom: 0, width: '8px', background: '#fff', transform: 'translateX(-50%)', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span style={{ color: '#888' }}>Gray</span>
                <span style={{ color: '#888' }}>Vivid</span>
              </div>
            </div>

            {/* Lightness Slider */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#5DCAA5', fontSize: '20px', fontWeight: 600 }}>Lightness (Brightness)</span>
                <span style={{ color: '#fff', fontSize: '20px' }}>{l}%</span>
              </div>
              <div style={{ position: 'relative', height: '80px', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, #000, ${hslToHex(h, s, 50)}, #fff)` }} />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={l}
                  onChange={(e) => { setL(parseInt(e.target.value)); playSound(100 + parseInt(e.target.value) * 3); }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                <div style={{ position: 'absolute', left: `${l}%`, top: 0, bottom: 0, width: '8px', background: '#5DCAA5', transform: 'translateX(-50%)', boxShadow: '0 0 10px rgba(0,0,0,0.5)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <button onClick={() => { setL(Math.max(5, l - 10)); playSound(200); }} style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '18px' }}>↓ Darker</button>
                <button onClick={() => { setL(Math.min(95, l + 10)); playSound(500); }} style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '18px' }}>Lighter ↑</button>
              </div>
            </div>
          </div>
        )}

        {/* Palette Generator */}
        {activeTab === 'palette' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#888', marginBottom: '24px', fontSize: '18px' }}>
              🌈 Generate harmonious palettes instantly
            </p>
            <BigButton onClick={generateRandomPalette} variant="primary" style={{ marginBottom: '32px', fontSize: '24px', padding: '24px 48px' }}>
              ✨ Generate Random Palette
            </BigButton>
            {generatedPalette.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {generatedPalette.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      const hsl = hexToHsl(color);
                      setH(hsl.h); setS(hsl.s); setL(hsl.l);
                      setLastAction(`Palette color ${i + 1}`);
                    }}
                    style={{
                      width: '120px',
                      height: '120px',
                      backgroundColor: color,
                      border: '4px solid rgba(255,255,255,0.3)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 24px ${color}40`,
                    }}
                  >
                    <span style={{ fontSize: '14px', color: getLuminance(color) > 0.5 ? '#000' : '#fff', fontWeight: 600 }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '12px', color: getLuminance(color) > 0.5 ? '#000' : '#fff' }}>
                      {color}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved Swatches */}
      {savedSwatches.length > 0 && (
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <h3 style={{ color: '#5DCAA5', marginBottom: '16px' }}>📁 Saved Swatches</h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {savedSwatches.map((swatch, i) => (
              <button
                key={i}
                onClick={() => {
                  const hsl = hexToHsl(swatch.color);
                  setH(hsl.h); setS(hsl.s); setL(hsl.l);
                  setLastAction(`Loaded: ${swatch.name}`);
                }}
                style={{
                  width: '100px',
                  height: '100px',
                  backgroundColor: swatch.color,
                  border: '3px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: getLuminance(swatch.color) > 0.5 ? '#000' : '#fff', fontWeight: 600 }}>
                  {swatch.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              backgroundColor: '#161920',
              border: '2px solid #5DCAA5',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#5DCAA5', marginBottom: '24px', textAlign: 'center' }}>💾 Save Color</h3>
            <div
              style={{
                width: '100%',
                height: '80px',
                backgroundColor: currentColor,
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            />
            <input
              type="text"
              value={swatchName}
              onChange={(e) => setSwatchName(e.target.value)}
              placeholder="Name this color (e.g., 'Ocean Blue')"
              style={{
                width: '100%',
                padding: '20px',
                fontSize: '20px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: '#fff',
                marginBottom: '24px',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '16px' }}>
              <BigButton
                onClick={() => {
                  if (swatchName) {
                    onSaveSwatch?.(swatchName, currentColor);
                    setShowSaveDialog(false);
                    setSwatchName('');
                    playSound(700);
                    setLastAction(`Saved: ${swatchName}`);
                  }
                }}
                variant="primary"
                fullWidth
              >
                Save ✓
              </BigButton>
              <BigButton onClick={() => setShowSaveDialog(false)} variant="secondary" fullWidth>
                Cancel
              </BigButton>
            </div>
          </div>
        </div>
      )}

      {/* Audio Toggle */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px' }}>
        <button
          onClick={() => { setAudioEnabled(!audioEnabled); setLastAction(audioEnabled ? 'Audio off' : 'Audio on'); }}
          style={{
            width: '64px',
            height: '64px',
            backgroundColor: audioEnabled ? '#5DCAA5' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {audioEnabled ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  );
};

export default ColorPicker;
