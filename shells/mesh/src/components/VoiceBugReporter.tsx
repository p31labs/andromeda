import React, { useState, useRef, useCallback } from 'react';
import { Mic, X, Send, Bug, AlertCircle } from 'lucide-react';

export const VoiceBugReporter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);

  const collectLogs = useCallback(() => {
    const systemLogs = [
      `Timestamp: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      `URL: ${window.location.href}`,
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      `Online: ${navigator.onLine}`,
      `Language: ${navigator.language}`,
    ];
    setLogs(systemLogs);
  }, []);

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input not supported in this browser. Please type your report.');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + ' ' + finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
    setIsRecording(true);
    collectLogs();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const submitReport = () => {
    const report = {
      type: 'bug-report',
      app: 'mesh-monitor',
      transcript: transcript.trim() || 'No voice description provided',
      logs,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    const reports = JSON.parse(localStorage.getItem('p31:bug-reports') || '[]');
    reports.push(report);
    localStorage.setItem('p31:bug-reports', JSON.stringify(reports));

    setTranscript('');
    setLogs([]);
    setIsOpen(false);
    alert('Bug report saved. The mesh will process it shortly.');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-9 h-9 rounded-full bg-p31-cyan/10 border border-p31-cyan/30
                   flex items-center justify-center text-p31-cyan hover:bg-p31-cyan/20
                   transition-all hover:scale-110"
        aria-label="Report a bug"
        title="Voice Bug Reporter"
      >
        <Bug className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass rounded-2xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-p31-cyan" />
            <span className="font-medium text-white">Voice Bug Report</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-p31-red/20 border-2 border-p31-red animate-pulse'
                  : 'bg-p31-cyan/20 border-2 border-p31-cyan hover:bg-p31-cyan/30'
              }`}
            >
              <Mic className={`w-6 h-6 ${isRecording ? 'text-p31-red' : 'text-p31-cyan'}`} />
            </button>
          </div>

          <p className="text-center text-sm text-white/50">
            {isRecording ? 'Recording... Click to stop' : 'Tap to start voice input'}
          </p>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Describe the issue you encountered..."
            className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3
                       text-white placeholder:text-white/30 resize-none focus:outline-none
                       focus:border-p31-cyan/50"
          />

          {logs.length > 0 && (
            <div className="p-3 rounded-lg bg-black/30 border border-white/5">
              <div className="flex items-center gap-2 mb-2 text-xs text-white/40">
                <AlertCircle className="w-3 h-3" />
                System context collected
              </div>
              <div className="text-xs text-white/30 font-mono space-y-1">
                {logs.slice(0, 3).map((log, i) => (
                  <div key={i} className="truncate">{log}</div>
                ))}
                {logs.length > 3 && (
                  <div className="text-white/20">+{logs.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submitReport}
            disabled={!transcript.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
};
