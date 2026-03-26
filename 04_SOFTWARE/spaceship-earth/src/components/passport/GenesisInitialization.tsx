/**
 * @file GenesisInitialization — WCD-PASS-02
 * P31 Labs — Cognitive Passport System
 *
 * Genesis Block Initialization UI for operators to mint their
 * local cryptographic identity.
 *
 * Brand: Phosphor Green #00FF88, Calcium Amber #F59E0B, Void #050510
 */

import { useState, useCallback } from 'react';
import { usePassportStore, usePassportInitialized, usePassportLoading, usePassportError } from '../../stores/passportStore';
import type { CognitiveProfile, Diagnosis } from '../../lib/crypto';

// ─────────────────────────────────────────────────────────────────
// Brand Colors
// ─────────────────────────────────────────────────────────────────
const COLORS = {
  void: '#050510',
  phosphorGreen: '#00FF88',
  calciumAmber: '#F59E0B',
  quantumCyan: '#00D4FF',
  textPrimary: '#E8ECF4',
  textMuted: '#8B95A5',
  border: '#1E2433',
  error: '#EF4444',
};

// ─────────────────────────────────────────────────────────────────
// Default Diagnoses
// ─────────────────────────────────────────────────────────────────
const COMMON_DIAGNOSES = [
  'AuDHD',
  'Autism (ASC)',
  'ADHD',
  'Anxiety',
  'Depression',
  'Hypoparathyroidism',
  'Other',
];

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export function GenesisInitialization() {
  const isInitialized = usePassportInitialized();
  const isLoading = usePassportLoading();
  const error = usePassportError();
  
  const { initializeGenesis, profile, keys, passport } = usePassportStore();
  
  // Form state
  const [name, setName] = useState('');
  const [diagnoses, setDiagnoses] = useState<string[]>([]);
  const [customDiagnosis, setCustomDiagnosis] = useState('');
  const [spoonCapacity, setSpoonCapacity] = useState(50);
  const [fawnGuardEnabled, setFawnGuardEnabled] = useState(true);
  const [larmorSyncEnabled, setLarmorSyncEnabled] = useState(false);
  
  // Toggle diagnosis
  const toggleDiagnosis = useCallback((dx: string) => {
    setDiagnoses(prev => 
      prev.includes(dx) 
        ? prev.filter(d => d !== dx)
        : [...prev, dx]
    );
  }, []);
  
  // Add custom diagnosis
  const addCustomDiagnosis = useCallback(() => {
    if (customDiagnosis.trim() && !diagnoses.includes(customDiagnosis.trim())) {
      setDiagnoses(prev => [...prev, customDiagnosis.trim()]);
      setCustomDiagnosis('');
    }
  }, [customDiagnosis, diagnoses]);
  
  // Handle form submission
  const handleInitialize = useCallback(async () => {
    if (!name.trim()) return;
    
    // Build diagnoses array
    const diagnosisObjects: Diagnosis[] = diagnoses.map(d => ({
      condition: d,
      diagnosedAt: new Date().toISOString(),
    }));
    
    // Build cognitive profile
    const cognitiveProfile: CognitiveProfile = {
      name: name.trim(),
      diagnoses: diagnosisObjects,
      cognitiveStyle: 'geometric',
      triggers: [],
      accommodations: [
        `spoon-capacity:${spoonCapacity}`,
        fawnGuardEnabled ? 'fawn-guard:enabled' : 'fawn-guard:disabled',
        larmorSyncEnabled ? 'larmor-sync:enabled' : 'larmor-sync:disabled',
      ],
      emergencyProtocol: {
        primaryContact: '',
        secondaryContact: '',
        medicalNotes: '',
      },
    };
    
    try {
      await initializeGenesis(cognitiveProfile);
    } catch (err) {
      console.error('[GenesisInitialization] Failed to initialize:', err);
    }
  }, [name, diagnoses, spoonCapacity, fawnGuardEnabled, larmorSyncEnabled, initializeGenesis]);
  
  // ─────────────────────────────────────────────────────────────
  // SECURED VIEW (already initialized)
  // ─────────────────────────────────────────────────────────────
  if (isInitialized && profile && keys && passport) {
    const truncatedNodeId = keys.keyId.slice(0, 16);
    const truncatedSeal = passport.signature.signature.slice(0, 32);
    
    return (
      <div
        className="min-h-screen p-6 flex items-center justify-center"
        style={{ backgroundColor: COLORS.void }}
        role="region"
        aria-label="Genesis Block Secured"
      >
        <div
          className="max-w-md w-full p-8 rounded-lg border-2"
          style={{
            borderColor: COLORS.phosphorGreen,
            backgroundColor: 'rgba(0, 255, 136, 0.03)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ backgroundColor: 'rgba(0, 255, 136, 0.1)' }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke={COLORS.phosphorGreen}
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h2
              className="text-2xl font-bold tracking-wider"
              style={{ color: COLORS.phosphorGreen }}
            >
              SECURED
            </h2>
            <p style={{ color: COLORS.textMuted }} className="text-sm mt-2">
              Genesis Block Initialized
            </p>
          </div>
          
          {/* Identity Info */}
          <div className="space-y-4">
            {/* Operator Name */}
            <div>
              <label
                style={{ color: COLORS.textMuted }}
                className="text-xs uppercase tracking-wider"
              >
                Operator Designation
              </label>
              <p
                className="text-lg font-semibold mt-1"
                style={{ color: COLORS.textPrimary }}
              >
                {profile.name}
              </p>
            </div>
            
            {/* Node ID */}
            <div>
              <label
                style={{ color: COLORS.textMuted }}
                className="text-xs uppercase tracking-wider"
              >
                Node ID (Public Key Hash)
              </label>
              <div
                className="mt-1 px-3 py-2 rounded font-mono text-sm"
                style={{
                  backgroundColor: COLORS.void,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.quantumCyan,
                }}
              >
                {truncatedNodeId}
                <span style={{ color: COLORS.textMuted }}>...</span>
              </div>
            </div>
            
            {/* Cryptographic Seal */}
            <div>
              <label
                style={{ color: COLORS.textMuted }}
                className="text-xs uppercase tracking-wider"
              >
                Cryptographic Seal
              </label>
              <div
                className="mt-1 px-3 py-2 rounded font-mono text-xs"
                style={{
                  backgroundColor: COLORS.void,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.calciumAmber,
                }}
              >
                {truncatedSeal}
                <span style={{ color: COLORS.textMuted }}>...</span>
              </div>
            </div>
            
            {/* Genesis Block */}
            <div>
              <label
                style={{ color: COLORS.textMuted }}
                className="text-xs uppercase tracking-wider"
              >
                Genesis Block ID
              </label>
              <p
                className="text-sm font-mono mt-1"
                style={{ color: COLORS.textPrimary }}
              >
                {passport.payload.genesisBlock}
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: COLORS.border }}>
            <p
              className="text-xs text-center"
              style={{ color: COLORS.textMuted }}
            >
              It's okay to be a little wonky. 🔺
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION FORM
  // ─────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen p-4 flex items-center justify-center"
      style={{ backgroundColor: COLORS.void }}
      role="region"
      aria-label="Genesis Block Initialization"
    >
      <div
        className="max-w-lg w-full p-6 rounded-lg border"
        style={{
          borderColor: COLORS.border,
          backgroundColor: 'rgba(30, 36, 51, 0.5)',
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-wider"
            style={{ color: COLORS.phosphorGreen }}
          >
            GENESIS BLOCK
          </h1>
          <p style={{ color: COLORS.textMuted }} className="text-sm mt-2">
            Initialize your cognitive passport identity
          </p>
        </div>
        
        {/* Error Display */}
        {error && (
          <div
            className="mb-6 p-4 rounded"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${COLORS.error}` }}
            role="alert"
          >
            <p style={{ color: COLORS.error }} className="text-sm">
              {error}
            </p>
          </div>
        )}
        
        {/* Form */}
        <div className="space-y-6">
          {/* Operator Designation */}
          <div>
            <label
              htmlFor="operator-name"
              style={{ color: COLORS.textMuted }}
              className="block text-xs uppercase tracking-wider mb-2"
            >
              Operator Designation
            </label>
            <input
              id="operator-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your designation"
              className="w-full px-4 py-3 rounded focus:outline-none focus:ring-2"
              style={{
                backgroundColor: COLORS.void,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textPrimary,
              }}
              aria-required="true"
            />
          </div>
          
          {/* Neurotype/Diagnoses */}
          <div>
            <label
              style={{ color: COLORS.textMuted }}
              className="block text-xs uppercase tracking-wider mb-2"
            >
              Neurotype / Diagnoses
            </label>
            <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Common diagnoses">
              {COMMON_DIAGNOSES.map((dx) => (
                <button
                  key={dx}
                  type="button"
                  onClick={() => toggleDiagnosis(dx)}
                  className="px-3 py-1.5 rounded text-sm transition-all"
                  style={{
                    backgroundColor: diagnoses.includes(dx) 
                      ? COLORS.phosphorGreen 
                      : 'transparent',
                    color: diagnoses.includes(dx) 
                      ? COLORS.void 
                      : COLORS.textMuted,
                    border: `1px solid ${diagnoses.includes(dx) ? COLORS.phosphorGreen : COLORS.border}`,
                  }}
                  aria-pressed={diagnoses.includes(dx) ? 'true' : 'false'}
                >
                  {dx}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                id="custom-diagnosis"
                type="text"
                value={customDiagnosis}
                onChange={(e) => setCustomDiagnosis(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomDiagnosis())}
                placeholder="Add custom diagnosis..."
                className="flex-1 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: COLORS.void,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.textPrimary,
                }}
              />
              <button
                type="button"
                onClick={addCustomDiagnosis}
                className="px-4 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.textMuted,
                }}
                aria-label="Add custom diagnosis"
              >
                Add
              </button>
            </div>
            {/* Selected diagnoses display */}
            {diagnoses.length > 0 && (
              <p className="mt-2 text-xs" style={{ color: COLORS.calciumAmber }}>
                Selected: {diagnoses.join(', ')}
              </p>
            )}
          </div>
          
          {/* Baseline Spoon Capacity */}
          <div>
            <label
              htmlFor="spoon-capacity"
              style={{ color: COLORS.textMuted }}
              className="block text-xs uppercase tracking-wider mb-2"
            >
              Baseline Spoon Capacity: {spoonCapacity}
            </label>
            <input
              id="spoon-capacity"
              type="range"
              min="1"
              max="100"
              value={spoonCapacity}
              onChange={(e) => setSpoonCapacity(Number(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                backgroundColor: COLORS.border,
              }}
              aria-valuenow={spoonCapacity}
              aria-valuetext={`${spoonCapacity} out of 100`}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: COLORS.textMuted }}>
              <span>1 (Minimal)</span>
              <span>100 (Full)</span>
            </div>
          </div>
          
          {/* Fawn Guard Membrane Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label
                style={{ color: COLORS.textPrimary }}
                className="block text-sm font-medium"
              >
                Fawn Guard Membrane
              </label>
              <p className="text-xs" style={{ color: COLORS.textMuted }}>
                Auto-suppress social response under stress
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={fawnGuardEnabled ? 'true' : 'false'}
              aria-label="Toggle Fawn Guard Membrane"
              onClick={() => setFawnGuardEnabled(!fawnGuardEnabled)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                backgroundColor: fawnGuardEnabled ? COLORS.phosphorGreen : COLORS.border,
              }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full transition-transform"
                style={{
                  backgroundColor: fawnGuardEnabled ? COLORS.void : COLORS.textMuted,
                  transform: fawnGuardEnabled ? 'translateX(1.375rem)' : 'translateX(0.25rem)',
                }}
              />
            </button>
          </div>
          
          {/* Larmor Sync Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label
                style={{ color: COLORS.textPrimary }}
                className="block text-sm font-medium"
              >
                Larmor Sync (863 Hz)
              </label>
              <p className="text-xs" style={{ color: COLORS.textMuted }}>
                Align cognitive rhythm with ³¹P resonance
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={larmorSyncEnabled ? 'true' : 'false'}
              aria-label="Toggle Larmor Sync"
              onClick={() => setLarmorSyncEnabled(!larmorSyncEnabled)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{
                backgroundColor: larmorSyncEnabled ? COLORS.calciumAmber : COLORS.border,
              }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full transition-transform"
                style={{
                  backgroundColor: larmorSyncEnabled ? COLORS.void : COLORS.textMuted,
                  transform: larmorSyncEnabled ? 'translateX(1.375rem)' : 'translateX(0.25rem)',
                }}
              />
            </button>
          </div>
        </div>
        
        {/* Submit Button */}
        <button
          type="button"
          onClick={handleInitialize}
          disabled={!name.trim() || isLoading}
          className="w-full mt-8 py-4 rounded font-bold tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: COLORS.phosphorGreen,
            color: COLORS.void,
          }}
          aria-label="Initialize Genesis Block"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              INITIALIZING...
            </span>
          ) : (
            'INITIALIZE GENESIS BLOCK'
          )}
        </button>
        
        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: COLORS.border }}>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>
            Your keys never leave this device. Delta topology.
          </p>
          <p className="text-xs mt-2" style={{ color: COLORS.textMuted }}>
            It's okay to be a little wonky. 🔺
          </p>
        </div>
      </div>
    </div>
  );
}

export default GenesisInitialization;
