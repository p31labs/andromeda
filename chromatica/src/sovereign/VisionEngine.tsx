import React, { useRef, useEffect, useState } from 'react';
import { useSovereignStore } from './useSovereignStore';

export const VisionEngine: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { porosityVisionActive } = useSovereignStore();
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (porosityVisionActive && videoRef.current) {
      setIsInitializing(true);
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsInitializing(false);
          }
        })
        .catch(err => {
          console.error("Vision Engine failed to start:", err);
          setIsInitializing(false);
        });
    } else if (!porosityVisionActive && videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [porosityVisionActive]);

  if (!porosityVisionActive) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 50,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas 
        ref={canvasRef} 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />
      
      <div style={{
        position: 'absolute',
        bottom: '40px',
        padding: '24px',
        background: 'rgba(22, 25, 32, 0.9)',
        borderRadius: '24px',
        border: '2px solid #5DCAA5',
        textAlign: 'center',
        color: '#5DCAA5',
        width: '80%'
      }}>
        <h2 style={{ margin: '0 0 8px 0' }}>K4 Vision Engine</h2>
        <p style={{ margin: 0, opacity: 0.8 }}>Analyzing hair porosity and base levels...</p>
        {isInitializing && <div style={{ marginTop: '10px' }}>Initializing camera...</div>}
      </div>

      <button 
        onClick={() => useSovereignStore.getState().setPorosityVision(false)}
        style={{
          position: 'absolute',
          top: '40px',
          right: '40px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#cc6247',
          color: '#fff',
          border: 'none',
          fontSize: '32px',
          cursor: 'pointer'
        }}
      >
        ✕
      </button>
    </div>
  );
};