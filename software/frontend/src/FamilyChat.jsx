        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-cyan); }
        .e2ee-badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #0a3d3d; color: var(--color-cyan); }
              <h2 className="text-[var(--color-cyan)] font-bold tracking-widest text-sm">K⁴ CONVERSATIONS</h2>
                className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${currentConv === conv.id ? 'bg-[var(--color-cyan)]/10 border-l-2 border-[var(--color-cyan)]' : 'hover:bg-white/5'}`}
              className="w-full text-xs text-[var(--color-cyan)] hover:bg-[var(--color-cyan)]/10 rounded px-2 py-1 transition-colors"
                      <div className={`w-2 h-2 rounded-full ${presence[user] === 'online' ? 'bg-[var(--color-cyan)] shadow-[0_0_8px_var(--color-cyan)]' : 'bg-gray-600'}`} />
                        {msg.senderId} {isEncrypted && <span className="text-[var(--color-cyan)]">🔒</span>}
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl max-w-[70%] text-sm ${isMe ? 'bg-[var(--color-cyan)] text-[#050508] rounded-br-sm font-medium' : 'bg-[#12121a] border border-[#1a1a24] rounded-bl-sm shadow-md'}`}>
                    className="flex-1 bg-[#050508] border border-[#1a1a24] rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-[var(--color-cyan)] transition-colors"
                    className="bg-[var(--color-cyan)] text-[#050508] font-bold tracking-widest px-6 py-2.5 rounded-full text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3ca394] transition-colors"
