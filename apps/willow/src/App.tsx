import { useState, useRef, useEffect, useMemo } from 'react'

type Screen = 'home' | 'voice' | 'draw' | 'games' | 'family'

const BUTTONS: { screen: Screen; emoji: string; label: string; color: string }[] = [
  { screen: 'voice', emoji: '🎤', label: 'VOICE', color: '#FF6B9D' },
  { screen: 'draw', emoji: '🎨', label: 'DRAW', color: '#4ECDC4' },
  { screen: 'games', emoji: '🎮', label: 'GAMES', color: '#FFE66D' },
  { screen: 'family', emoji: '📞', label: 'FAMILY', color: '#A78BFA' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')

  if (screen === 'voice') return <VoiceScreen onBack={() => setScreen('home')} />
  if (screen === 'draw') return <DrawScreen onBack={() => setScreen('home')} />
  if (screen === 'games') return <GamesScreen onBack={() => setScreen('home')} />
  if (screen === 'family') return <FamilyScreen onBack={() => setScreen('home')} />

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <h1 className="home-title">Willow</h1>
        <p className="home-subtitle">✨ Pick something fun! ✨</p>
      </header>
      <nav className="button-grid" aria-label="Main menu">
        {BUTTONS.map((btn) => (
          <button
            key={btn.screen}
            className="big-button"
            style={{ '--btn-color': btn.color } as React.CSSProperties}
            onClick={() => setScreen(btn.screen)}
            aria-label={btn.label}
          >
            <span className="big-button-emoji" role="img" aria-hidden="true">
              {btn.emoji}
            </span>
            <span className="big-button-label">{btn.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button className="back-button" onClick={onBack} aria-label="Go back home">
      <span role="img" aria-hidden="true">⬅️</span>
      <span>HOME</span>
    </button>
  )
}

function ScreenShell({
  children,
  onBack,
  bgColor,
}: {
  children: React.ReactNode
  onBack: () => void
  bgColor?: string
}) {
  return (
    <div className="screen" style={{ backgroundColor: bgColor }}>
      <BackButton onBack={onBack} />
      {children}
    </div>
  )
}

function VoiceScreen({ onBack }: { onBack: () => void }) {
  const [recording, setRecording] = useState(false)
  const [done, setDone] = useState(false)

  const handleRecord = () => {
    if (done) {
      setDone(false)
      return
    }
    if (!recording) {
      setRecording(true)
    } else {
      setRecording(false)
      setDone(true)
    }
  }

  return (
    <ScreenShell onBack={onBack} bgColor="#FFF0F5">
      <div className="feature-content">
        <h2 className="feature-title">
          <span role="img" aria-hidden="true">🎤</span> Send a Voice Message!
        </h2>
        {done ? (
          <>
            <p className="feature-status">✅ Message sent!</p>
            <p className="feature-hint">Dad will hear it soon!</p>
            <button className="big-button record-done" onClick={handleRecord}>
              <span className="big-button-emoji">🎤</span>
              <span className="big-button-label">NEW MESSAGE</span>
            </button>
          </>
        ) : (
          <>
            <button
              className={`big-button record-button ${recording ? 'recording-active' : ''}`}
              onClick={handleRecord}
            >
              <span className={recording ? 'recording-pulse' : ''}>
                {recording ? '⏹️' : '🎤'}
              </span>
              <span className="big-button-label">
                {recording ? 'TAP TO STOP' : 'TAP TO RECORD'}
              </span>
            </button>
            {recording && <p className="recording-indicator">🔴 Recording...</p>}
            <p className="feature-hint">Tap the button to start recording your message for Dad!</p>
          </>
        )}
      </div>
    </ScreenShell>
  )
}

function DrawScreen({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [, setHasDrawn] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#FF6B9D')
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const COLORS = ['#FF6B9D', '#4ECDC4', '#FFE66D', '#A78BFA', '#FF8A5C', '#000000', '#FFFFFF']

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height - 10
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  const getPos = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawing.current = true
    setHasDrawn(true)
    lastPos.current = getPos(e)
  }
  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current || !lastPos.current) return
    const pos = getPos(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.strokeStyle = selectedColor
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    lastPos.current = pos
  }
  const endDraw = () => {
    isDrawing.current = false
    lastPos.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    setHasDrawn(false)
  }

  return (
    <ScreenShell onBack={onBack} bgColor="#F0FFFD">
      <div className="feature-content draw-content">
        <h2 className="feature-title">
          <span role="img" aria-hidden="true">🎨</span> Draw Something!
        </h2>
        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            className="draw-canvas"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
        <div className="color-palette" role="group" aria-label="Choose color">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch ${selectedColor === c ? 'color-selected' : ''}`}
              style={{ backgroundColor: c, border: c === '#FFFFFF' ? '3px solid #ccc' : 'none' }}
              onClick={() => setSelectedColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <button className="clear-button" onClick={clearCanvas}>
          🗑️ Clear
        </button>
      </div>
    </ScreenShell>
  )
}

function GamesScreen({ onBack }: { onBack: () => void }) {
  const [score, setScore] = useState(0)
  const [target, setTarget] = useState(genTarget())
  const [feedback, setFeedback] = useState('')

  function genTarget() {
    const emojis = ['⭐', '🌟', '💫', '✨', '❤️', '🧡', '💛', '💚', '💙', '💜']
    return emojis[Math.floor(Math.random() * emojis.length)]
  }

  const handleCatch = (emoji: string) => {
    if (emoji === target) {
      setScore((s) => s + 1)
      setFeedback('🎉')
      setTimeout(() => {
        setFeedback('')
        setTarget(genTarget())
      }, 500)
    } else {
      setFeedback('😅')
      setTimeout(() => setFeedback(''), 500)
    }
  }

  const options = useMemo(() => {
    const emojis = ['⭐', '🌟', '💫', '✨', '❤️', '🧡', '💛', '💚', '💙', '💜']
    const pool = [target]
    while (pool.length < 4) {
      const e = emojis[Math.floor(Math.random() * emojis.length)]
      if (!pool.includes(e)) pool.push(e)
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool
  }, [target])

  return (
    <ScreenShell onBack={onBack} bgColor="#FFFDE7">
      <div className="feature-content">
        <h2 className="feature-title">
          <span role="img" aria-hidden="true">🎮</span> Catch the Sparkle!
        </h2>
        <div className="game-score">Score: {score}</div>
        <div className="game-target-area">
          <p className="game-instruction">Find this one:</p>
          <span className="game-target-emoji">{target}</span>
        </div>
        {feedback && <div className="game-feedback">{feedback}</div>}
        <div className="game-options">
          {options.map((emoji, i) => (
            <button
              key={`${i}-${emoji}`}
              className="game-option"
              onClick={() => handleCatch(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </ScreenShell>
  )
}

function FamilyScreen({ onBack }: { onBack: () => void }) {
  const contacts = [
    { name: 'Dad 💙', emoji: '🎤', color: '#6CB4EE' },
    { name: 'Nana 💜', emoji: '👵', color: '#A78BFA' },
    { name: 'Uncle Tony 🧡', emoji: '🧔', color: '#FF8A5C' },
    { name: 'Auntie 💗', emoji: '👩', color: '#FF6B9D' },
  ]

  return (
    <ScreenShell onBack={onBack} bgColor="#F5F0FF">
      <div className="feature-content">
        <h2 className="feature-title">
          <span role="img" aria-hidden="true">📞</span> Family
        </h2>
        <p className="feature-hint">Tap someone to talk to them!</p>
        <div className="family-grid">
          {contacts.map((c) => (
            <button
              key={c.name}
              className="family-button"
              style={{ '--btn-color': c.color } as React.CSSProperties}
            >
              <span className="family-emoji">{c.emoji}</span>
              <span className="family-name">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </ScreenShell>
  )
}


