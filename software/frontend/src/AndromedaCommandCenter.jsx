        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#0a3d3d]/80 px-3 py-1.5 rounded-full border border-[var(--color-cyan)]/30 backdrop-blur-md">
          <ShieldCheck className="w-4 h-4 text-[var(--color-cyan)]" />
          <span className="text-[10px] font-mono text-[var(--color-cyan)] tracking-widest uppercase">
            className={`flex-1 py-2 text-sm font-mono ${activeTab === 'chat' ? 'bg-[var(--color-cyan)] text-black' : 'text-gray-400 hover:text-white'}`}
