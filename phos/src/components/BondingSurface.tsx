import React, { useRef, useEffect } from 'react';
import { useAtmosphere } from './AtmosphereProvider';

const IFRAME_SRC = 'https://bonding.p31ca.org?phos=true';

export default function BondingSurface() {
  const { spoons, grayRock } = useAtmosphere();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage(
      {
        type: 'PHOS_STATE_SYNC',
        payload: { spoons, grayRock },
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
