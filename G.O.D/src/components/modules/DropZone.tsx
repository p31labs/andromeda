'use client';

import { useFileStore } from '@/lib/store/fileStore';
import { useState, useCallback, useRef } from 'react';
import { useHaptics } from '@/lib/hooks/useHaptics';
import { motion, AnimatePresence } from 'framer-motion';

export function DropZone() {
  const { sendFile, activeTransfers, downloadFile, dismissTransfer } = useFileStore();
  const { trigger } = useHaptics();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      trigger('heavy');
      setIsUploading(true);
      // Process one by one
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          alert('Constitutional Limit: 10MB per file for MVP.');
          continue;
        }
        await sendFile(file);
      }
      setIsUploading(false);
      trigger('success');
    }
  }, [sendFile, trigger]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      trigger('heavy');
      setIsUploading(true);
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          alert('Constitutional Limit: 10MB per file for MVP.');
          continue;
        }
        await sendFile(file);
      }
      setIsUploading(false);
      trigger('success');
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [sendFile, trigger]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col gap-4">
      
      {/* DROP AREA */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          flex-1 border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-black
          ${isDragging 
            ? 'border-cyan-400 bg-cyan-900/30 scale-95 shadow-[0_0_30px_rgba(6,182,212,0.3)]' 
            : 'border-cyan-900/30 bg-transparent text-cyan-900/50 hover:border-cyan-700/50 hover:bg-cyan-950/20'}
        `}
        aria-label="Drop files here or click to select"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-label="File input"
        />
        <div className="text-center pointer-events-none">
          {isUploading ? (
            <div className="animate-pulse text-cyan-400 font-mono tracking-widest text-xs">UPLOADING...</div>
          ) : (
            <>
              <div className="text-2xl mb-2">⇪</div>
              <div className="text-[10px] font-mono tracking-widest uppercase">
                {isDragging ? 'RELEASE TO TRANSMIT' : 'DROP DATA HERE'}
              </div>
              <div className="text-[9px] text-cyan-900/60 mt-1">or click to browse</div>
            </>
          )}
        </div>
      </div>

      {/* INCOMING FILES LIST */}
      {activeTransfers.length > 0 && (
        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {activeTransfers.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-cyan-950/50 border border-cyan-900/50 p-2 rounded flex justify-between items-center"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-cyan-100 truncate font-mono">{file.name}</div>
                  <div className="w-full h-1 bg-black rounded mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${(file.receivedChunks / file.totalChunks) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="ml-2 flex gap-1">
                  {file.isComplete ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadFile(file.id);
                      }}
                      className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-[9px] rounded hover:bg-cyan-500/40 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      aria-label={`Download ${file.name}`}
                    >
                      SAVE
                    </button>
                  ) : (
                    <span className="text-[9px] text-cyan-600 animate-pulse">RX...</span>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissTransfer(file.id);
                    }}
                    className="px-1 text-cyan-800 hover:text-cyan-500 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/50 rounded"
                    aria-label={`Dismiss ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

 match as WebGLLights. 