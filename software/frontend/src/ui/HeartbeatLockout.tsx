 *
 * Vertex 3 (Interface Node) — Fullscreen recovery mode
 * When spoons drop below 25%, strip away complex editors and
export default function HeartbeatLockout({
  onDismiss,
  allowEarlyDismiss = false
}: HeartbeatLockoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>();

  const { spoons, maxSpoons, setSpoons } = useCockpitStore();
  const isLocked = useHeartbeatLockout();

  const [phase, setPhase] = useState<typeof PHASES[number]>('inhale');
  const [countdown, setCountdown] = useState(BREATHING_PATTERN.inhale);
  const [canDismiss, setCanDismiss] = useState(allowEarlyDismiss);

  // Calculate recovery target (need 25% to dismiss)
  const recoveryTarget = maxSpoons * 0.25;

  // Phase timing
  useEffect(() => {
    if (!isLocked) return;

    let currentPhase: typeof PHASES[number] = 'inhale';
    setPhase(currentPhase);
    setCountdown(BREATHING_PATTERN.inhale);


    return () => clearInterval(interval);
  }, [isLocked]);

  // Canvas animation
  useEffect(() => {
    if (!isLocked || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;


    let lastTime = performance.now();
    let breathProgress = 0;

    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;


      // Update breath progress
      breathProgress += dt / 12; // 12s full cycle
      if (breathProgress > 1) breathProgress = 0;

      // Determine radius based on phase
      let radius: number;
      const phaseProgress = (breathProgress * 12) % 12;


      // Clear with void color
      ctx.fillStyle = COCKPIT_COLORS.void;
      ctx.fillRect(0, 0, W, H);

      // Draw central orb
      const phaseColor = PHASE_COLORS[phase];
      const rgb = hexToRgb(phaseColor);




        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;


      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);


  // Auto-restore spoons slowly during lockout
  useEffect(() => {
    if (!isLocked) return;


    return () => clearInterval(restoreInterval);
  }, [isLocked, recoveryTarget, setSpoons]);

  if (!isLocked) return null;

  const phaseColor = PHASE_COLORS[phase];
  const canUserDismiss = spoons >= recoveryTarget;

  return (
    <div className="heartbeat-lockout">
      <canvas ref={canvasRef} className="heartbeat-canvas" />

      <div className="heartbeat-content">
        <div className="heartbeat-status">
          <span
          <span


        {(canUserDismiss || allowEarlyDismiss) && (
          <button
