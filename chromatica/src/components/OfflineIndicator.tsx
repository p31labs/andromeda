/**
 * OfflineIndicator - Arthritis-Optimized Offline Banner
 * Large, visible, clear messaging
 */

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(245, 158, 11, 0.95)',
        color: '#451a03',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '20px', // Arthritis-optimized: 20px
        fontWeight: 600,
      }}
      role="status"
      aria-live="polite"
    >
      <WifiOff style={{ width: 28, height: 28 }} />
      <span>Offline mode — changes will sync when connected</span>
    </div>
  );
}

export default OfflineIndicator;
