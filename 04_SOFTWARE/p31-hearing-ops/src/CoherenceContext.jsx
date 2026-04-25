import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'

const CoherenceContext = createContext()

// Simulated spoon/qFactor state (in production, fed from /api/status SSE or KV stream)
const useSimulatedCoherence = () => {
  const [spoons, setSpoons] = useState(12)
  const [qFactor, setQFactor] = useState(0.925)
  const [nodePings, setNodePings] = useState([12, 18, 8, 15]) // ms
  const [jitter, setJitter] = useState([3, 5, 2, 4]) // ms

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate gradual cognitive drift
      setSpoons((s) => {
        const next = s - (Math.random() > 0.7 ? 1 : 0)
        return Math.max(0, Math.min(20, next))
      })
      setQFactor((q) => {
        const target = spoons < 3 ? 0.3 : 0.925 - (20 - spoons) * 0.04
        return q + (target - q) * 0.1
      })
      // Simulate network fluctuation
      setNodePings((p) => p.map(v => Math.max(5, v + (Math.random() - 0.5) * 4)))
      setJitter((j) => j.map(v => Math.max(1, v + (Math.random() - 0.5) * 2)))
    }, 3000)

    return () => clearInterval(interval)
  }, [spoons])

  return { spoons, qFactor, nodePings, jitter }
}

const computeQFactor = (nodePingMs, jitterMs, spoonCount = 0) => {
  const pingNorm = Math.min(nodePingMs / 100, 1.0)
  const jitterNorm = Math.min(jitterMs / 50, 1.0)
  const baseCoherence = Math.exp(-2.5 * (pingNorm + jitterNorm))
  const spoonMultiplier = spoonCount < 3 ? Math.max(0.25, spoonCount / 3) : 1.0
  return Math.max(0, Math.min(1, baseCoherence * spoonMultiplier))
}

export function CoherenceProvider({ children }) {
  const sim = useSimulatedCoherence()
  const [state, setState] = useState({
    mode: 'auto', // auto | safe | high-coherence
    spoons: sim.spoons,
    qFactor: sim.qFactor,
    nodePings: sim.nodePings,
    jitter: sim.jitter,
    computedQ: 0.925,
  })

  useEffect(() => {
    const computed = computeQFactor(
      sim.nodePings.reduce((a, b) => a + b) / 4,
      sim.jitter.reduce((a, b) => a + b) / 4,
      sim.spoons
    )
    setState((s) => ({
      ...s,
      spoons: sim.spoons,
      qFactor: sim.qFactor,
      nodePings: sim.nodePings,
      jitter: sim.jitter,
      computedQ: computed,
    }))
  }, [sim.spoons, sim.qFactor, sim.nodePings, sim.jitter])

  const setMode = (mode) => setState((s) => ({ ...s, mode }))

  const value = useMemo(() => ({ ...state, setMode, computeQFactor }), [state, setMode])

  return <CoherenceContext.Provider value={value}>{children}</CoherenceContext.Provider>
}

export const useCoherence = () => {
  const ctx = useContext(CoherenceContext)
  if (!ctx) throw new Error('useCoherence must be used within CoherenceProvider')
  return ctx
}

// Polyfill useInterval if not present
// (implementation omitted for brevity)