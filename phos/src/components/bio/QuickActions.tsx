import { motion } from 'framer-motion';
import { useBioStore } from '../../lib/bioStore';

export function QuickActions() {
  const { getQMUState } = useBioStore();
  const qmuState = getQMUState();

  const actions = [
    { icon: '🛂', label: 'Passport', href: 'https://p31ca.org/passport' },
    { icon: '💝', label: 'Record Love', onClick: () => console.log('Record love') },
    { icon: '📊', label: 'Bio Log', onClick: () => console.log('Bio log') },
    { icon: '🆘', label: 'Emergency', urgent: true, onClick: () => console.log('Emergency') },
  ];
  
  return (
    <div className="p-4 border-t border-white/5">
      <h3 className="text-sm font-medium text-[#6b7280] mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            className={`p-3 rounded-xl text-center transition-colors ${
              action.urgent 
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30' 
                : 'bg-white/5 hover:bg-white/10 border border-white/5'
            }`}
          >
            <div className="text-xl mb-1">{action.icon}</div>
            <div className="text-xs font-medium">{action.label}</div>
          </motion.button>
        ))}
      </div>
      
      {qmuState !== 'normal' && (
        <div className={`mt-3 p-3 rounded-xl text-sm ${
          qmuState === 'critical' 
            ? 'bg-red-500/20 border border-red-500/30 text-red-400' 
            : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
        }`}>
          <div className="font-bold mb-1">
            {qmuState === 'critical' ? 'Gray Rock Active' : 'Low Energy Mode'}
          </div>
          <div className="text-xs opacity-80">
            Interface adapted to your current bio-state
          </div>
        </div>
      )}
    </div>
  );
}
