import React, { useRef, useEffect, useCallback } from 'react';
import { useAtmosphere } from './AtmosphereProvider';
import { KarmaEngine } from '../lib/KarmaEngine';

const IFRAME_SRC = 'https://bonding.p31ca.org?phos=true';

export default function BondingSurface() {
  const { spoons, grayRock } = useAtmosphere();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for state updates FROM the BONDING iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from BONDING origin
      if (!event.origin.includes('p31ca.org') && !event.origin.includes('localhost')) return;

      const { type, payload } = event.data || {};

      if (type === 'P31_BONDING_STATE') {
        // BONDING reports LOVE earned — feed it into PHOS karma
        if (payload?.totalLove != null) {
          const currentBalance = KarmaEngine.getBalance();
          const delta = payload.totalLove - currentBalance;
          if (delta > 0) {
            KarmaEngine.addLove(delta, 'BONDING gameplay session');
          }
        }
      }

      if (type === 'P31_MODULE_READY') {
        // BONDING is ready — send passport sync immediately
        sendPassportSync();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [spoons, grayRock]);

  const sendPassportSync = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // Build the cognitive passport payload that BONDING expects
    const passportPayload = {
      type: 'P31_PASSPORT_SYNC',
      payload: {
        data: {
          operatorId: 'phos-operator',
          genesisBlock: 'PHOS-01',
          profile: {
            name: 'PHOS Operator',
            diagnoses: [
              { condition: 'AuDHD', diagnosedAt: '2025-03-18' },
            ],
            cognitiveStyle: 'geometric',
            triggers: ['sensory_overload', 'social_pressure'],
            accommodations: [
              'reduced_motion',
              'low_visual_noise',
              'fawn_guard',
              'spoon_awareness',
            ],
            emergencyProtocol: {
              primaryContact: 'brendaodell54@gmail.com',
              secondaryContact: '',
              medicalNotes: 'Hypoparathyroidism — PTH 1-6 pg/mL. Serum calcium 7.8 mg/dL in crisis.',
            },
          },
          loveLedger: [],
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        signature: {
          signature: 'phos-local-' + Date.now(),
          signedAt: new Date().toISOString(),
          keyId: 'phos-operator-key',
        },
        timestamp: Date.now(),
      },
    };

    iframe.contentWindow.postMessage(passportPayload, '*');
  }, []);

  // Send state sync on spoons/grayRock change
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    // Send the state sync message BONDING can act on
    // (BONDING doesn't have a native listener for this, but the passport
    // sync above carries the same data in the profile.accommodations)
    iframe.contentWindow.postMessage(
      {
        type: 'P31_PASSPORT_SYNC',
        payload: {
          data: {
            operatorId: 'phos-operator',
            genesisBlock: 'PHOS-01',
            profile: {
              name: 'PHOS Operator',
              diagnoses: [
                { condition: 'AuDHD', diagnosedAt: '2025-03-18' },
              ],
              cognitiveStyle: 'geometric',
              triggers: ['sensory_overload', 'social_pressure'],
              accommodations: [
                'reduced_motion',
                'low_visual_noise',
                'fawn_guard',
                'spoon_awareness',
                `spoons:${spoons}`,
                `gray_rock:${grayRock}`,
              ],
              emergencyProtocol: {
                primaryContact: 'brendaodell54@gmail.com',
                secondaryContact: '',
                medicalNotes: 'Hypoparathyroidism — PTH 1-6 pg/mL. Serum calcium 7.8 mg/dL in crisis.',
              },
            },
            loveLedger: [],
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          signature: {
            signature: 'phos-local-' + Date.now(),
            signedAt: new Date().toISOString(),
            keyId: 'phos-operator-key',
          },
          timestamp: Date.now(),
        },
      },
      '*'
    );
  }, [spoons, grayRock]);

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] max-w-5xl mx-auto px-4 mt-20 animate-fade-in">
      <div className="w-full h-full rounded-3xl overflow-hidden backdrop-blur-md bg-black/20 border border-white/10 shadow-[0_0_60px_rgba(255,176,0,0.06)]">
        <iframe
          ref={iframeRef}
          src={IFRAME_SRC}
          className="w-full h-full border-none"
          title="BONDING — P31 Labs Chemistry Game"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="cross-origin-isolated"
        />
      </div>
    </div>
  );
}
