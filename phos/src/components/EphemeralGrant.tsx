import React, { useState } from 'react';
import { Shield, CreditCard, FileSignature, CheckCircle } from 'lucide-react';
import type { EphemeralGrantProps } from '../types/phos';

export const EphemeralGrantGateway: React.FC<EphemeralGrantProps> = ({ gatewayToken, dunaName }) => {
  const [step, setStep] = useState<'intro' | 'payment' | 'receipt'>('intro');

  return (
    <div className="flex flex-col items-center justify-center bg-zinc-950 p-6 min-h-[400px]">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 space-y-6">
        <header className="flex flex-col items-center border-b border-zinc-800/50 pb-4">
          <Shield size={32} className="text-emerald-500 mb-2" />
          <div className="font-mono tracking-widest text-zinc-300">{dunaName}</div>
        </header>

        {step === 'intro' && (
          <div className="space-y-4">
            <p className="text-sm font-serif leading-relaxed text-zinc-400 text-center">
              Processing structured entity allocations under legal parameters for Wyoming Nonprofit Associations.
            </p>
            <button onClick={() => setStep('payment')} className="w-full py-4 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 font-mono text-sm rounded-lg flex items-center justify-center gap-2">
              <CreditCard size={18} />
              <span>MOUNT CRYPTOGRAPHIC FIAT TRANSIT</span>
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4 text-center">
            <div className="w-full h-32 border-2 border-dashed border-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-600 bg-zinc-950 rounded-lg">
              [ SECURED ASSET CAPTURE ELEMENT ]
            </div>
            <button onClick={() => setStep('receipt')} className="w-full py-4 bg-zinc-800 text-zinc-300 font-mono text-sm rounded-lg">
              EXECUTE PROXY CONVERSION
            </button>
          </div>
        )}

        {step === 'receipt' && (
          <div className="space-y-4 text-center flex flex-col items-center">
            <CheckCircle size={36} className="text-emerald-500" />
            <div className="font-mono text-xs bg-zinc-950 border border-zinc-800 p-4 rounded w-full text-zinc-400">
              ALLOCATION ATTESTED DIRECTLY TO ENTITY TREASURY
            </div>
            <button className="w-full py-4 bg-zinc-900 text-zinc-300 font-mono text-xs rounded-lg flex items-center justify-center gap-2">
              <FileSignature size={16} />
              <span>DOWNLOAD RECIPIENT CONTRACT PRINCIPLE (PDF)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
