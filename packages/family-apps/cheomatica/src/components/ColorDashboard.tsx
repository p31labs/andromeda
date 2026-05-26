import { useState, useEffect, useRef } from 'react'
import { initDB, seedData, addClient, saveFormula, getClients, getClientHistory, getSyncQueue } from '../utils/pglite-cheo'

interface Client { id: number; nm: string; phone: string; notes: string }
interface Formula { id: number; base: string; dev: string; tgt: string; notes: string; ts: number }

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#1a1a2e',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    padding: '16px',
    boxSizing: 'border-box'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    fontSize: '36px',
    fontWeight: 800,
    margin: 0,
    color: '#E91E63',
    letterSpacing: '2px'
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginTop: '4px'
  },
  card: {
    background: '#16213e',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    marginBottom: '12px'
  },
  clientList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  clientCard: {
    background: '#0f3460',
    padding: '16px',
    borderRadius: '12px',
    cursor: 'pointer',
    border: '2px solid transparent'
  },
  clientCardSelected: {
    border: '2px solid #E91E63'
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginBottom: '16px'
  },
  colorBtn: {
    padding: '20px 8px',
    fontSize: '20px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    background: '#333',
    color: '#fff',
    transition: 'transform 0.1s'
  },
  colorBtnSelected: {
    background: '#E91E63',
    transform: 'scale(1.05)'
  },
  devGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    marginBottom: '16px'
  },
  devBtn: {
    padding: '18px 8px',
    fontSize: '18px',
    fontWeight: 700,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    background: '#2d5a4a',
    color: '#fff'
  },
  devBtnSelected: {
    background: '#5DCAA5',
    color: '#1a1a2e'
  },
  actionBtn: {
    width: '100%',
    padding: '24px',
    fontSize: '24px',
    fontWeight: 800,
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    background: '#E91E63',
    color: '#fff',
    marginTop: '16px'
  },
  notesArea: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    fontSize: '18px',
    borderRadius: '12px',
    border: '2px solid #333',
    background: '#0f3460',
    color: '#fff',
    marginBottom: '12px',
    boxSizing: 'border-box'
  },
  micBtn: {
    width: '100%',
    padding: '16px',
    fontSize: '18px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    background: '#333',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  micBtnActive: {
    background: '#cc6247'
  },
  formulaCard: {
    background: '#0f3460',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '8px'
  },
  formulaColors: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  formulaBadge: {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 700,
    background: '#E91E63'
  }
}

const BASE_COLORS = ['5N', '6N', '7N', '8N', '5A', '6A', '7A', '8A', '5R', '6R', '7R', '8R']
const DEVELOPERS = ['10vol', '20vol', '30vol', '40vol']

export function ColorDashboard(): JSX.Element {
  const [initialized, setInitialized] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<number | null>(null)
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [selectedBase, setSelectedBase] = useState<string>('')
  const [selectedDev, setSelectedDev] = useState<string>('')
  const [targetColor, setTargetColor] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isListening, setIsListening] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [view, setView] = useState<'clients' | 'formula' | 'history'>('clients')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    initDB().then(() => {
      seedData()
      setInitialized(true)
      loadClients()
    })
  }, [])

  useEffect(() => {
    if (selectedClient) {
      loadClientHistory(selectedClient)
    }
  }, [selectedClient])

  const loadClients = async () => {
    const cl = await getClients()
    setClients(cl)
  }

  const loadClientHistory = async (cid: number) => {
    const hist = await getClientHistory(cid)
    setFormulas(hist)
  }

  const startDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice input not supported on this device')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setNotes(prev => prev ? prev + ' ' + transcript : transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleSaveFormula = async () => {
    if (!selectedClient || !selectedBase || !selectedDev) return
    
    await saveFormula(selectedClient, selectedBase, selectedDev, targetColor, notes)
    
    // Reset
    setSelectedBase('')
    setSelectedDev('')
    setTargetColor('')
    setNotes('')
    
    // Reload history
    await loadClientHistory(selectedClient)
    setView('history')
  }

  const handleAddClient = async () => {
    if (!newClientName.trim()) return
    await addClient(newClientName.trim())
    setNewClientName('')
    await loadClients()
  }

  if (!initialized) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', paddingTop: '40vh' }}>
          <p style={{ fontSize: '20px', color: '#E91E63' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>CHEOMATICA</h1>
        <p style={styles.subtitle}>Color Formulation System — Christyn</p>
      </header>

      {view === 'clients' && (
        <>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>Select Client</div>
            <div style={styles.clientList}>
              {clients.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedClient(c.id)
                    setView('formula')
                  }}
                  style={{
                    ...styles.clientCard,
                    ...(selectedClient === c.id ? styles.clientCardSelected : {})
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>{c.nm}</div>
                  {c.phone && <div style={{ fontSize: '14px', color: '#aaa' }}>{c.phone}</div>}
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionTitle}>New Client</div>
            <input
              type="text"
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              placeholder="Client name..."
              style={{ ...styles.notesArea, minHeight: '50px' }}
            />
            <button
              onClick={handleAddClient}
              style={{ ...styles.actionBtn, background: '#0f3460' }}
              disabled={!newClientName.trim()}
            >
              + ADD CLIENT
            </button>
          </div>
        </>
      )}

      {view === 'formula' && selectedClient && (
        <>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={styles.sectionTitle}>Base Color</div>
              <button onClick={() => setView('clients')} style={{ fontSize: '14px', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>← Back</button>
            </div>
            <div style={styles.colorGrid}>
              {BASE_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedBase(color)}
                  style={{
                    ...styles.colorBtn,
                    ...(selectedBase === color ? styles.colorBtnSelected : {})
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionTitle}>Developer</div>
            <div style={styles.devGrid}>
              {DEVELOPERS.map(dev => (
                <button
                  key={dev}
                  onClick={() => setSelectedDev(dev)}
                  style={{
                    ...styles.devBtn,
                    ...(selectedDev === dev ? styles.devBtnSelected : {})
                  }}
                >
                  {dev}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.sectionTitle}>Target Result</div>
            <input
              type="text"
              value={targetColor}
              onChange={e => setTargetColor(e.target.value)}
              placeholder="e.g., Deep ash brown..."
              style={styles.notesArea}
            />
          </div>

          <div style={styles.card}>
            <div style={styles.sectionTitle}>Notes (Voice or Type)</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Process time, observations..."
              style={styles.notesArea}
            />
            <button
              onClick={startDictation}
              style={{
                ...styles.micBtn,
                ...(isListening ? styles.micBtnActive : {})
              }}
            >
              {isListening ? '🔴 Recording...' : '🎤 Tap to Dictate'}
            </button>
          </div>

          <button
            onClick={handleSaveFormula}
            disabled={!selectedBase || !selectedDev}
            style={{
              ...styles.actionBtn,
              opacity: selectedBase && selectedDev ? 1 : 0.5
            }}
          >
            ✓ SAVE FORMULA
          </button>
        </>
      )}

      {view === 'history' && selectedClient && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={styles.sectionTitle}>Formula History</div>
            <button onClick={() => setView('formula')} style={{ fontSize: '14px', background: 'none', border: 'none', color: '#E91E63', cursor: 'pointer' }}>+ New Formula</button>
          </div>
          {formulas.length === 0 ? (
            <p style={{ color: '#888' }}>No formulas yet. Create one!</p>
          ) : (
            formulas.map(f => (
              <div key={f.id} style={styles.formulaCard}>
                <div style={styles.formulaColors}>
                  <span style={styles.formulaBadge}>{f.base}</span>
                  <span style={{ ...styles.formulaBadge, background: '#2d5a4a' }}>{f.dev}</span>
                  {f.tgt && <span style={{ ...styles.formulaBadge, background: '#666' }}>{f.tgt}</span>}
                </div>
                {f.notes && <p style={{ fontSize: '14px', color: '#aaa', margin: 0 }}>{f.notes}</p>}
                <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  {new Date(f.ts * 1000).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
