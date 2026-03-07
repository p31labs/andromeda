// spaceship-earth/src/components/rooms/BondingRoom.tsx
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
 * Cross-frame communication (LOVE sync) via postMessage in a future WCD.
 */
export function BondingRoom({ url }: Props) {
  return (
    <iframe
      src={url}
      title="BONDING — P31 Labs"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: '#000000',
      }}
      allow="autoplay; fullscreen"
      sandbox="allow-scripts allow-same-origin allow-popups"
    />
  );
}
