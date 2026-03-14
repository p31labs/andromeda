import { useEffect, useRef } from 'react';

export function useSomaticAudio(entropy: number, isEnabled: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const gain1Ref = useRef<GainNode | null>(null);
  const gain2Ref = useRef<GainNode | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend();
      }
      return;
    }

    if (!audioCtxRef.current) {
      const Actx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Actx();
      audioCtxRef.current = ctx;

      // Base Signal: 31P Larmor Resonance (Pure Sine)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 172.35;
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();

      // Fault Signal: Floating Neutral Distortion (Sawtooth)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 172.35;
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();

      osc1Ref.current = osc1;
      osc2Ref.current = osc2;
      gain1Ref.current = gain1;
      gain2Ref.current = gain2;
    }

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const ctx = audioCtxRef.current;
    if (gain1Ref.current && gain2Ref.current && osc2Ref.current) {
      // Modulate audio mathematically based on System Entropy
      const safeEntropy = Math.max(0, Math.min(1, entropy));
      gain1Ref.current.gain.setTargetAtTime(0.05 * (1 - safeEntropy), ctx.currentTime, 0.1);
      gain2Ref.current.gain.setTargetAtTime(0.04 * safeEntropy, ctx.currentTime, 0.1);
      
      const jitter = safeEntropy > 0 ? (Math.random() - 0.5) * 50 * safeEntropy : 0;
      osc2Ref.current.frequency.setTargetAtTime(172.35 + jitter, ctx.currentTime, 0.05);
    }
  }, [entropy, isEnabled]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);
}