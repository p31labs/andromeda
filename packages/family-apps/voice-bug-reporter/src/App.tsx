import React, { useState, useRef } from 'react';

// --- Inline Icons (Lucide replacements for zero-dependency portability) ---
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
const SquareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>;

// --- Main Application Component ---
export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [logs, setLogs] = useState<{id: string, text: string, status: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Simulation of WASM Whisper Transcription Pipeline (Offline)
  const processAudioOffline = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscript('');
    
    // Simulate WASM processing delay based on blob size
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock transcription output
    const mockTranscription = `[Offline Whisper] User reported anomaly. CRDT sync state appears delayed by 12 seconds. System energy load is nominal.`;
    setTranscript(mockTranscription);
    
    // Simulate pushing to PGLite via useSovereignData hook behavior
    const newLog = {
      id: crypto.randomUUID(),
      text: mockTranscription,
      status: 'PGLite: Appended to Local CRDT'
    };
    
    setLogs(prev => [newLog, ...prev]);
    setIsProcessing(false);
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudioOffline(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Release mic
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or unavailable", err);
      setError("Microphone access required for bug reporting.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono p-4 sm:p-8 flex flex-col items-center">
      
      <header className="w-full max-w-2xl text-center mb-12 mt-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-2">Voice Diagnostic Node</h1>
        <p className="text-slate-400">Offline WebAssembly Audio Ingestion</p>
        <div className="mt-4 inline-flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-full border border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs tracking-wider uppercase text-emerald-500">PGLite Engine Active</span>
        </div>
      </header>

      {/* Main Interaction Area - Designed for 1-Spoon State (Zero Typing, Huge Targets) */}
      <div className="w-full max-w-2xl flex flex-col items-center justify-center space-y-8 flex-grow">
        
        {error && (
          <div className="w-full bg-red-950/50 border border-red-500/50 text-red-400 p-4 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            relative flex items-center justify-center w-48 h-48 sm:w-64 sm:h-64 rounded-full transition-all duration-300 shadow-2xl
            ${isProcessing ? 'bg-slate-800 cursor-not-allowed border-4 border-slate-700 text-slate-500' : 
              isRecording ? 'bg-red-500 hover:bg-red-600 border-8 border-red-900 text-white animate-pulse' : 
              'bg-emerald-500 hover:bg-emerald-400 border-8 border-emerald-900 text-slate-950'}
          `}
          aria-label={isRecording ? "Stop Recording" : "Start Recording"}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-10 w-10 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="text-sm font-bold tracking-widest uppercase">Transcribing</span>
            </div>
          ) : isRecording ? (
            <SquareIcon />
          ) : (
            <MicIcon />
          )}
        </button>

        <p className="text-center text-slate-500 max-w-md">
          {isRecording 
            ? "Recording... Tap square to finalize." 
            : "Tap the microphone to generate a local cryptographic diagnostic log via WASM Whisper."}
        </p>

        {/* Local Storage CRDT Feed */}
        <div className="w-full mt-12 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-400 tracking-wider">LOCAL CRDT APPEND LOG</h2>
            <span className="text-xs text-slate-600">OFFLINE MODE</span>
          </div>
          <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
            {logs.length === 0 && !isProcessing && (
              <p className="text-slate-600 text-center text-sm py-4 italic">Ledger empty. Awaiting acoustic input.</p>
            )}
            
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-950 rounded-xl p-4 border border-slate-800/50">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-emerald-300 text-sm">{log.text}</p>
                </div>
                <div className="flex items-center text-xs text-slate-500 space-x-1">
                  <CheckCircleIcon />
                  <span>{log.status}</span>
                  <span className="ml-auto opacity-50">id: {log.id.split('-')[0]}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}