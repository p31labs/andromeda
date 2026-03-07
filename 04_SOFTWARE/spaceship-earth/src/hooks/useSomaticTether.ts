import { useEffect, useRef, useCallback } from 'react';
import { useSovereignStore } from '../sovereign/useSovereignStore';
import { CircularBuffer } from '../services/somaticCircularBuffer';

// ── Types ──

interface BiometricTick {
  type: 'BIOMETRIC_TICK';
  hr: number;
  hrv: number;
  timestamp: number;
}

export interface SomaticState {
  connected: boolean;
  hr: number;
  hrv: number;
  baselineHr: number;
  baselineHrv: number;
  calibrated: boolean;
  stressLevel: 'calm' | 'elevated' | 'acute';
  fawnGuardActive: boolean;
  waveformBuffer: number[];
}

// ── Constants ──

const WS_URL = 'ws://localhost:8080';
const CALIBRATION_SAMPLES = 300;         // 5 min at 1 Hz
const ROLLING_WINDOW = 60;               // 60-second rolling average
const STRESS_HR_FACTOR = 1.20;           // +20% HR
const STRESS_HRV_FACTOR = 0.85;          // -15% HRV
const CONSECUTIVE_STRESS_THRESHOLD = 10; // 10s sustained
const COOLDOWN_MS = 180_000;             // 3-minute cooldown
const CALM_HR_FACTOR = 1.10;             // HR within +10% of baseline = calm
const CALM_CONSECUTIVE = 60;             // 60s sustained calm to clear fawn guard
const SPOON_DRAIN = 2;
const WAVEFORM_SIZE = 120;
const BACKOFF_INITIAL_MS = 1000;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

// ── Hook ──

export function useSomaticTether(): SomaticState {
  const stateRef = useRef<SomaticState>({
    connected: false, hr: 0, hrv: 0,
    baselineHr: 0, baselineHrv: 0, calibrated: false,
    stressLevel: 'calm', fawnGuardActive: false,
    waveformBuffer: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(BACKOFF_INITIAL_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calibrationBuf = useRef(new CircularBuffer<{ hr: number; hrv: number }>(CALIBRATION_SAMPLES));
  const rollingBuf = useRef(new CircularBuffer<{ hr: number; hrv: number }>(ROLLING_WINDOW));
  const waveformBuf = useRef(new CircularBuffer<number>(WAVEFORM_SIZE));

  const consecutiveStressRef = useRef(0);
  const consecutiveCalmRef = useRef(0);
  const cooldownUntilRef = useRef(0);

  const update = useCallback((patch: Partial<SomaticState>) => {
    Object.assign(stateRef.current, patch);
  }, []);

  const processTick = useCallback((tick: BiometricTick) => {
    const { hr, hrv } = tick;
    const store = useSovereignStore.getState();

    // Waveform always records
    waveformBuf.current.push(hr);
    const waveArr = waveformBuf.current.toArray();
    update({ hr, hrv, waveformBuffer: waveArr });
    store.setSomaticHr(hr);
    store.setSomaticHrv(hrv);
    store.setSomaticWaveform(waveArr);

    // Calibration phase: fill baseline buffer
    if (!stateRef.current.calibrated) {
      calibrationBuf.current.push({ hr, hrv });
      if (calibrationBuf.current.length >= CALIBRATION_SAMPLES) {
        const baselineHr = calibrationBuf.current.median((t) => t.hr);
        const baselineHrv = calibrationBuf.current.median((t) => t.hrv);
        update({ calibrated: true, baselineHr, baselineHrv });
        store.setSomaticStatus('active');
      } else {
        store.setSomaticStatus('calibrating');
      }
      return;
    }

    // Rolling window
    rollingBuf.current.push({ hr, hrv });
    const rollingHr = rollingBuf.current.mean((t) => t.hr);
    const rollingHrv = rollingBuf.current.mean((t) => t.hrv);
    const { baselineHr, baselineHrv } = stateRef.current;

    // Stress detection
    const isStressed = rollingHr > baselineHr * STRESS_HR_FACTOR
      && rollingHrv < baselineHrv * STRESS_HRV_FACTOR;

    if (isStressed) {
      consecutiveCalmRef.current = 0;
      consecutiveStressRef.current++;

      if (consecutiveStressRef.current >= CONSECUTIVE_STRESS_THRESHOLD
        && Date.now() > cooldownUntilRef.current) {
        // Fire spoon drain
        const spoons = store.spoons;
        useSovereignStore.setState({ spoons: Math.max(0, spoons - SPOON_DRAIN) });
        cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
        update({ stressLevel: 'acute', fawnGuardActive: true });
        store.setSomaticStatus('stress');
        store.setFawnGuard(true);
        consecutiveStressRef.current = 0;
      } else if (consecutiveStressRef.current >= 3) {
        update({ stressLevel: 'elevated' });
      }
    } else {
      consecutiveStressRef.current = 0;

      // Calm check: HR within baseline +10%
      const isCalm = rollingHr <= baselineHr * CALM_HR_FACTOR;
      if (isCalm && stateRef.current.fawnGuardActive) {
        consecutiveCalmRef.current++;
        if (consecutiveCalmRef.current >= CALM_CONSECUTIVE) {
          update({ stressLevel: 'calm', fawnGuardActive: false });
          store.setSomaticStatus('active');
          store.setFawnGuard(false);
          consecutiveCalmRef.current = 0;
        }
      } else if (isCalm) {
        update({ stressLevel: 'calm' });
        if (store.somaticTetherStatus === 'stress') {
          store.setSomaticStatus('active');
        }
      }
    }
  }, [update]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        update({ connected: true });
        useSovereignStore.getState().setSomaticStatus(
          stateRef.current.calibrated ? 'active' : 'calibrating'
        );
        backoffRef.current = BACKOFF_INITIAL_MS;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as BiometricTick;
          if (data.type === 'BIOMETRIC_TICK') {
            processTick(data);
            backoffRef.current = BACKOFF_INITIAL_MS; // reset on valid message
          }
        } catch { /* ignore malformed messages */ }
      };

      ws.onclose = () => {
        update({ connected: false });
        useSovereignStore.getState().setSomaticStatus('disconnected');
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      scheduleReconnect();
    }
  }, [processTick, update]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, backoffRef.current);
    backoffRef.current = Math.min(backoffRef.current * BACKOFF_MULTIPLIER, BACKOFF_MAX_MS);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      useSovereignStore.getState().setSomaticStatus('disconnected');
      useSovereignStore.getState().setFawnGuard(false);
    };
  }, [connect]);

  return stateRef.current;
}
