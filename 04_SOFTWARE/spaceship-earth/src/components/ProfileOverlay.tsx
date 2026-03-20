/**
 * @file ProfileOverlay — DID wallet + editable user profile panel.
 *
 * Shows:
 *   - Deterministic DIDAvatar (identicon)
 *   - Full DID string (truncated) with copy-to-clipboard button
 *   - UCAN delegation status
 *   - Editable display name (max 64 chars)
 *   - Editable bio (max 280 chars)
 *   - "Generate Identity" button when DID is uninitialized
 *   - "Export DID Key" — copies JWK to clipboard for cross-device portability
 *
 * Profile data persisted to localStorage via profileStore.ts.
 * DID/UCAN state sourced from useSovereignStore.
 */

import { useEffect, useState, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import { DIDAvatar } from './DIDAvatar';
import { loadProfile, saveProfile } from '../services/profileStore';
import { exportKeyJWK } from '../services/genesisIdentity';

function truncateDID(did: string): string {
  if (!did || did === 'UNINITIALIZED') return '—';
  if (did.length <= 32) return did;
  return `${did.slice(0, 16)}…${did.slice(-8)}`;
}

interface ProfileOverlayProps {
  onClose: () => void;
}

export function ProfileOverlay({ onClose }: ProfileOverlayProps) {
  const { didKey, ucanStatus, isGeneratingIdentity, initIdentity } = useSovereignStore(
    useShallow(s => ({
      didKey:               s.didKey,
      ucanStatus:           s.ucanStatus,
      isGeneratingIdentity: s.isGeneratingIdentity,
      initIdentity:         s.initIdentity,
    })),
  );

  const saved = loadProfile();
  const [displayName, setDisplayName] = useState(saved.displayName);
  const [bio,         setBio]         = useState(saved.bio);
  const [copied,      setCopied]      = useState(false);
  const [jwkCopied,   setJwkCopied]   = useState(false);
  const [dirty,       setDirty]       = useState(false);

  const hasDID = didKey !== 'UNINITIALIZED';

  // Persist on change
  useEffect(() => {
    if (!dirty) return;
    const tid = setTimeout(() => {
      saveProfile({ displayName, bio });
      setDirty(false);
    }, 800);
    return () => clearTimeout(tid);
  }, [displayName, bio, dirty]);

  const handleCopyDID = useCallback(async () => {
    if (!hasDID) return;
    try {
      await navigator.clipboard.writeText(didKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [didKey, hasDID]);

  const handleExportJWK = useCallback(async () => {
    try {
      const jwk = await exportKeyJWK();
      await navigator.clipboard.writeText(JSON.stringify(jwk, null, 2));
      setJwkCopied(true);
      setTimeout(() => setJwkCopied(false), 2500);
    } catch {}
  }, []);

  const ucanColor = ucanStatus.startsWith('ERR') ? 'var(--coral)'
    : ucanStatus.includes('GRANTED')              ? 'var(--mint)'
    : 'var(--dim)';

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="User profile"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 340, maxHeight: '90vh', overflowY: 'auto',
          background: 'var(--s1)', border: '1px solid var(--neon-faint)',
          borderRadius: 12, fontFamily: 'var(--font-data)',
          color: 'var(--text)', fontSize: 12,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--neon-ghost)',
        }}>
          <span style={{ color: 'var(--cyan)', fontSize: 11, letterSpacing: 2 }}>SOVEREIGN PROFILE</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            style={{ background: 'none', border: 'none', color: 'var(--dim)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Avatar + DID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <DIDAvatar did={didKey} size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--dim)', fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>DID KEY</div>
              <div style={{
                fontFamily: 'var(--font-data)', fontSize: 10,
                color: hasDID ? 'var(--neon)' : 'var(--dim)',
                wordBreak: 'break-all', marginBottom: 6,
              }}>
                {truncateDID(didKey)}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {hasDID && (
                  <button
                    type="button"
                    onClick={handleCopyDID}
                    style={{
                      background: 'none', border: '1px solid var(--dim2)',
                      borderRadius: 4, color: copied ? 'var(--mint)' : 'var(--dim)',
                      fontSize: 9, padding: '3px 8px', cursor: 'pointer',
                    }}
                  >
                    {copied ? 'COPIED' : 'COPY DID'}
                  </button>
                )}
                {!hasDID && (
                  <button
                    type="button"
                    onClick={() => initIdentity()}
                    disabled={isGeneratingIdentity}
                    style={{
                      background: 'var(--neon-faint)', border: '1px solid var(--cyan)',
                      borderRadius: 4, color: 'var(--cyan)',
                      fontSize: 9, padding: '3px 10px', cursor: 'pointer',
                    }}
                  >
                    {isGeneratingIdentity ? 'GENERATING…' : 'GENERATE IDENTITY'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* UCAN status */}
          <div style={{ marginBottom: 20, padding: '8px 12px', background: 'var(--s2)', borderRadius: 6 }}>
            <div style={{ fontSize: 9, opacity: 0.45, letterSpacing: 2, marginBottom: 4 }}>UCAN STATUS</div>
            <div style={{ color: ucanColor, fontSize: 10, wordBreak: 'break-all' }}>{ucanStatus}</div>
          </div>

          {/* Display name */}
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="p31-display-name" style={{ display: 'block', fontSize: 9, opacity: 0.45, letterSpacing: 2, marginBottom: 6 }}>
              DISPLAY NAME
            </label>
            <input
              id="p31-display-name"
              type="text"
              value={displayName}
              maxLength={64}
              placeholder="Sovereign operator"
              onChange={e => { setDisplayName(e.target.value); setDirty(true); }}
              className="glass-input"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="p31-bio" style={{ display: 'block', fontSize: 9, opacity: 0.45, letterSpacing: 2, marginBottom: 6 }}>
              BIO <span style={{ opacity: 0.4 }}>({bio.length}/280)</span>
            </label>
            <textarea
              id="p31-bio"
              value={bio}
              maxLength={280}
              rows={3}
              placeholder="A few words about your sovereign mission…"
              onChange={e => { setBio(e.target.value); setDirty(true); }}
              className="glass-input"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>

          {/* Export JWK */}
          {hasDID && (
            <button
              type="button"
              onClick={handleExportJWK}
              style={{
                width: '100%', background: 'none',
                border: '1px solid var(--dim2)', borderRadius: 6,
                color: jwkCopied ? 'var(--mint)' : 'var(--dim)',
                fontSize: 10, padding: '10px', cursor: 'pointer', letterSpacing: 1,
              }}
            >
              {jwkCopied ? '✓ JWK KEY COPIED' : 'EXPORT DID KEY (JWK)'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
