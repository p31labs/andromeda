import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMeshStore } from '../stores/meshStore';

export function FamilyCagePanel() {
  const { vertices, edges, getTotalLove, recordLove } = useMeshStore();
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  
  const totalLove = getTotalLove();
  const onlineCount = vertices.filter(v => v.online).length;
  
  return (
    <div className="space-y-4">
      {/* Cage Overview */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">Johnson Family Cage</h2>
            <p className="text-sm text-[#6b7280]">{onlineCount}/4 members online</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-[#a78bfa]">{totalLove} ❤</div>
            <div className="text-xs text-[#6b7280]">Love Ledger</div>
          </div>
        </div>
        
        {/* K4 Visualization */}
        <div className="relative h-48 my-4">
          <svg viewBox="0 0 200 150" className="w-full h-full">
            {/* Edges */}
            {edges.map((edge, i) => {
              const fromVertex = vertices.find(v => v.id === edge.from);
              const toVertex = vertices.find(v => v.id === edge.to);
              if (!fromVertex || !toVertex) return null;
              
              const positions: Record<string, {x: number, y: number}> = {
                'will': { x: 100, y: 30 },
                'sj': { x: 160, y: 100 },
                'wj': { x: 40, y: 100 },
                'christyn': { x: 100, y: 120 }
              };
              
              const from = positions[edge.from];
              const to = positions[edge.to];
              
              return (
                <line
                  key={i}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={Math.abs(edge.loveBalance) > 30 ? '#ef4444' : '#5DCAA5'}
                  strokeWidth={Math.abs(edge.loveBalance) / 20 + 1}
                  opacity={0.6}
                />
              );
            })}
            
            {/* Vertices */}
            {vertices.map((vertex) => {
              const positions: Record<string, {x: number, y: number}> = {
                'will': { x: 100, y: 30 },
                'sj': { x: 160, y: 100 },
                'wj': { x: 40, y: 100 },
                'christyn': { x: 100, y: 120 }
              };
              const pos = positions[vertex.id];
              
              return (
                <g 
                  key={vertex.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedMember(vertex.id)}
                >
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={selectedMember === vertex.id ? 20 : 15}
                    fill={vertex.online ? '#5DCAA5' : '#6b7280'}
                    opacity={vertex.online ? 1 : 0.5}
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 5}
                    textAnchor="middle"
                    fill="#0a0b0d"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {vertex.name.charAt(0)}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y + 30}
                    textAnchor="middle"
                    fill="#e8e8e8"
                    fontSize="10"
                  >
                    {vertex.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      
      {/* Member List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vertices.map(member => (
          <motion.div
            key={member.id}
            className={`glass rounded-xl p-4 cursor-pointer transition-all ${
              selectedMember === member.id ? 'border-[#5DCAA5]/50 bg-[#5DCAA5]/5' : ''
            }`}
            onClick={() => setSelectedMember(member.id)}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                member.online ? 'bg-[#5DCAA5] text-[#0a0b0d]' : 'bg-[#6b7280]'
              }`}>
                {member.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium">{member.name}</div>
                <div className="text-xs text-[#6b7280]">
                  {member.online ? '● Online' : '○ Away'} • {member.role}
                </div>
              </div>
              {member.bioState?.status && member.bioState.status !== 'unknown' && (
                <div className={`px-2 py-1 rounded text-xs ${
                  member.bioState.status === 'green' ? 'bg-[#5DCAA5]/20 text-[#5DCAA5]' :
                  member.bioState.status === 'yellow' ? 'bg-[#fbbf24]/20 text-[#fbbf24]' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {member.bioState.status}
                </div>
              )}
            </div>
            
            {member.bioState && member.bioState.status !== 'unknown' && (
              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div className="text-[#6b7280]">
                  Spoons: <span className="text-[#e8e8e8]">{Math.round((member.bioState.spoons || 0) * 100)}%</span>
                </div>
                <div className="text-[#6b7280]">
                  Ca²⁺: <span className="text-[#e8e8e8]">{member.bioState.calcium?.toFixed(1) || '--'}</span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* Quick Love Action */}
      <div className="glass rounded-xl p-4">
        <h3 className="font-medium mb-3">Record Love</h3>
        <div className="flex flex-wrap gap-2">
          {vertices.filter(v => v.id !== 'will').map(member => (
            <button
              key={member.id}
              onClick={() => recordLove('will', member.id, 5)}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-[#a78bfa]/20 hover:text-[#a78bfa] transition-colors text-sm"
            >
              💝 +5 to {member.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
