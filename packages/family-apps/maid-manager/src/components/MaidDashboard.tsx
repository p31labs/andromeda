import { useState, useEffect, useCallback } from 'react'
import { initDB, seedClients, startJob, stopJob, getActiveJob, getClients, getPacingWarning } from '../utils/pglite-maid'

interface Client { id: number; nm: string; addr: string; est_min: number }
interface ActiveJob { id: number; cid: number; start_ts: number; nm: string; addr: string; est_min: number }

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    margin: 0,
    color: '#5DCAA5',
    letterSpacing: '1px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#888',
    marginTop: '8px',
  },
  statusCard: {
    background: '#16213e',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: '2px solid transparent',
  },
  statusCardWarning: {
    background: '#2d1b1b',
    border: '2px solid #cc6247',
  },
  statusCardRest: {
    background: '#1b2d1b',
    border: '2px solid #5DCAA5',
  },
  statusLabel: {
    fontSize: '14px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    marginBottom: '8px',
  },
  statusValue: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
  },
  clientName: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '8px',
  },
  clientAddr: {
    fontSize: '16px',
    color: '#aaa',
    marginBottom: '12px',
  },
  timer: {
    fontSize: '48px',
    fontWeight: 800,
    color: '#5DCAA5',
    textAlign: 'center' as const,
    margin: '20px 0',
  },
  timerWarning: {
    color: '#cc6247',
  },
  warningBox: {
    background: '#cc6247',
    color: '#fff',
    padding: '16px',
    borderRadius: '12px',
    marginTop: '16px',
    textAlign: 'center' as const,
  },
  warningText: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  warningSub: {
    fontSize: '14px',
    marginTop: '8px',
    opacity: 0.9,
  },
  actionButton: {
    width: '100%',
    padding: '28px 24px',
    fontSize: '28px',
    fontWeight: 800,
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'transform 0.1s',
  },
  startButton: {
    background: '#5DCAA5',
    color: '#1a1a2e',
  },
  stopButton: {
    background: '#cc6247',
    color: '#fff',
  },
  restButton: {
    background: '#f9a825',
    color: '#1a1a2e',
  },
  clientList: {
    marginTop: '20px',
  },
  clientCard: {
    background: '#0f3460',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '12px',
    cursor: 'pointer',
    border: '2px solid transparent',
  },
  clientCardSelected: {
    border: '2px solid #5DCAA5',
  },
  estTime: {
    fontSize: '12px',
    color: '#5DCAA5',
    marginTop: '4px',
  },
  restingCard: {
    background: '#1b2d1b',
    border: '2px solid #5DCAA5',
    padding: '24px',
    borderRadius: '16px',
    textAlign: 'center' as const,
  },
  restingTitle: {
    fontSize: '24px',
    color: '#5DCAA5',
    margin: 0,
  },
}

export function MaidDashboard(): JSX.Element {
  const [initialized, setInitialized] = useState(false)
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<number | null>(null)
  const [elapsedMin, setElapsedMin] = useState(0)
  const [pacing, setPacing] = useState<{ show: boolean; msg: string; rest: number }>({ show: false, msg: '', rest: 0 })
  const [isResting, setIsResting] = useState(false)
  const [restCountdown, setRestCountdown] = useState(0)

  useEffect(() => {
    initDB().then(() => {
      seedClients()
      setInitialized(true)
      loadData()
    })
  }, [])

  const loadData = useCallback(async () => {
    const job = await getActiveJob()
    setActiveJob(job)
    if (job) {
      const ts = Math.floor(Date.now() / 1000)
      const mins = Math.floor((ts - job.start_ts) / 60)
      setElapsedMin(mins)
      setPacing(getPacingWarning(job.start_ts))
    }
    const cl = await getClients()
    setClients(cl)
  }, [])

  useEffect(() => {
    if (!activeJob) return
    const interval = setInterval(() => {
      const ts = Math.floor(Date.now() / 1000)
      const mins = Math.floor((ts - activeJob.start_ts) / 60)
      setElapsedMin(mins)
      setPacing(getPacingWarning(activeJob.start_ts))
    }, 60000)
    return () => clearInterval(interval)
  }, [activeJob])

  useEffect(() => {
    if (pacing.show && pacing.rest > 0 && !isResting) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400])
    }
  }, [pacing, isResting])

  useEffect(() => {
    if (!isResting || restCountdown <= 0) return
    const interval = setInterval(() => {
      setRestCountdown(c => {
        if (c <= 1) {
          setIsResting(false)
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          return 0
        }
        return c - 1
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [isResting, restCountdown])

  const handleStart = async () => {
    if (!selectedClient) return
    await startJob(selectedClient)
    if (navigator.vibrate) navigator.vibrate(100)
    await loadData()
  }

  const handleStop = async () => {
    if (!activeJob) return
    await stopJob(activeJob.id)
    if (navigator.vibrate) navigator.vibrate([50, 50, 50])
    if (pacing.rest > 0) {
      setIsResting(true)
      setRestCountdown(pacing.rest)
    }
    await loadData()
  }

  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  if (!initialized) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', paddingTop: '40vh' }}>
          <p style={{ fontSize: '20px', color: '#5DCAA5' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>MAID MANAGER</h1>
        <p style={styles.subtitle}>Carrie's Solo Operator Console</p>
      </header>

      {isResting ? (
        <div style={styles.restingCard}>
          <h2 style={styles.restingTitle}>☕ REST BREAK</h2>
          <p style={{ fontSize: '48px', fontWeight: 800, margin: '20px 0', color: '#5DCAA5' }}>
            {restCountdown}
          </p>
          <p style={{ fontSize: '18px', color: '#aaa' }}>minutes remaining</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
            Protect your joints. Sit down. Breathe.
          </p>
        </div>
      ) : activeJob ? (
        <div style={{ ...styles.statusCard, ...(pacing.show ? (pacing.rest > 0 ? styles.statusCardRest : styles.statusCardWarning) : {}) }}>
          <div style={styles.statusLabel}>CURRENT JOB</div>
          <h2 style={styles.clientName}>{activeJob.nm}</h2>
          <p style={styles.clientAddr}>{activeJob.addr}</p>
          
          <div style={{ ...styles.timer, ...(pacing.show ? styles.timerWarning : {}) }}>
            {formatTime(elapsedMin)}
          </div>

          {pacing.show && (
            <div style={styles.warningBox}>
              <p style={styles.warningText}>{pacing.msg}</p>
              {pacing.rest > 0 && (
                <p style={styles.warningSub}>Forced {pacing.rest}-minute rest after this job</p>
              )}
            </div>
          )}

          <button
            onClick={handleStop}
            style={{ ...styles.actionButton, ...styles.stopButton }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            ✓ FINISH & REST
          </button>
        </div>
      ) : (
        <>
          <div style={styles.statusCard}>
            <div style={styles.statusLabel}>SELECT CLIENT</div>
            <div style={styles.clientList}>
              {clients.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelectedClient(c.id)}
                  style={{
                    ...styles.clientCard,
                    ...(selectedClient === c.id ? styles.clientCardSelected : {})
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>{c.nm}</div>
                  <div style={{ fontSize: '14px', color: '#aaa' }}>{c.addr}</div>
                  <div style={styles.estTime}>Est: {c.est_min} min</div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!selectedClient}
            style={{
              ...styles.actionButton,
              ...styles.startButton,
              opacity: selectedClient ? 1 : 0.5,
            }}
            onMouseDown={(e) => { if (selectedClient) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            ▶ START CLEANING
          </button>
        </>
      )}
    </div>
  )
}
