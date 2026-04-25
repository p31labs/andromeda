import { useState } from 'react'
import { useCoherence } from '../CoherenceContext.jsx'
import './ProgressiveDisclosure.css'
export function ProgressiveDisclosure() {
  const { spoons, qFactor, computedQ, nodePings, jitter } = useCoherence()
  const [layer, setLayer] = useState('macro')
  const handleWheel = (e) => {
    if (e.deltaY > 0) {
      if (layer === 'macro') setLayer('meso')
      else if (layer === 'meso') setLayer('micro')
    } else {
      if (layer === 'micro') setLayer('meso')
      else if (layer === 'meso') setLayer('macro')
    }
  }
  const getLayerContent = () => {
    switch (layer) {
      case 'macro':
        return (
          <div className="macro-layer">
            <div className="macro-title">K₄ MESH</div>
            <div className="macro-subtitle">Tetrahedral Coherence Field</div>
          </div>
        )
      case 'meso':
        return (
          <div className="meso-layer">
            <div className="telemetry-grid">
              <TelemetryItem label="SPOONS" value={`${spoons}/20`} unit="units" />
              <TelemetryItem label="Q FACTOR" value={`${Math.round(computedQ * 100)}%`} unit="coherence" />
              <TelemetryItem label="AVG PING" value={`${Math.round(nodePings.reduce((a,b)=>a+b)/4)}`} unit="ms" />
              <TelemetryItem label="JITTER" value={`${Math.round(jitter.reduce((a,b)=>a+b)/4)}`} unit="ms" />
            </div>
          </div>
        )
      case 'micro':
        return (
          <div className="micro-layer">
            <div className="json-panel">
              <div className="json-header">MESH STATE</div>
              <pre>{JSON.stringify({
                spoons, qFactor: computedQ.toFixed(4), nodePings, jitter,
                vertices: [[0,1.5,0],[-1.3,-0.5,0.8],[1.3,-0.5,0.8],[0,-0.5,-1.4]],
                edges: 6, timestamp: Date.now()
              }, null, 2)}</pre>
            </div>
          </div>
        )
      default: return null
    }
  }
  return (
    <div className={`progressive-disclosure layer-${layer}`} onWheel={handleWheel}>
      <div className="layer-indicator">
        <span className={layer === 'macro' ? 'active' : ''}>MACRO</span>
        <span className={layer === 'meso' ? 'active' : ''}>MESO</span>
        <span className={layer === 'micro' ? 'active' : ''}>MICRO</span>
      </div>
      {getLayerContent()}
      <div className="scroll-hint">{layer !== 'micro' && 'Scroll for more detail'}</div>
    </div>
  )
}
function TelemetryItem({ label, value, unit }) {
  return (
    <div className="telemetry-item">
      <div className="telemetry-label">{label}</div>
      <div className="telemetry-value">{value} <span className="telemetry-unit">{unit}</span></div>
    </div>
  )
}
