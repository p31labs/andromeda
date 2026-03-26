/**
 * @file FisherEscolaQDashboard.tsx
 * @brief Enhanced Telemetry Dashboard with Fisher-Escolà Q-Factor Visualization
 * 
 * P31 Labs — Spaceship Earth
 * WCD-DE03: Fisher-Escolà Q Visualization
 * 
 * Displays real-time coherence metrics based on the Fisher-Escolà Q distribution:
 * - Q > 0.4: Stable state (blue pulses, tetrahedral grid)
 * - Q < 0.4: Decoherence state (chromatic aberration, deformation)
 * 
 * Integrates with existing telemetry services.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSovereignStore } from '../sovereign/useSovereignStore';

// Fisher-Escolà Q threshold constants
const Q_STABLE_THRESHOLD = 0.4;
const Q_CRITICAL_THRESHOLD = 0.25;

// Weight factors for Q calculation
const WEIGHT_ENERGY = 0.25;    // Cognitive energy
const WEIGHT_TASKS = 0.25;     // Task completion
const WEIGHT_ENVIRONMENT = 0.25; // Environmental fit
const WEIGHT_CREATION = 0.25;  // Creative output

interface QMetrics {
  qFactor: number;
  energy: number;
  tasks: number;
  environment: number;
  creation: number;
  timestamp: number;
  state: 'stable' | 'warning' | 'critical';
}

interface CoherenceHistory {
  timestamps: number[];
  qFactors: number[];
  states: string[];
}

export function FisherEscolaQDashboard() {
  const [metrics, setMetrics] = useState<QMetrics | null>(null);
  const [history, setHistory] = useState<CoherenceHistory>({
    timestamps: [],
    qFactors: [],
    states: [],
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Get sovereign store values
  const spoons = useSovereignStore((s) => s.spoons);
  const coherence = useSovereignStore((s) => s.coherence);
  const noiseFloor = useSovereignStore((s) => s.noiseFloor);
  const tier = useSovereignStore((s) => s.tier);

  // Calculate Q factor from available data
  const calculateQ = useCallback((): QMetrics => {
    const now = Date.now();
    
    // Normalize spoon count (0-12) to 0-1 range
    const normalizedEnergy = Math.min(spoons, 12) / 12;
    
    // Calculate task completion from tier (approximation)
    const taskMap: Record<string, number> = {
      FULL: 1.0,
      LIMITED: 0.75,
      MINIMAL: 0.5,
      RESTRICTED: 0.25,
    };
    const normalizedTasks = taskMap[tier] || 0.5;
    
    // Environment based on coherence (0-100 normalized)
    const normalizedEnvironment = Math.min(Math.max(coherence / 100, 0), 1);
    
    // Creation factor based on noise floor inverse (higher = more focused)
    const normalizedCreation = normalizedEnergy * normalizedTasks * (1 - (noiseFloor || 0) / 100) * 0.8;
    
    // Calculate Q using weighted formula
    const qFactor = (
      normalizedEnergy * WEIGHT_ENERGY +
      normalizedTasks * WEIGHT_TASKS +
      normalizedEnvironment * WEIGHT_ENVIRONMENT +
      normalizedCreation * WEIGHT_CREATION
    );
    
    // Determine state based on Q threshold
    let state: 'stable' | 'warning' | 'critical';
    if (qFactor >= Q_STABLE_THRESHOLD) {
      state = 'stable';
    } else if (qFactor >= Q_CRITICAL_THRESHOLD) {
      state = 'warning';
    } else {
      state = 'critical';
    }
    
    return {
      qFactor,
      energy: normalizedEnergy,
      tasks: normalizedTasks,
      environment: normalizedEnvironment,
      creation: normalizedCreation,
      timestamp: now,
      state,
    };
  }, [spoons, coherence, noiseFloor, tier]);

  // Update metrics every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newMetrics = calculateQ();
      setMetrics(newMetrics);
      
      setHistory((prev) => {
        const newHistory = { ...prev };
        
        // Add new data point
        newHistory.timestamps.push(newMetrics.timestamp);
        newHistory.qFactors.push(newMetrics.qFactor);
        newHistory.states.push(newMetrics.state);
        
        // Keep only last 60 samples (1 minute)
        if (newHistory.timestamps.length > 60) {
          newHistory.timestamps.shift();
          newHistory.qFactors.shift();
          newHistory.states.shift();
        }
        
        return newHistory;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [calculateQ]);

  // Get state color based on Q factor
  const getStateColor = useCallback((q: number): string => {
    if (q >= Q_STABLE_THRESHOLD) {
      return '#00FF88'; // Phosphor Green - stable
    } else if (q >= Q_CRITICAL_THRESHOLD) {
      return '#F59E0B'; // Calcium Amber - warning
    } else {
      return '#EF4444'; // Danger Red - critical
    }
  }, []);

  // Render the Q gauge
  const renderQGauge = () => {
    if (!metrics) return null;
    
    const percentage = Math.min(metrics.qFactor * 100, 100);
    const color = getStateColor(metrics.qFactor);
    
    return (
      <div className="q-gauge">
        <svg viewBox="0 0 200 120" className="q-gauge-svg">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Q factor arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${percentage * 2.51} 251`}
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
          />
          
          {/* Threshold markers */}
          <circle cx="100" cy="20" r="4" fill={getStateColor(Q_STABLE_THRESHOLD)} />
          <circle cx="140" cy="25" r="4" fill={getStateColor(Q_CRITICAL_THRESHOLD)} />
          
          {/* Q value text */}
          <text x="100" y="85" textAnchor="middle" fill={color} fontSize="28" fontWeight="bold">
            {metrics.qFactor.toFixed(2)}
          </text>
          <text x="100" y="105" textAnchor="middle" fill="#888" fontSize="12">
            Q-Factor
          </text>
        </svg>
        
        {/* State label */}
        <div className="q-state-label" style={{ color }}>
          {metrics.state.toUpperCase()}
        </div>
      </div>
    );
  };

  // Render the mini history chart
  const renderHistoryChart = () => {
    if (history.qFactors.length < 2) return null;
    
    const width = 200;
    const height = 40;
    const points = history.qFactors.map((q, i) => {
      const x = (i / (history.qFactors.length - 1)) * width;
      const y = height - q * height;
      return `${x},${y}`;
    }).join(' ');
    
    const color = getStateColor(history.qFactors[history.qFactors.length - 1]);
    
    return (
      <div className="q-history">
        <svg viewBox={`0 0 ${width} ${height}`} className="q-history-svg">
          {/* Threshold line */}
          <line
            x1="0" y1={height - Q_STABLE_THRESHOLD * height}
            x2={width} y2={height - Q_STABLE_THRESHOLD * height}
            stroke="#333"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
          
          {/* Data line */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            style={{ transition: 'stroke 0.3s ease' }}
          />
        </svg>
      </div>
    );
  };

  // Render weight breakdown
  const renderWeightBreakdown = () => {
    if (!metrics) return null;
    
    const weights = [
      { label: 'Energy', value: metrics.energy, weight: WEIGHT_ENERGY, color: '#ff9944' },
      { label: 'Tasks', value: metrics.tasks, weight: WEIGHT_TASKS, color: '#44aaff' },
      { label: 'Environment', value: metrics.environment, weight: WEIGHT_ENVIRONMENT, color: '#44ffaa' },
      { label: 'Creation', value: metrics.creation, weight: WEIGHT_CREATION, color: '#7A27FF' },
    ];
    
    return (
      <div className="q-weights">
        {weights.map((w) => (
          <div key={w.label} className="q-weight-item">
            <span className="q-weight-label" style={{ color: w.color }}>{w.label}</span>
            <div className="q-weight-bar">
              <div
                className="q-weight-fill"
                style={{
                  width: `${w.value * 100}%`,
                  backgroundColor: w.color,
                }}
              />
            </div>
            <span className="q-weight-value">{(w.value * w.weight).toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`fisher-escola-dashboard ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="dashboard-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="dashboard-title">Fisher-Escolà Q</span>
        <span className="dashboard-indicator" style={{ backgroundColor: metrics ? getStateColor(metrics.qFactor) : '#333' }} />
      </div>
      
      {isExpanded && (
        <div className="dashboard-content">
          {renderQGauge()}
          {renderHistoryChart()}
          {renderWeightBreakdown()}
          
          <div className="dashboard-legend">
            <span style={{ color: '#00FF88' }}>● Stable (Q &gt; 0.4)</span>
            <span style={{ color: '#F59E0B' }}>● Warning (0.25 &lt; Q ≤ 0.4)</span>
            <span style={{ color: '#EF4444' }}>● Critical (Q ≤ 0.25)</span>
          </div>
          
          <div className="dashboard-formula">
            <code>Q = {WEIGHT_ENERGY}E + {WEIGHT_TASKS}T + {WEIGHT_ENVIRONMENT}Env + {WEIGHT_CREATION}C</code>
          </div>
        </div>
      )}
      
      <style>{`
        .fisher-escola-dashboard {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(5, 5, 16, 0.95);
          border: 1px solid #333;
          border-radius: 8px;
          padding: 12px;
          z-index: 100;
          font-family: 'JetBrains Mono', monospace;
          min-width: 220px;
        }
        
        .fisher-escola-dashboard.expanded {
          min-width: 280px;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          padding-bottom: 8px;
          border-bottom: 1px solid #222;
        }
        
        .dashboard-title {
          color: #E8ECF4;
          font-size: 14px;
          font-weight: 600;
        }
        
        .dashboard-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }
        
        .dashboard-content {
          padding-top: 12px;
        }
        
        .q-gauge {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .q-gauge-svg {
          width: 100%;
          max-width: 200px;
        }
        
        .q-state-label {
          margin-top: 8px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1px;
        }
        
        .q-history {
          margin-top: 12px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }
        
        .q-history-svg {
          width: 100%;
        }
        
        .q-weights {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .q-weight-item {
          display: grid;
          grid-template-columns: 80px 1fr 40px;
          gap: 8px;
          align-items: center;
        }
        
        .q-weight-label {
          font-size: 11px;
        }
        
        .q-weight-bar {
          height: 6px;
          background: #1a1a2e;
          border-radius: 3px;
          overflow: hidden;
        }
        
        .q-weight-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .q-weight-value {
          font-size: 11px;
          color: #888;
          text-align: right;
        }
        
        .dashboard-legend {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 10px;
        }
        
        .dashboard-formula {
          margin-top: 12px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
          text-align: center;
        }
        
        .dashboard-formula code {
          color: #00D4FF;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}
