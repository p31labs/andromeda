// Copied from culinary-matria, converted from Tailwind to inline styles
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
    <div style={styles.container}>
      <WifiOff style={styles.icon} />
      <span>Offline mode — changes will sync when connected</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    color: '#451a03',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
  icon: {
    width: '16px',
    height: '16px',
  },
};

export default OfflineIndicator;
