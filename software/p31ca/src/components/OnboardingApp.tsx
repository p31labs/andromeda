/**
 * OnboardingApp.tsx — K₄ Settlement onboarding funnel
 * P31 Labs, Inc. | EIN 42-1888158
 *
 * 7-step progressive disclosure flow:
 * 1. Welcome  → 2. Passport  → 3. Settlement  → 4. Edges  → 5. LOVE  → 6. Graduation  → 7. Dashboard
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { Step } from '../types/onboarding';

const PASSPORT_API = 'https://passport-api.trimtab-signal.workers.dev';
const K4_API = 'https://k4-cage.trimtab-signal.workers.dev';
const LOVE_API = 'https://love-ledger.trimtab-signal.workers.dev';

interface OnboardingState {
  currentStep: number;
  did: string | null;
  settlementId: string | null;
  inviteCode: string | null;
  vertices: string[];
  edges: Array<{ from: string; to: string }>;
  loveBalance: number;
  completed: boolean;
  error: string | null;
}

type Action =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_DID'; did: string }
  | { type: 'SET_SETTLEMENT'; id: string; inviteCode: string }
  | { type: 'ADD_VERTEX'; vertex: string }
  | { type: 'ADD_EDGE'; from: string; to: string }
  | { type: 'SET_LOVE'; balance: number }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'COMPLETE' };

const initialState: OnboardingState = {
  currentStep: 0,
  did: null,
  settlementId: null,
  inviteCode: null,
  vertices: [],
  edges: [],
  loveBalance: 0,
  completed: false,
  error: null,
};

function reduce(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'NEXT':
      return { ...state, currentStep: Math.min(state.currentStep + 1, 6) };
    case 'PREV':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case 'SET_DID':
      return { ...state, did: action.did };
    case 'SET_SETTLEMENT':
      return { ...state, settlementId: action.id, inviteCode: action.inviteCode };
    case 'ADD_VERTEX':
      return { ...state, vertices: [...state.vertices, action.vertex] };
    case 'ADD_EDGE':
      return { ...state, edges: [...state.edges, { from: action.from, to: action.to }] };
    case 'SET_LOVE':
      return { ...state, loveBalance: action.balance };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'COMPLETE':
      return { ...state, completed: true, currentStep: 6 };
    default:
      return state;
  }
}

export function OnboardingApp({ steps }: { steps: Step[] }) {
  const [state, dispatch] = React.useReducer(reduce, initialState);
  const [loading, setLoading] = useState(false);

  const current = steps[state.currentStep] || steps[0];

  useEffect(() => {
    const saved = localStorage.getItem('p31:onboarding:did');
    if (saved && !state.did) {
      dispatch({ type: 'SET_DID', did: saved });
    }
  }, []);

  const handleWelcome = useCallback(() => dispatch({ type: 'NEXT' }), []);

  const handleGeneratePassport = useCallback(async () => {
    setLoading(true);
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const keypair = await crypto.subtle.generateKey(
        {
          name: 'Ed25519',
          namedCurve: 'Ed25519',
        },
        true,
        ['sign', 'verify']
      );

      const publicKeyBuffer = await crypto.subtle.exportKey('spki', keypair.publicKey);
      const publicKeyBytes = new Uint8Array(publicKeyBuffer);
      const rawPubKey = publicKeyBytes.slice(-32);

      const b58 = toBase58(rawPubKey);
      const did = 'did:key:zed01' + b58;

      localStorage.setItem('p31:passport:did', did);
      dispatch({ type: 'SET_DID', did });

      const challengeResp = await fetch(`${PASSPORT_API}/identity/challenge/${encodeURIComponent(did)}`);
      const challengeData = await challengeResp.json();
      const challenge = challengeData.challenge;

      const sig = await crypto.subtle.sign('Ed25519', keypair.privateKey, new TextEncoder().encode(challenge));

      await fetch(`${PASSPORT_API}/identity/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did,
          publicKey: b58,
          challenge,
          signature: bufferToHex(sig),
        }),
      });

      dispatch({ type: 'NEXT' });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e?.message || 'Failed to generate passport' });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateSettlement = useCallback(async (name: string) => {
    setLoading(true);
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const res = await fetch(`${K4_API}/api/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, creatorVertex: 'will', creatorDid: state.did }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      dispatch({ type: 'SET_SETTLEMENT', id: data.settlement.id, inviteCode: data.settlement.inviteCode });
      dispatch({ type: 'ADD_VERTEX', vertex: 'will' });
      dispatch({ type: 'NEXT' });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e?.message || 'Failed to create settlement' });
    } finally {
      setLoading(false);
    }
  }, [state.did]);

  const handleJoinSettlement = useCallback(async (inviteCode: string) => {
    setLoading(true);
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const res = await fetch(`${K4_API}/api/settlement/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, vertex: 'will', did: state.did }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      dispatch({ type: 'SET_SETTLEMENT', id: data.settlement.id, inviteCode });
      dispatch({ type: 'ADD_VERTEX', vertex: 'will' });
      dispatch({ type: 'NEXT' });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e?.message || 'Failed to join settlement' });
    } finally {
      setLoading(false);
    }
  }, [state.did]);

  const handleMintLove = useCallback(async () => {
    setLoading(true);
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      const res = await fetch(`${LOVE_API}/love/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: state.did, amount: 100, memo: 'Welcome to the K₄ Settlement!' }),
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      dispatch({ type: 'SET_LOVE', balance: data.newBalance });
      dispatch({ type: 'NEXT' });
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', error: e?.message || 'Failed to mint LOVE' });
    } finally {
      setLoading(false);
    }
  }, [state.did]);

  const handleGraduate = useCallback(() => {
    dispatch({ type: 'COMPLETE' });
    setTimeout(() => {
      window.location.href = '/phos?surface=GREETING&spoons=3';
    }, 2000);
  }, []);

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              You are leaving the extractive web. You own your data. This takes about 5 minutes. You can pause and resume anytime.
            </p>
            <button onClick={handleWelcome} className="btn-primary">
              Begin →
            </button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-slate-400">{current.description}</p>
            {state.did ? (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded">
                <p className="text-green-400">✓ Passport created</p>
                <p className="text-xs font-mono text-slate-400 mt-2 break-all">{state.did}</p>
                <button onClick={() => dispatch({ type: 'NEXT' })} className="btn-primary mt-4">
                  Continue →
                </button>
              </div>
            ) : (
              <button onClick={handleGeneratePassport} disabled={loading} className="btn-primary">
                {loading ? 'Generating...' : 'Generate Passport'}
              </button>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-slate-400">{current.description}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button onClick={() => { const n = prompt('Settlement name:'); if (n) handleCreateSettlement(n); }}
                      className="p-4 border border-slate-700 rounded hover:border-slate-500 text-left">
                <h3 className="font-bold text-sm">Create New</h3>
                <p className="text-xs text-slate-400 mt-1">Start a new Settlement</p>
              </button>
              <button onClick={() => { const c = prompt('Invite code:'); if (c) handleJoinSettlement(c); }}
                      className="p-4 border border-slate-700 rounded hover:border-slate-500 text-left">
                <h3 className="font-bold text-sm">Join Existing</h3>
                <p className="text-xs text-slate-400 mt-1">Enter an invite code</p>
              </button>
            </div>
            {state.inviteCode && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded">
                <p className="text-green-400">✓ Settled</p>
                <p className="text-xs text-slate-400 mt-1">Code: {state.inviteCode}</p>
                <button onClick={() => dispatch({ type: 'NEXT' })} className="btn-primary mt-4">
                  Continue →
                </button>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-slate-400">{current.description}</p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {['will', 'christyn', 'sj', 'wj'].filter(v => !state.vertices.includes(v)).map(v => (
                <button key={v} onClick={() => dispatch({ type: 'ADD_VERTEX', vertex: v })}
                        className="px-3 py-1.5 text-sm border border-slate-700 rounded hover:border-slate-500">
                  + {v}
                </button>
              ))}
            </div>
            {state.vertices.length >= 1 && (
              <button onClick={() => dispatch({ type: 'NEXT' })} className="btn-primary mt-4">
                Continue →
              </button>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-slate-400">{current.description}</p>
            {state.loveBalance > 0 ? (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded">
                <p className="text-green-400">✓ LOVE minted</p>
                <p className="text-2xl font-bold text-emerald-400">{state.loveBalance} LOVE</p>
                <button onClick={() => dispatch({ type: 'NEXT' })} className="btn-primary mt-4">
                  Continue →
                </button>
              </div>
            ) : (
              <button onClick={handleMintLove} disabled={loading} className="btn-primary">
                {loading ? 'Minting...' : 'Mint Your First LOVE'}
              </button>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-slate-400">{current.description}</p>
            <div className="mt-6 p-6 border border-purple-500/30 bg-purple-950/20 rounded">
              <div className="text-4xl mb-3">🎓</div>
              <h3 className="text-lg font-bold text-purple-300">You are now a citizen</h3>
              <p className="text-sm text-slate-400 mt-2">Your Settlement awaits.</p>
              <button onClick={handleGraduate} className="btn-primary mt-6">
                Enter Your Settlement →
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-slate-400">{current.description}</p>
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded">
              <p className="text-green-400">✓ Onboarding complete!</p>
              <p className="text-sm text-slate-400 mt-2">Redirecting to your dashboard...</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="onboarding-container max-w-2xl mx-auto py-8">
      {state.error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs flex justify-between items-center">
          <span>{state.error}</span>
          <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })} className="text-red-300 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
              i <= state.currentStep ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-slate-700 text-slate-600'
            }`}>
              {i < state.currentStep ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 sm:w-16 h-px mx-1 ${i < state.currentStep ? 'bg-cyan-500/50' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">
          Step {state.currentStep + 1} of {steps.length}
        </p>
        <h1 className="text-2xl font-bold text-slate-200">{current.title}</h1>
      </div>

      <div className="rounded-xl border border-slate-500/20 bg-black/30 p-6">
        {renderStep()}
      </div>
    </div>
  );
}

function toBase58(bytes: Uint8Array): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let num = 0n;
  for (const byte of bytes) num = num * 256n + BigInt(byte);
  let result = '';
  while (num > 0n) {
    const mod = num % 58n;
    result = alphabet[Number(mod)] + result;
    num = num / 58n;
  }
  return result;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}
