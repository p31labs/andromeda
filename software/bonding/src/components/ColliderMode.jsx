 *
export function ColliderMode({

  // Use the GPS hook
  const {
    currentLocation,
    distance,
    isGrounded,
    error: gpsError,
    isTracking,
    startTracking,
  const {
    playP31NMR,
    playNoise,


    const pulseIntensity = getPulseIntensity();



          if (response.ok) {
            setLastTelemetry({
              event: 'grounded',
              timestamp: Date.now()

              <line x1="50" y1="10" x2="20" y2="80" stroke="var(--color-phosphor)" strokeWidth="2" />
              <line x1="50" y1="10" x2="80" y2="80" stroke="var(--color-phosphor)" strokeWidth="2" />
              <line x1="20" y1="80" x2="80" y2="80" stroke="var(--color-phosphor)" strokeWidth="2" />
              <line x1="50" y1="10" x2="50" y2="50" stroke="var(--color-phosphor)" strokeWidth="2" />
              <line x1="20" y1="80" x2="50" y2="50" stroke="var(--color-phosphor)" strokeWidth="2" />
              <line x1="80" y1="80" x2="50" y2="50" stroke="var(--color-phosphor)" strokeWidth="2" />

              {/* Nodes */}
              <circle cx="50" cy="10" r="6" fill="var(--color-phosphor)" />

          <div
            className="signal-fill"
            style={{
              width: `${getSignalStrength()}%`,
              backgroundColor: isGrounded ? 'var(--color-phosphor)' : '#FF6600',
        <button
        <button
        <button
          background: var(--color-phosphor);
        .delta-label { color: var(--color-phosphor); }
          color: var(--color-phosphor);
export default ColliderMode;
