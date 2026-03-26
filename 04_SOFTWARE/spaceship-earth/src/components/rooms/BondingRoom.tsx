// spaceship-earth/src/components/rooms/BondingRoom.tsx
import { useRef, useState } from 'react';
import { usePassportProvider } from '../../hooks/usePassportProvider';

interface Props {
  url: string;
}

/**
 * BONDING runs in an iframe — complete origin isolation.
 * This guarantees:
 * 1. Genesis Block IndexedDB is untouched (origin: bonding.p31ca.org)
 * 2. No shared React state between Spaceship Earth and BONDING
 * 3. Telemetry relay (worker-telemetry.ts) fires independently
 * 4. Daubert chain-of-custody is unbroken
 *
 * Cross-frame communication (LOVE sync) via postMessage.
 * Passport is transmitted via usePassportProvider when iframe signals ready.
 */
export function BondingRoom({ url }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use passport provider to transmit passport to BONDING
  usePassportProvider(iframeRef);

  const handleLoad = () => {
    setIsLoading(false);
    console.log('[BondingRoom] iframe loaded');
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--void)',
          color: 'var(--cyan)',
          fontFamily: 'var(--font-data)',
          zIndex: 10,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="helix-spinner" style={{ width: 32, height: 32, borderWidth: '3px', margin: '0 auto 16px' }} />
            <span style={{ fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.6 }}>
              Loading BONDING...
            </span>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        title="BONDING — P31 Labs"
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'var(--void)',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
        allow="autoplay; fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    </div>
  );
}
