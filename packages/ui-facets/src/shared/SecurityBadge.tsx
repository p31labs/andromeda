
import React from 'react';
import { Lock } from 'lucide-react';

export default function SecurityBadge() {
  return (
    <div className="font-mono text-xs text-slate-500 flex items-center gap-2">
      <Lock size={12} />
      <span>SECURED LOCALLY VIA ML-KEM-768</span>
    </div>
  );
}
