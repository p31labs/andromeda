import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { WebRTCSync } from '../shared/network/WebRTCSync';
import { usePGLite } from './PGLiteProvider';

interface SyncContextType {
  sync: WebRTCSync | null;
  syncState: string;
  broadcast: (table: string, payload: any) => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const db = usePGLite();
  const [syncState, setSyncState] = useState('disconnected');
  const syncRef = useRef<WebRTCSync | null>(null);

  useEffect(() => {
    if (!syncRef.current && db) {
      syncRef.current = new WebRTCSync(db, {
        onConnectionStateChange: (state) => setSyncState(state),
      });
    }
  }, [db]);

  const broadcast = (table: string, payload: any) => {
    syncRef.current?.broadcastSync(table, payload);
  };

  return (
    <SyncContext.Provider value={{ sync: syncRef.current, syncState, broadcast }}>
      {children}
    </SyncContext.Provider>
  );
};