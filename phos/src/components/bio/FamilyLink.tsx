import { motion } from 'framer-motion';

interface Props {
  onSelect: (member: string) => void;
}

const FAMILY_MEMBERS = [
  { id: 'will', name: 'Will', relation: 'Partner', status: 'online', loveSent: 47 },
  { id: 'sj', name: 'S.J.', relation: 'Child', status: 'online', loveSent: 32 },
  { id: 'wj', name: 'W.J.', relation: 'Child', status: 'away', loveSent: 28 },
  { id: 'christyn', name: 'Christyn', relation: 'Family', status: 'offline', loveSent: 15 }
];

export function FamilyLink({ onSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full bg-white/5 backdrop-blur-xl rounded-2xl p-4 
                border border-white/10"
    >
      <div className="text-center mb-4">
        <span className="text-xs uppercase tracking-widest text-white/40">
          Family Cage
        </span>
      </div>
      
      <div className="space-y-2">
        {FAMILY_MEMBERS.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member.name)}
            className="w-full flex items-center justify-between p-3 rounded-xl
                     bg-white/5 hover:bg-white/10 transition-all
                     group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                member.status === 'online' ? 'bg-p31-teal animate-pulse' :
                member.status === 'away' ? 'bg-yellow-400' :
                'bg-white/20'
              }`} />
              <div className="text-left">
                <div className="text-white font-medium">{member.name}</div>
                <div className="text-xs text-white/40">{member.relation}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-p31-teal/60">
                💝 {member.loveSent}
              </span>
              <span className="text-white/20 group-hover:text-white/60 transition-colors">
                →
              </span>
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <span className="text-xs text-white/30">
          4 vertices · 6 edges · 1 cage
        </span>
      </div>
    </motion.div>
  );
}
