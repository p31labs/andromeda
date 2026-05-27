import React, { useState } from 'react';

interface DonationCtaProps {
  isOpen: boolean;
  onClose: () => void;
  surfaceContext: string;
}

const PRESETS = [5, 10, 25, 50];

export default function DonationCta({ isOpen, onClose, surfaceContext }: DonationCtaProps) {
  const [loading, setLoading] = useState(false);
  const [isMonthly, setIsMonthly] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDonate = async () => {
    setError('');
    const dollars = selectedAmount || parseFloat(customAmount);
    if (!dollars || isNaN(dollars) || dollars < 1) {
      setError('Minimum donation is $1');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://donate-api.trimtab-signal.workers.dev/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(dollars * 100),
          currency: 'usd',
          mode: isMonthly ? 'monthly' : 'once',
          successUrl: 'https://phosphorus31.org/donate?success=1',
          cancelUrl: 'https://phosphorus31.org/donate',
          p31_subject_id: localStorage.getItem('phos_site_id') || undefined,
          source: surfaceContext,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Checkout failed (${response.status}): ${body}`);
      }

      const { sessionId } = await response.json() as { sessionId: string };
      const stripeUrl = `https://checkout.stripe.com/c/pay/${sessionId}`;
      window.location.href = stripeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment pipe failed. Try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-2xl border relative p-6" style={{ backgroundColor: '#0a0a0f', borderColor: '#1e293b' }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sm"
          style={{ color: '#64748b' }}
        >
          [×]
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">♥</span>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: '#f1f5f9' }}>
            SUSTAIN THE CAGE
          </h2>
        </div>

        <p className="text-sm mb-6 leading-relaxed" style={{ color: '#64748b' }}>
          P31 runs local, async, zero-telemetry. Keep the calcium cage powered.
        </p>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg mb-4" style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
          <button
            onClick={() => setIsMonthly(true)}
            className="py-2 text-xs font-bold rounded-md transition-all"
            style={{
              backgroundColor: isMonthly ? '#4c1d95' : 'transparent',
              color: isMonthly ? '#c084fc' : '#64748b',
              border: isMonthly ? '1px solid #5b21b6' : '1px solid transparent',
            }}
          >
            MONTHLY
          </button>
          <button
            onClick={() => setIsMonthly(false)}
            className="py-2 text-xs font-bold rounded-md transition-all"
            style={{
              backgroundColor: !isMonthly ? '#1e293b' : 'transparent',
              color: !isMonthly ? '#e2e8f0' : '#64748b',
              border: !isMonthly ? '1px solid #334155' : '1px solid transparent',
            }}
          >
            ONE-TIME
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {PRESETS.map((amount) => (
            <button
              key={amount}
              onClick={() => { setSelectedAmount(amount); setCustomAmount(''); }}
              className="py-3 rounded-lg text-sm font-bold transition-all"
              style={{
                backgroundColor: selectedAmount === amount ? '#1e1b4b' : '#0f172a',
                color: selectedAmount === amount ? '#c084fc' : '#64748b',
                border: `1px solid ${selectedAmount === amount ? '#5b21b6' : '#1e293b'}`,
              }}
            >
              ${amount}
            </button>
          ))}
        </div>

        <div className="relative mb-6">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}>$</span>
          <input
            type="number"
            placeholder="Custom"
            value={customAmount}
            onChange={(e) => { setSelectedAmount(null); setCustomAmount(e.target.value); }}
            className="w-full py-3 pl-7 pr-4 text-sm rounded-lg"
            style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }}
          />
        </div>

        {error && (
          <p className="text-xs mb-4" style={{ color: '#ef4444' }}>{error}</p>
        )}

        <button
          onClick={handleDonate}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          style={{
            backgroundColor: loading ? '#6b21a8' : '#7c3aed',
            color: '#f5f3ff',
          }}
        >
          {loading ? 'ROUTING…' : '♥ SUPPORT P31'}
        </button>
      </div>
    </div>
  );
}
