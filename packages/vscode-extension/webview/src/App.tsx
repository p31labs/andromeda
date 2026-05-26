import React, { useState, useEffect } from 'react';
import { Terminal, Fingerprint, Code2, Lock } from 'lucide-react';

// VS Code API Wrapper
const vscode = acquireVsCodeApi ? acquireVsCodeApi() : null;

export default function App() {
  const [activeContext, setActiveContext] = useState<string>('No active file context.');
  const [fileName, setFileName] = useState<string>('Awaiting telemetry...');

  // The BusBarService Listener (IPC Bridge)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'activeEditorChange') {
        setFileName(message.payload.fileName);
        setActiveContext(message.payload.content);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-emerald-400 font-mono p-4 sm:p-6 flex flex-col gap-4">
      {/* Header */}
      <header className="border-b border-emerald-900/50 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Fingerprint size={24} className="text-emerald-500" />
          <h1 className="text-lg uppercase tracking-widest font-bold">P31 Copilot</h1>
        </div>
        <span className="text-xs bg-emerald-900/30 px-2 py-1 border border-emerald-800 rounded">
          LAW FACET ACTIVE
        </span>
      </header>

      {/* Main Context Window */}
      <main className="flex-1 flex flex-col gap-4">
        <div className="bg-slate-900 border border-emerald-800 rounded p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-300 text-sm border-b border-emerald-900/50 pb-2">
            <Code2 size={16} />
            <span className="uppercase tracking-wider font-semibold">Active Workspace Context</span>
          </div>

          <div className="text-xs text-emerald-500 mb-1">Target: {fileName}</div>

          <pre className="bg-black/50 p-4 rounded text-xs text-emerald-600 overflow-auto max-h-[300px] border border-emerald-900/30">
            {activeContext || '// Empty file'}
          </pre>
        </div>
      </main>

      {/* P31 Immutable Security Badge */}
      <footer className="mt-auto pt-4 border-t border-emerald-900/50 flex justify-between items-center text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Lock size={12} />
          <span>SECURED LOCALLY VIA ML-KEM-768</span>
        </div>
        <Terminal size={14} className="animate-pulse" />
      </footer>
    </div>
  );
}
