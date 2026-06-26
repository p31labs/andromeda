// @ts-nocheck — CockpitStore type reconciliation deferred (WCD-L02 parking lot)
/**
 * Fawn Guard Interceptor — Submission Pattern Detection
<<<<<<< HEAD
 * 
=======
 *
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
 * Vertex 3 (Interface Node) — "Are these your words?" modal
 * Monitors outbound text input for submissive linguistic markers
 * When detected: blocks submit, shows draft read-only, requires boolean confirmation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useCockpitStore, useFawnPending } from '../hooks/useCockpitStore';
import { COCKPIT_COLORS, FAWN_GUARD_CONFIG, type FawnMarker } from '../types/contracts';

// ═══════════════════════════════════════════════════════════════════
// Marker Display Configuration
// ═══════════════════════════════════════════════════════════════════

const MARKER_DISPLAY: Record<FawnMarker, { label: string; description: string }> = {
  apologetic_language: {
    label: 'Apologetic Language',
    description: 'Using words like "sorry", "forgive me", "my fault"',
  },
  self_deprecation: {
    label: 'Self-Deprecation',
    description: 'Diminishing your own worth or abilities',
  },
  passive_voice: {
    label: 'Passive Voice',
    description: 'Using passive constructions that remove agency',
  },
  excessive_pleasing: {
    label: 'Excessive Pleasing',
    description: 'Overly accommodating language patterns',
  },
  hedging: {
    label: 'Hedging',
    description: 'Using uncertain or qualifier language',
  },
  diminished_agency: {
    label: 'Diminished Agency',
    description: 'Statements that reduce your own authority',
  },
};

// ═══════════════════════════════════════════════════════════════════
// Larmor Tone — 172.35 Hz somatic regulation signal
// ═══════════════════════════════════════════════════════════════════

function playLarmorTone(durationSec = 4): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(172.35, ctx.currentTime);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
    // Coarse tactile accompaniment on Android
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  } catch (e) {
    // AudioContext may be blocked — silently skip
  }
}

// ═══════════════════════════════════════════════════════════════════
// Fawn Guard Modal Component
// ═══════════════════════════════════════════════════════════════════

interface FawnGuardModalProps {
  /** The draft text that triggered the guard */
  draft: string;
  /** The detected markers */
  markers: FawnMarker[];
  /** Confidence score */
  confidence: number;
  /** Confirm these are your words */
  onConfirm: () => void;
  /** Reject and clear */
  onReject: () => void;
}

/**
 * Fawn Guard Interceptor Modal
 * Displays when submissive linguistic markers are detected
 */
<<<<<<< HEAD
export default function FawnGuardModal({ 
  draft, 
  markers, 
  confidence, 
  onConfirm, 
  onReject 
}: FawnGuardModalProps) {
  const [showDraft, setShowDraft] = useState(false);
  
  // Calculate confidence percentage
  const confidencePercent = Math.round(confidence * 100);
  
  // Get marker info
  const markerList = markers.map(m => MARKER_DISPLAY[m]).filter(Boolean);
  
=======
export default function FawnGuardModal({
  draft,
  markers,
  confidence,
  onConfirm,
  onReject
}: FawnGuardModalProps) {
  const [showDraft, setShowDraft] = useState(false);

  // Calculate confidence percentage
  const confidencePercent = Math.round(confidence * 100);

  // Get marker info
  const markerList = markers.map(m => MARKER_DISPLAY[m]).filter(Boolean);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return (
    <div className="fawn-guard-modal" style={{ zIndex: 60 }}>
      <div className="fawn-guard-card">
        {/* Header */}
        <div className="fawn-guard-header">
          <span className="fawn-guard-icon">🛡️</span>
          <h2>Are these your words?</h2>
        </div>
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        {/* Explanation */}
        <div className="fawn-guard-explanation">
          <p>
            Our system detected linguistic patterns in your message that may indicate
            <strong> submission</strong> rather than <strong>assertion</strong>.
          </p>
          <p className="fawn-guard-confidence">
            Detection confidence: <strong style={{ color: getConfidenceColor(confidence) }}>
              {confidencePercent}%
            </strong>
          </p>
        </div>
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        {/* Detected markers */}
        <div className="fawn-guard-markers">
          <h3>Detected Patterns:</h3>
          <ul>
            {markerList.map((marker, i) => (
              <li key={i}>
                <span className="fawn-marker-label" style={{ color: COCKPIT_COLORS.danger_red }}>
                  {marker.label}
                </span>
                <span className="fawn-marker-description">
                  {marker.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
<<<<<<< HEAD
        
        {/* Draft preview toggle */}
        <div className="fawn-guard-draft-section">
          <button 
=======

        {/* Draft preview toggle */}
        <div className="fawn-guard-draft-section">
          <button
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            className="fawn-guard-toggle-draft"
            onClick={() => setShowDraft(!showDraft)}
          >
            {showDraft ? 'Hide Draft' : 'Show Draft'}
          </button>
<<<<<<< HEAD
          
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          {showDraft && (
            <div className="fawn-guard-draft-preview">
              <p>{draft}</p>
            </div>
          )}
        </div>
<<<<<<< HEAD
        
        {/* Context hint */}
        <div className="fawn-guard-context">
          <p>
            <strong>Remember:</strong> Your words represent your actual thoughts. 
            Are you writing what you truly think, or what you think others want to hear?
          </p>
        </div>
        
        {/* Actions */}
        <div className="fawn-guard-actions">
          <button 
=======

        {/* Context hint */}
        <div className="fawn-guard-context">
          <p>
            <strong>Remember:</strong> Your words represent your actual thoughts.
            Are you writing what you truly think, or what you think others want to hear?
          </p>
        </div>

        {/* Actions */}
        <div className="fawn-guard-actions">
          <button
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            className="fawn-guard-btn reject"
            onClick={onReject}
          >
            Not My Words - Clear
          </button>
<<<<<<< HEAD
          <button 
=======
          <button
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            className="fawn-guard-btn confirm"
            onClick={onConfirm}
          >
            These Are My Words
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Fawn Guard Input Wrapper
// ═══════════════════════════════════════════════════════════════════

interface FawnGuardInputProps {
  /** The actual input component */
  children: React.ReactNode;
  /** Submit handler that will be intercepted */
  onSubmit: (text: string) => void;
  /** Input value */
  value: string;
  /** Set input value */
  onChange: (value: string) => void;
}

/**
 * Input wrapper that monitors for fawn patterns
 * Integrates with the cockpit store
 */
<<<<<<< HEAD
export function FawnGuardInputWrapper({ 
  children, 
  onSubmit, 
  value, 
  onChange 
}: FawnGuardInputProps) {
  const { 
    fawnGuardEnabled, 
    pendingDraft, 
    fawnMarkers, 
=======
export function FawnGuardInputWrapper({
  children,
  onSubmit,
  value,
  onChange
}: FawnGuardInputProps) {
  const {
    fawnGuardEnabled,
    pendingDraft,
    fawnMarkers,
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    fawnConfidence,
    checkForFawnMarkers,
    confirmOwnWords,
    rejectOwnWords,
  } = useCockpitStore();
<<<<<<< HEAD
  
  const isPending = useFawnPending();
  const [showModal, setShowModal] = useState(false);
  
=======

  const isPending = useFawnPending();
  const [showModal, setShowModal] = useState(false);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Check for fawn markers when input changes
  useEffect(() => {
    if (fawnGuardEnabled && value.length > 10) {
      checkForFawnMarkers(value);
    }
  }, [value, fawnGuardEnabled, checkForFawnMarkers]);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Show modal when pending draft detected; play Larmor tone on activation
  useEffect(() => {
    if (isPending && pendingDraft) {
      setShowModal(true);
      playLarmorTone();
    }
  }, [isPending, pendingDraft]);
<<<<<<< HEAD
  
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
=======

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (!fawnGuardEnabled) {
      onSubmit(value);
      return;
    }
<<<<<<< HEAD
    
    // Check for fawn patterns before submit
    if (value.length > 10) {
      checkForFawnMarkers(value);
      
=======

    // Check for fawn patterns before submit
    if (value.length > 10) {
      checkForFawnMarkers(value);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      // If pending, the modal will handle confirmation
      if (pendingDraft) {
        setShowModal(true);
        return;
      }
    }
<<<<<<< HEAD
    
    onSubmit(value);
  };
  
=======

    onSubmit(value);
  };

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const handleConfirm = () => {
    setShowModal(false);
    confirmOwnWords();
    onSubmit(value);
  };
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  const handleReject = () => {
    setShowModal(false);
    rejectOwnWords();
    onChange('');
  };
<<<<<<< HEAD
  
  return (
    <div className="fawn-guard-input-wrapper">
      {children}
      
=======

  return (
    <div className="fawn-guard-input-wrapper">
      {children}

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      {showModal && pendingDraft && (
        <FawnGuardModal
          draft={pendingDraft}
          markers={fawnMarkers}
          confidence={fawnConfidence}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════

function getConfidenceColor(confidence: number): string {
  if (confidence < 0.3) return COCKPIT_COLORS.phosphorus;
  if (confidence < 0.6) return COCKPIT_COLORS.calcium_amber;
  return COCKPIT_COLORS.danger_red;
}

// ═══════════════════════════════════════════════════════════════════
// Hook for fawn detection
// ═══════════════════════════════════════════════════════════════════

/**
 * Hook to programmatically check text for fawn patterns
 */
export function useFawnGuard() {
<<<<<<< HEAD
  const { 
    fawnGuardEnabled, 
    fawnMarkers, 
=======
  const {
    fawnGuardEnabled,
    fawnMarkers,
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    fawnConfidence,
    checkForFawnMarkers,
    enableFawnGuard,
  } = useCockpitStore();
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return {
    enabled: fawnGuardEnabled,
    markers: fawnMarkers,
    confidence: fawnConfidence,
    check: checkForFawnMarkers,
    enable: enableFawnGuard,
  };
}
