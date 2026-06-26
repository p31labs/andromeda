        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[var(--color-phosphor)] shadow-[0_0_8px_var(--color-phosphor)]' : 'bg-[#EF4444] shadow-[0_0_8px_#EF4444] animate-pulse'}`} />
        <span className={isOnline ? 'text-[var(--color-phosphor)]' : 'text-[#EF4444]'}>
            <div
              key={i}
              className={`w-1.5 h-4 rounded-sm transition-all duration-300 ${
                i < spoons
                  ? 'bg-[#00D4FF] shadow-[0_0_5px_#00D4FF]'
                  : 'bg-[#1f2937]'
              }`}
export default MeshStatus;
