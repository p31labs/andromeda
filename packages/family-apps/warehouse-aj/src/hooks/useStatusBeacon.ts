import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';

interface StatusBeaconOptions {
  appName: string;
  appVersion: string;
  deploymentUrl?: string;
  interval?: number;
}

export function useStatusBeacon({
  appName,
  appVersion,
  deploymentUrl,
  interval = 30000,
}: StatusBeaconOptions) {
  const { statusHealth, setStatusHealth } = useAppStore();

  const pingStatus = useCallback(async () => {
    try {
      const response = await fetch('https://p31ca.org/api/mvp-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: appName,
          version: appVersion,
          pillars: 12,
          certified: true,
          health: statusHealth,
          url: deploymentUrl || window.location.origin,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        }),
      });

      return response.ok;
    } catch (err) {
      console.log('Status beacon failed:', err);
      return false;
    }
  }, [appName, appVersion, statusHealth, deploymentUrl]);

  useEffect(() => {
    // Initial ping
    pingStatus();

    // Set up interval
    const timer = setInterval(pingStatus, interval);

    // Ping on visibility change (tab becomes visible)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pingStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pingStatus, interval]);

  return { statusHealth, setStatusHealth, pingStatus };
}

export default useStatusBeacon;
