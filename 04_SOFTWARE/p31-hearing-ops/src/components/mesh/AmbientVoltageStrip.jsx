import { useCoherence } from '../CoherenceContext.jsx'
import './AmbientVoltageStrip.css'
export function AmbientVoltageStrip() {
  const { spoons, computedQ } = useCoherence()
  const getColor = () => {
    const t = Math.max(0, Math.min(1, (20 - spoons) / 20))
    const qT = Math.max(0, Math.min(1, 1 - computedQ))
    const combinedT = Math.max(t, qT)
    if (combinedT < 0.5) {
      const ratio = combinedT * 2
      const r = Math.round(0 + 255 * ratio)
      const g = Math.round(206 - 15 * ratio)
      const b = Math.round(209 - 209 * ratio)
      return `rgb(${r}, ${g}, ${b})`
    } else {
      const ratio = (combinedT - 0.5) * 2
      const r = 255
      const g = Math.round(191 - 122 * ratio)
      const b = Math.round(0 - 0 * ratio)
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  const intensity = Math.min(100, 30 + (20 - spoons) * 4 + (1 - computedQ) * 50)
  return (
    <div className="ambient-strip-container">
      <div className="ambient-strip" style={{
        background: `linear-gradient(90deg, ${getColor()} 0%, ${getColor()} ${intensity}%, transparent ${intensity}%, transparent 100%)`,
        boxShadow: `0 0 20px ${getColor()}44`
      }} />
      <div className="ambient-strip-label">
        COHERENCE: {Math.round(computedQ * 100)}% | SPOONS: {spoons}/20
      </div>
    </div>
  )
}
