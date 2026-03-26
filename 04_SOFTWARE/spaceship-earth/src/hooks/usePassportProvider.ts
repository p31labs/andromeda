// ═══════════════════════════════════════════════════════════════════
// WCD-PASS-03: The Membrane — Passport Provider (Parent)
// P31 Labs — Cognitive Passport System
//
// Sends cryptographically signed passport to BONDING iframe via postMessage.
// Delta topology: Private key NEVER leaves device, signed payload transmitted.
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';
import { usePassportStore } from '../stores/passportStore';
import type { SignedPassportPayload } from '../lib/crypto';

// ─────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────
const BONDING_ORIGIN = import.meta.env.DEV
  ? 'http://localhost:5188'
  : 'https://bonding.p31ca.org';

// Message types
const MESSAGE_P31_MODULE_READY = 'P31_MODULE_READY';
const MESSAGE_P31_PASSPORT_SYNC = 'P31_PASSPORT_SYNC';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
export interface PassportSyncPayload {
  data: SignedPassportPayload['payload'];
  signature: SignedPassportPayload['signature'];
  timestamp: number;
}

export interface PassportProviderState {
  isConnected: boolean;
  lastSyncTime: number | null;
  syncError: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Hook: usePassportProvider
// ─────────────────────────────────────────────────────────────────
/**
 * Passport Provider Hook — For Spaceship Earth (Parent)
 * 
 * Listens for P31_MODULE_READY from BONDING iframe and responds with
 * P31_PASSPORT_SYNC containing the signed passport payload.
 * 
 * @param iframeRef - React ref to the BONDING iframe element
 */
export function usePassportProvider(
  iframeRef: React.RefObject<HTMLIFrameElement>
): PassportProviderState {
  const passport = usePassportStore((state) => state.passport);
  const isInitialized = usePassportStore((state) => state.isInitialized);
  
  const stateRef = useRef<PassportProviderState>({
    isConnected: false,
    lastSyncTime: null,
    syncError: null,
  });

  // Send passport to iframe
  const sendPassport = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !passport || !isInitialized) {
      console.log('[P31 Provider] Cannot send passport:', {
        hasIframe: !!iframe,
        hasPassport: !!passport,
        isInitialized,
      });
      return;
    }

    const syncPayload: PassportSyncPayload = {
      data: passport.payload,
      signature: passport.signature,
      timestamp: Date.now(),
    };

    // Send to iframe
    iframe.contentWindow?.postMessage(
      {
        type: MESSAGE_P31_PASSPORT_SYNC,
        payload: syncPayload,
      },
      BONDING_ORIGIN
    );

    stateRef.current.lastSyncTime = Date.now();
    stateRef.current.isConnected = true;
    
    console.log('[P31 Provider] State transmitted to iframe:', {
      operatorId: passport.payload.operatorId,
      genesisBlock: passport.payload.genesisBlock,
      totalLove: passport.payload.loveLedger.reduce((sum, e) => sum + e.amount, 0),
      timestamp: syncPayload.timestamp,
    });
  }, [iframeRef, passport, isInitialized]);

  // Listen for P31_MODULE_READY from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin - NEVER trust messages without origin check
      if (event.origin !== BONDING_ORIGIN) {
        return;
      }

      // Validate message type
      if (event.data?.type !== MESSAGE_P31_MODULE_READY) {
        return;
      }

      console.log('[P31 Provider] Received P31_MODULE_READY from iframe');
      
      // Respond with passport sync
      sendPassport();
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [sendPassport]);

  // Also allow manual re-sync via exposed function
  useEffect(() => {
    // Auto-sync when passport becomes available
    if (passport && isInitialized && stateRef.current.isConnected) {
      // Debounce: only re-sync if more than 5 minutes since last sync
      const timeSinceLastSync = Date.now() - (stateRef.current.lastSyncTime ?? 0);
      if (timeSinceLastSync > 5 * 60 * 1000) {
        sendPassport();
      }
    }
  }, [passport, isInitialized, sendPassport]);

  return stateRef.current;
}

// ─────────────────────────────────────────────────────────────────
// Export for external use
// ─────────────────────────────────────────────────────────────────
export { MESSAGE_P31_MODULE_READY, MESSAGE_P31_PASSPORT_SYNC };
