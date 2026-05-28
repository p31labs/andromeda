import React, { useMemo, useState } from 'react';
import { Calculator, Receipt } from 'lucide-react';
import type { LaborEvent } from '../types/phos';

const FMV_RATES = {
  vault_maintenance: { ratePerHour: 65, minutesPerAction: 15, title: 'Cryptographic Architecture Audits' },
  security_audit: { ratePerHour: 85, minutesPerAction: 30, title: 'Systems Infrastructure Defense' },
  data_ingestion: { ratePerHour: 45, minutesPerAction: 10, title: 'Evidentiary Chain Processing' },
};

export const TheLedger: React.FC<{ laborEvents: LaborEvent[]; dunaName: string }> = ({ laborEvents, dunaName }) => {
  const [isMinting, setIsMinting] = useState(false);

  const comp = useMemo(() => {
    let totalValue = 0;
    let totalMinutes = 0;
    const breakdown = laborEvents.reduce((acc, event) => {
      const metrics = FMV_RATES[event.actionType];
      const val = (metrics.ratePerHour / 60) * metrics.minutesPerAction;
      totalValue += val;
      totalMinutes += metrics.minutesPerAction;
      if (!acc[event.actionType]) acc[event.actionType] = { count: 0, value: 0, title: metrics.title };
      acc[event.actionType].count += 1;
      acc[event.actionType].value += val;
      return acc;
    }, {} as Record<string, { count: number; value: number; title: string }>);
    return { totalValue, totalMinutes, breakdown };
  }, [laborEvents]);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 p-6 space-y-6">
      <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-6 flex flex-col items-center">
        <span className="text-zinc-500 font-mono text-xs mb-2 flex items-center gap-2"><Calculator size={14} /> ACCOUNT LIABILITY RECORDED</span>
        <span className="text-4xl font-mono text-indigo-300">${comp.totalValue.toFixed(2)}</span>
      </div>
      <div className="flex-grow space-y-3 overflow-y-auto">
        {Object.entries(comp.breakdown).map(([key, data]) => (
          <div key={key} className="flex justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg text-sm font-mono">
            <div>
              <div className="text-zinc-300">{data.title}</div>
              <div className="text-[10px] text-zinc-500 mt-1">{data.count} ATTESTED SUBMISSIONS</div>
            </div>
            <span className="text-emerald-400">${data.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <button
        disabled={isMinting || laborEvents.length === 0}
        onClick={() => { setIsMinting(true); setTimeout(() => setIsMinting(false), 2000); }}
        className="w-full py-4 bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono rounded-lg flex items-center justify-center gap-2"
      >
        <Receipt size={18} />
        <span>{isMinting ? 'SEALING IMMUTABLE SETTLEMENT...' : 'COMPILE COMPENSABLE INVOICE'}</span>
      </button>
    </div>
  );
};
