import { useCoherence } from '../CoherenceContext.jsx'
import { useBioregulation } from './hooks/useBioregulation.js'
import './SafeModePrompt.css'
export function SafeModePrompt() {
  const { spoons, computedQ, mode, setMode } = useCoherence()
  const { startRegulation, stopRegulation, isRegulating } = useBioregulation()
  const handleGrounding = () => {
    if (!isRegulating) startRegulation()
    setMode('auto')
  }
  const getReason = () => {
    if (spoons < 3) return 'Spoon deficit detected'
    if (computedQ < 0.4) return 'Low coherence state'
    return 'Manual safe mode'
  }
  return (
    <div className="safe-mode-overlay">
      <div className="safe-mode-modal">
        <div className="safe-mode-icon">◈</div>
        <h2>CASUALTY CONTROL</h2>
        <p className="reason">{getReason()}</p>
        <div className="status-box">
          <div className="status-item"><span>Spoons</span><span>{spoons}/20</span></div>
          <div className="status-item"><span>Coherence</span><span>{Math.round(computedQ * 100)}%</span></div>
          <div className="status-item"><span>Mode</span><span>{mode.toUpperCase()}</span></div>
        </div>
        <p className="prompt-text">What tool are you holding and what task are you doing?</p>
        <div className="actions">
          <button className="grounding-btn" onClick={handleGrounding} disabled={isRegulating}>
            {isRegulating ? 'Regulating...' : 'Acknowledge & Continue'}
          </button>
          <button className="secondary-btn" onClick={() => setMode('auto')}>Dismiss</button>
        </div>
        {isRegulating && (
          <div className="regulation-indicator">
            <span className="pulse-dot"></span>Audio regulation active
          </div>
        )}
      </div>
    </div>
  )
}
