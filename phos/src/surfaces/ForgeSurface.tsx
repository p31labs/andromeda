/**
 * ForgeSurface.tsx — The Forge (Revenue & Operations Tools).
 *
 * Combines local-first business tools:
 * - Katen POS — Bakery/pop-up point of sale
 * - Retro-Vault — Digital-to-physical marketplace
 * - Warehouse — Inventory management
 *
 * These are Tier 2/Tier 3 revenue vectors for when the operator has
 * physical capacity to execute. All data stored locally via PGLite.
 */

import React, { useState } from 'react';

type ForgeTab = 'pos' | 'vault' | 'warehouse';

interface Props {
  className?: string;
}

export const ForgeSurface: React.FC<Props> = ({ className }) => {
  const [tab, setTab] = useState<ForgeTab>('pos');

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#f59e0b' }}>
            The Forge
          </h1>
          <p className="text-[10px]" style={{ color: '#664422' }}>
            Revenue tools · Local-first POS · Inventory · Marketplace
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-4">
        {([
          { key: 'pos', label: '🧾 POS', },
          { key: 'vault', label: '🏪 Vault' },
          { key: 'warehouse', label: '📦 Warehouse' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 py-2 text-[10px] rounded-lg"
            style={{
              backgroundColor: tab === t.key ? 'rgba(245,158,11,0.15)' : 'transparent',
              border: `1px solid ${tab === t.key ? 'rgba(245,158,11,0.3)' : 'rgba(102,68,34,0.2)'}`,
              color: tab === t.key ? '#f59e0b' : '#664422',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* POS TAB */}
      {tab === 'pos' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,34,0.3)' }}>
            <div className="text-xs mb-3" style={{ color: '#f59e0b' }}>Katen POS — Bakery Mode</div>
            <p className="text-[10px] mb-3" style={{ color: '#664422' }}>
              Local-first point of sale. No payment processor connected.
              Designed for pop-up sales at community events, farmers markets, and craft fairs.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>0</div>
                <div className="text-[9px]" style={{ color: '#664422' }}>Today's Sales</div>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>$0</div>
                <div className="text-[9px]" style={{ color: '#664422' }}>Revenue</div>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}>
                <div className="text-lg font-bold" style={{ color: '#f59e0b' }}>0</div>
                <div className="text-[9px]" style={{ color: '#664422' }}>Items</div>
              </div>
            </div>
            <div className="mt-3 p-2 rounded-lg text-[10px] text-center" style={{ border: '1px dashed rgba(102,68,34,0.3)', color: '#664422' }}>
              Stripe Terminal integration pending. Manual entry mode active.
            </div>
          </div>
        </div>
      )}

      {/* VAULT TAB */}
      {tab === 'vault' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: '#664422' }}>
            Retro-Vault — Digital-to-physical marketplace. List items, manage inventory, fulfill orders.
            Connected to the same CRDT sync layer as the rest of PHOS.
          </p>
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,34,0.3)' }}>
            <div className="text-[10px]" style={{ color: '#f59e0b' }}>Vault Status</div>
            <div className="text-[10px] mt-1" style={{ color: '#664422' }}>
              PGLite marketplace_db not provisioned. Deploy vault worker to enable.
            </div>
          </div>
        </div>
      )}

      {/* WAREHOUSE TAB */}
      {tab === 'warehouse' && (
        <div className="space-y-3">
          <p className="text-xs" style={{ color: '#664422' }}>
            Warehouse — Inventory management. Track stock levels, scan QR codes, manage zones.
          </p>
          <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(10,5,5,0.4)', border: '1px solid rgba(102,68,34,0.3)' }}>
            <div className="text-[10px]" style={{ color: '#f59e0b' }}>Warehouse Status</div>
            <div className="text-[10px] mt-1" style={{ color: '#664422' }}>
              IDB path: idb://p31-warehouse-aj. Connect scanner to begin inventory tracking.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeSurface;
