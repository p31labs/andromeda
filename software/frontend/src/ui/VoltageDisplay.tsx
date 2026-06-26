/**
 * Voltage Score Visualization — Catcher's Mitt Signal Handler
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * Vertex 3 (Interface Node) — Dynamic voltage reactivity
 * Handles LOW (0-30%), MODERATE (30-70%), HIGH (70-100%) thresholds
 */

import { useState, useEffect } from 'react';
import { useCockpitStore } from '../hooks/useCockpitStore';
<<<<<<< HEAD
import { 
  COCKPIT_COLORS, 
  VOLTAGE_THRESHOLDS, 
  getVoltageTier,
  type VoltageTier,
  type CatchersMittSignal 
=======
import {
  COCKPIT_COLORS,
  VOLTAGE_THRESHOLDS,
  getVoltageTier,
  type VoltageTier,
  type CatchersMittSignal
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
} from '../types/contracts';

// ═══════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════

<<<<<<< HEAD
const TIER_CONFIG: Record<VoltageTier, { 
  color: string; 
=======
const TIER_CONFIG: Record<VoltageTier, {
  color: string;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  bgColor: string;
  label: string;
  shake: boolean;
  sequester: boolean;
}> = {
  LOW: {
    color: COCKPIT_COLORS.phosphorus,
    bgColor: 'rgba(0, 255, 136, 0.1)',
    label: 'LOW ENERGY',
    shake: false,
    sequester: false,
  },
  MODERATE: {
    color: COCKPIT_COLORS.calcium_amber,
    bgColor: 'rgba(245, 158, 11, 0.1)',
    label: 'MODERATE ENERGY',
    shake: false,
    sequester: false,
  },
  HIGH: {
    color: COCKPIT_COLORS.danger_red,
    bgColor: 'rgba(239, 68, 68, 0.1)',
    label: 'HIGH ENERGY',
    shake: true,
    sequester: true,
  },
};

// ═══════════════════════════════════════════════════════════════════
// Voltage Display Component
// ═══════════════════════════════════════════════════════════════════

interface VoltageDisplayProps {
  /** Show detailed voltage meter */
  showMeter?: boolean;
  /** Compact mode for HUD */
  compact?: boolean;
  /** Show log history */
  showLog?: boolean;
}

/**
 * Voltage Score Display - Shows current voltage level and tier
 */
<<<<<<< HEAD
export default function VoltageDisplay({ 
  showMeter = true,
  compact = false,
  showLog = false 
=======
export default function VoltageDisplay({
  showMeter = true,
  compact = false,
  showLog = false
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
}: VoltageDisplayProps) {
  const voltageLevel = useCockpitStore(s => s.voltageLevel);
  const voltageLogs = useCockpitStore(s => s.voltageLogs);
  const voltageTier = getVoltageTier(voltageLevel);
  const config = TIER_CONFIG[voltageTier];
<<<<<<< HEAD
  
  const percentage = voltageLevel;
  
=======

  const percentage = voltageLevel;

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Get voltage color based on level
  const getVoltageColor = () => {
    if (percentage <= VOLTAGE_THRESHOLDS.LOW_MAX) return COCKPIT_COLORS.phosphorus;
    if (percentage <= VOLTAGE_THRESHOLDS.MODERATE_MAX) return COCKPIT_COLORS.calcium_amber;
    return COCKPIT_COLORS.danger_red;
  };
<<<<<<< HEAD
  
  const voltageColor = getVoltageColor();
  
=======

  const voltageColor = getVoltageColor();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return (
    <div className={`voltage-display ${compact ? 'compact' : ''}`}>
      {showMeter && (
        <div className="voltage-meter-container">
          <div className="voltage-meter-bar">
<<<<<<< HEAD
            <div 
              className="voltage-meter-fill"
              style={{ 
=======
            <div
              className="voltage-meter-fill"
              style={{
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
                width: `${percentage}%`,
                background: voltageColor,
              }}
            />
            {/* Threshold markers */}
<<<<<<< HEAD
            <div 
=======
            <div
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              className="voltage-threshold"
              style={{ left: `${VOLTAGE_THRESHOLDS.LOW_MAX}%` }}
              title="Low/Moderate threshold"
            />
<<<<<<< HEAD
            <div 
=======
            <div
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              className="voltage-threshold"
              style={{ left: `${VOLTAGE_THRESHOLDS.MODERATE_MAX}%` }}
              title="Moderate/High threshold"
            />
          </div>
        </div>
      )}
<<<<<<< HEAD
      
      <div className="voltage-info" style={{ borderColor: config.color }}>
        <span 
=======

      <div className="voltage-info" style={{ borderColor: config.color }}>
        <span
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          className="voltage-tier-badge"
          style={{ background: config.bgColor, color: config.color }}
        >
          {config.label}
        </span>
        <span className="voltage-value" style={{ color: config.color }}>
          {voltageLevel}%
        </span>
      </div>
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      {showLog && (
        <div className="voltage-log">
          <span className="voltage-log-label">Recent:</span>
          {voltageLogs.slice(-5).map((entry) => (
<<<<<<< HEAD
            <span 
              key={entry.id} 
              className="voltage-log-entry"
              style={{ 
                color: entry.voltage_level <= VOLTAGE_THRESHOLDS.LOW_MAX 
                  ? COCKPIT_COLORS.phosphorus 
                  : entry.voltage_level <= VOLTAGE_THRESHOLDS.MODERATE_MAX
                    ? COCKPIT_COLORS.calcium_amber
                    : COCKPIT_COLORS.danger_red 
=======
            <span
              key={entry.id}
              className="voltage-log-entry"
              style={{
                color: entry.voltage_level <= VOLTAGE_THRESHOLDS.LOW_MAX
                  ? COCKPIT_COLORS.phosphorus
                  : entry.voltage_level <= VOLTAGE_THRESHOLDS.MODERATE_MAX
                    ? COCKPIT_COLORS.calcium_amber
                    : COCKPIT_COLORS.danger_red
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              }}
            >
              {entry.voltage_level}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Voltage Warning Modal (for MODERATE tier)
// ═══════════════════════════════════════════════════════════════════

interface VoltageWarningModalProps {
  signal: CatchersMittSignal;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Voltage Warning Modal - Requires consent for MODERATE tier messages
 */
export function VoltageWarningModal({ signal, onAccept, onDecline }: VoltageWarningModalProps) {
  const [countdown, setCountdown] = useState(5);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return (
    <div className="voltage-warning-modal" style={{ zIndex: 60 }}>
      <div className="voltage-warning-card">
        <div className="voltage-warning-header">
          <span className="voltage-warning-icon">⚠️</span>
          <h2>High Energy Signal Detected</h2>
        </div>
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        <div className="voltage-warning-content">
          <p className="voltage-warning-summary">
            {signal.bluf_summary}
          </p>
<<<<<<< HEAD
          
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          <div className="voltage-warning-score">
            <span>Voltage Score:</span>
            <span style={{ color: TIER_CONFIG.MODERATE.color }}>
              {signal.voltage_score}%
            </span>
          </div>
        </div>
<<<<<<< HEAD
        
        <div className="voltage-warning-actions">
          <button 
=======

        <div className="voltage-warning-actions">
          <button
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            className="voltage-warning-btn decline"
            onClick={onDecline}
            disabled={countdown > 0}
          >
            Process Later
          </button>
<<<<<<< HEAD
          <button 
=======
          <button
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            className="voltage-warning-btn accept"
            onClick={onAccept}
            disabled={countdown > 0}
          >
            {countdown > 0 ? `Wait (${countdown})` : 'Process Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// High Voltage Sequester (for HIGH tier)
// ═══════════════════════════════════════════════════════════════════

interface VoltageSequesterProps {
  signal: CatchersMittSignal;
  onRelease: () => void;
}

/**
 * High Voltage Sequester - Blocks HIGH tier messages with visual feedback
 */
export function VoltageSequester({ signal, onRelease }: VoltageSequesterProps) {
  const [shakeIntensity, setShakeIntensity] = useState(0);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Shake effect for HIGH tier
  useEffect(() => {
    const interval = setInterval(() => {
      setShakeIntensity(Math.random() * 4 - 2);
    }, 50);
    return () => clearInterval(interval);
  }, []);
<<<<<<< HEAD
  
  return (
    <div 
      className="voltage-sequester" 
      style={{ 
=======

  return (
    <div
      className="voltage-sequester"
      style={{
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        zIndex: 60,
        transform: `translate(${shakeIntensity}px, ${shakeIntensity}px)`,
      }}
    >
      <div className="voltage-sequester-overlay">
        <div className="voltage-sequester-card">
          <div className="voltage-sequester-header">
            <span className="voltage-sequester-icon">🚫</span>
            <h2>Message Sequestered</h2>
          </div>
<<<<<<< HEAD
          
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          <div className="voltage-sequester-content">
            <p>
              This message has been temporarily sequestered due to high voltage score.
            </p>
            <p className="voltage-sequester-reason">
              Voltage Score: <strong style={{ color: COCKPIT_COLORS.danger_red }}>
                {signal.voltage_score}%
              </strong>
            </p>
            <p className="voltage-sequester-hint">
              Wait for your cognitive state to stabilize before processing.
            </p>
          </div>
<<<<<<< HEAD
          
          <button 
=======

          <button
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            className="voltage-sequester-btn"
            onClick={onRelease}
          >
            Request Release
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Voltage Signal Processor Hook
// ═══════════════════════════════════════════════════════════════════

/**
 * Hook to process incoming voltage signals from backend
 */
export function useVoltageSignalProcessor() {
  const processVoltageSignal = useCockpitStore(s => s.processVoltageSignal);
  const voltageLevel = useCockpitStore(s => s.voltageLevel);
  const voltageTier = getVoltageTier(voltageLevel);
  const [pendingSignal, setPendingSignal] = useState<CatchersMittSignal | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showSequester, setShowSequester] = useState(false);
<<<<<<< HEAD
  
  const processSignal = (signal: CatchersMittSignal) => {
    // First update the store
    processVoltageSignal(signal);
    
=======

  const processSignal = (signal: CatchersMittSignal) => {
    // First update the store
    processVoltageSignal(signal);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    // Then determine UI response based on tier
    switch (signal.tier) {
      case 'LOW':
        // Render normally - no action needed
        setPendingSignal(null);
        setShowWarning(false);
        setShowSequester(false);
        break;
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      case 'MODERATE':
        // Show warning modal requiring consent
        setPendingSignal(signal);
        setShowWarning(true);
        setShowSequester(false);
        break;
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      case 'HIGH':
        // Sequester the message
        setPendingSignal(signal);
        setShowWarning(false);
        setShowSequester(true);
        break;
    }
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const acceptSignal = () => {
    setShowWarning(false);
    setPendingSignal(null);
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const declineSignal = () => {
    setShowWarning(false);
    setShowSequester(true);
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const releaseSequester = () => {
    setShowSequester(false);
    setPendingSignal(null);
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return {
    currentVoltage: voltageLevel,
    voltageTier,
    pendingSignal,
    showWarning,
    showSequester,
    processSignal,
    acceptSignal,
    declineSignal,
    releaseSequester,
  };
}
