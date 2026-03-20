// BrainOverlay.tsx — Geodesic Quantum Brain mounted in the COPILOT room.
// SVG brain visualization with API connections, spoon tracker, focus modes, Gemini AI.
// Accessibility: large text, neon on pure black, zoomable/pannable brain, touch targets 48px+

import { useState, useEffect, useCallback, useRef } from 'react';
import { streamChat, loadLLMConfig, buildSystemContext } from '../../../../services/llmClient';
import { useSovereignStore } from '../../../../sovereign/useSovereignStore';

const PHOSPHOR = '#00FFFF';
const PHOSPHOR_DIM = 'rgba(0, 255, 255, 0.15)';
const PHOSPHOR_GLOW = 'rgba(0, 255, 255, 0.5)';
const BG = '#000000';
const PANEL_BG = 'rgba(0, 0, 0, 0.92)';
const VIOLET = '#A78BFA';
const AMBER = '#FBBF24';
const CYAN = '#22D3EE';
const ROSE = '#FB7185';

const BRAIN_REGIONS = [
  { id: 'research', label: 'VACUUM', sub: 'Research', angle: -90, radius: 0.32, color: CYAN, icon: '\u25C9', desc: 'Dispatch parallel research missions', prompt: 'You are a high-bandwidth research assistant. Provide a dense, concise briefing on the following topic. Focus on novel connections, key entities, and underlying mechanisms. Output format: Bullet points with bold entities.' },
  { id: 'synthesize', label: 'PROCESS', sub: 'Synthesize', angle: -30, radius: 0.32, color: VIOLET, icon: '\u2B21', desc: 'Collapse research into intelligence', prompt: 'You are an intelligence analyst. Synthesize the following raw input into a clear, actionable summary. Identify the core signal amidst the noise. Output format: Executive Summary followed by Key Insights.' },
  { id: 'build', label: 'INTEGRATE', sub: 'Build', angle: 30, radius: 0.32, color: PHOSPHOR, icon: '\u25B3', desc: 'Hyperfocus execution', prompt: 'You are a systems architect. Break down the following high-level objective into a recursive checklist of actionable steps (max 5 items). Focus on the \'Minimum Stable System\'. Output format: Markdown checklist.' },
  { id: 'ship', label: 'CONVERGE', sub: 'Ship', angle: 90, radius: 0.32, color: AMBER, icon: '\u25C7', desc: 'Route deliverables, validate', prompt: 'You are a release manager. Draft a clear, professional communication (email, commit message, or release note) based on this intent. Tone: Precise, confident, and low-entropy.' },
  { id: 'memory', label: 'CONTEXT', sub: 'Memory', angle: 150, radius: 0.32, color: '#E0E0E0', icon: '\u2299', desc: 'Cached conversations & rules', prompt: 'You are a memory archivist. Search the simulated context for associations related to the following query. (Note: Since this is a demo, generate plausible historical context related to \'Project Geodesic\').' },
  { id: 'regulate', label: 'REGULATE', sub: 'Energy', angle: 210, radius: 0.32, color: ROSE, icon: '\u2661', desc: 'Spoon tracking, grounding', prompt: 'You are a somatic regulation coach. Based on the user\'s input, suggest a brief, immediate grounding exercise or cognitive reframing technique to restore coherence. Keep it under 50 words.' },
];

const API_CONNECTIONS = [
  { id: 'anthropic', name: 'Anthropic', sub: 'Claude', icon: '\u25C8', color: '#D4A574', regions: ['synthesize', 'build'] },
  { id: 'google', name: 'Google', sub: 'Workspace', icon: '\u25EB', color: '#4285F4', regions: ['memory', 'research'] },
  { id: 'gemini', name: 'Gemini', sub: 'AI', icon: '\u2727', color: '#8AB4F8', regions: ['research', 'synthesize', 'build', 'ship', 'regulate'] },
  { id: 'deepseek', name: 'DeepSeek', sub: 'Coder', icon: '\u27D0', color: '#00D4AA', regions: ['build'] },
  { id: 'github', name: 'GitHub', sub: 'Repos', icon: '\u2325', color: '#F0F0F0', regions: ['build', 'ship'] },
  { id: 'cursor', name: 'Cursor', sub: 'Agents', icon: '\u229E', color: '#00E5FF', regions: ['build', 'ship'] },
  { id: 'vertex', name: 'Vertex', sub: 'Cache', icon: '\u25A3', color: '#FBBC04', regions: ['memory', 'synthesize'] },
];

// Gemini API call with retry
const callGemini = async (userQuery: string, systemPrompt: string): Promise<string> => {
  const apiKey = '';
  const model = 'gemini-2.5-flash-preview-09-2025';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: userQuery }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, delays[i]));
          continue;
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } catch (error) {
      if (i === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
  return 'No response generated.';
};

function generateDome(cx: number, cy: number, r: number, rings = 5) {
  const nodes: { x: number; y: number; ring: number }[] = [{ x: cx, y: cy - r * 0.05, ring: 0 }];
  const edges: { from: number; to: number; dist: number }[] = [];
  for (let ring = 1; ring <= rings; ring++) {
    const count = ring * 6;
    const ringR = (ring / rings) * r;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const jitter = (Math.random() - 0.5) * 8;
      nodes.push({
        x: cx + Math.cos(angle) * ringR + jitter,
        y: cy + Math.sin(angle) * ringR * 0.55 + jitter,
        ring,
      });
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r * 0.38 && Math.random() > 0.15) {
        edges.push({ from: i, to: j, dist });
      }
    }
  }
  return { nodes, edges };
}

function mapRegionToNode(region: { angle: number; radius: number }, cx: number, cy: number, r: number) {
  const rad = (region.angle * Math.PI) / 180;
  return {
    x: cx + Math.cos(rad) * r * region.radius * 2.4,
    y: cy + Math.sin(rad) * r * region.radius * 1.4,
  };
}

export function BrainOverlay() {
  const [phase, setPhase] = useState<'landing' | 'connecting' | 'focused'>('landing');
  const [connectedAPIs, setConnectedAPIs] = useState<Set<string>>(new Set());
  const [focusedRegion, setFocusedRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredAPI, setHoveredAPI] = useState<string | null>(null);
  const [spoons, setSpoons] = useState(5);
  const [taskInput, setTaskInput] = useState('');
  const [pulsePhase, setPulsePhase] = useState(0);
  const [dome] = useState(() => generateDome(300, 200, 180));
  const [showTask, setShowTask] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Zoom/pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const brainRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase((p) => (p + 0.02) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Wheel zoom
  useEffect(() => {
    const el = brainRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(4, z - e.deltaY * 0.002)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Pinch zoom (touch)
  useEffect(() => {
    const el = brainRef.current;
    if (!el) return;
    let lastDist = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastDist = Math.sqrt(dx * dx + dy * dy);
      } else if (e.touches.length === 1) {
        setIsPanning(true);
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastDist > 0) {
          setZoom(z => Math.max(0.5, Math.min(4, z * (dist / lastDist))));
        }
        lastDist = dist;
      } else if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
      }
    };
    const onTouchEnd = () => { lastDist = 0; setIsPanning(false); };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isPanning, pan.x, pan.y]);

  // Mouse drag pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan.x, pan.y]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const onMouseUp = useCallback(() => setIsPanning(false), []);

  const toggleAPI = useCallback((apiId: string) => {
    setConnectedAPIs((prev) => {
      const next = new Set(prev);
      if (next.has(apiId)) next.delete(apiId);
      else next.add(apiId);
      if (next.size > 0 && phase === 'landing') setPhase('connecting');
      if (next.size === 0) setPhase('landing');
      return next;
    });
  }, [phase]);

  const enterFocus = useCallback((regionId: string) => {
    if (connectedAPIs.size === 0) return;
    setFocusedRegion(regionId);
    setPhase('focused');
    setShowTask(true);
    setAiResponse(null);
    setErrorMsg(null);
  }, [connectedAPIs]);

  const exitFocus = useCallback(() => {
    setFocusedRegion(null);
    setPhase(connectedAPIs.size > 0 ? 'connecting' : 'landing');
    setShowTask(false);
    setTaskInput('');
    setAiResponse(null);
    setIsThinking(false);
  }, [connectedAPIs]);

  const handleEngage = async () => {
    if (!taskInput.trim() || !focusedRegion) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsThinking(true);
    setErrorMsg(null);
    setAiResponse('▋'); // streaming cursor

    const region = BRAIN_REGIONS.find(r => r.id === focusedRegion);
    try {
      const config = await loadLLMConfig();
      if (!config.endpoint) {
        setErrorMsg('No LLM endpoint configured — open Bridge → LLM to set one.');
        return;
      }

      // Inject sovereign context into the region's system prompt
      const { coherence, dynamicSlots, openOverlay } = useSovereignStore.getState();
      const systemPrompt = buildSystemContext(region!.prompt, {
        activeRoom:  openOverlay ?? 'BRAIN',
        entropy:     1.0 - (coherence ?? 0.99),
        activeSlots: Object.values(dynamicSlots).filter(Boolean).length,
      });

      let accumulated = '';
      for await (const chunk of streamChat(
        [
          { role: 'system',  content: systemPrompt },
          { role: 'user',    content: taskInput },
        ],
        config,
        abort.signal,
      )) {
        accumulated += chunk;
        setAiResponse(accumulated + '▋');
      }
      setAiResponse(accumulated); // strip cursor when done
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setErrorMsg(`Neural Link Unstable: ${err instanceof Error ? err.message : 'Connection failed'}`);
      setAiResponse(null);
    } finally {
      setIsThinking(false);
      if (abortRef.current === abort) abortRef.current = null;
    }
  };

  const activeRegions = new Set<string>();
  connectedAPIs.forEach((apiId) => {
    const api = API_CONNECTIONS.find((a) => a.id === apiId);
    if (api) api.regions.forEach((r) => activeRegions.add(r));
  });

  const pulseVal = Math.sin(pulsePhase) * 0.5 + 0.5;
  const cx = 300, cy = 200, r = 180;
  const focusedRegionData = focusedRegion ? BRAIN_REGIONS.find(r => r.id === focusedRegion) : null;
  const spoonColor = spoons <= 2 ? ROSE : spoons <= 4 ? AMBER : PHOSPHOR;

  return (
    <div style={{
      height: '100%',
      background: BG,
      color: PHOSPHOR,
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${PHOSPHOR}22`,
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28, color: PHOSPHOR, textShadow: `0 0 12px ${PHOSPHOR_GLOW}` }}>{'\u2B21'}</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, color: PHOSPHOR, textShadow: `0 0 8px ${PHOSPHOR_GLOW}` }}>
              QUANTUM BRAIN
            </div>
            <div style={{ fontSize: 12, letterSpacing: 2, color: PHOSPHOR, opacity: 0.4, marginTop: 2 }}>
              COGNITIVE ARCHITECTURE
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Spoon indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, letterSpacing: 2, color: spoonColor, textShadow: `0 0 6px ${spoonColor}66` }}>ENERGY</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  onClick={() => setSpoons(i + 1)}
                  style={{
                    width: 12, height: 24, borderRadius: 3, cursor: 'pointer',
                    minWidth: 12, minHeight: 24,
                    background: i < spoons ? spoonColor : `${PHOSPHOR}11`,
                    boxShadow: i < spoons ? `0 0 6px ${spoonColor}66` : 'none',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 16, color: spoonColor, fontWeight: 700, textShadow: `0 0 8px ${spoonColor}66` }}>
              {spoons}/7
            </span>
          </div>
          {/* Phase indicator */}
          <div style={{
            padding: '6px 14px',
            borderRadius: 4,
            fontSize: 13,
            letterSpacing: 3,
            fontWeight: 700,
            background: phase === 'focused'
              ? `${focusedRegionData?.color || PHOSPHOR}22`
              : phase === 'connecting' ? `${PHOSPHOR}11` : `${PHOSPHOR}08`,
            color: phase === 'focused'
              ? focusedRegionData?.color || PHOSPHOR
              : phase === 'connecting' ? PHOSPHOR : `${PHOSPHOR}55`,
            border: `1px solid ${phase === 'focused'
              ? `${focusedRegionData?.color || PHOSPHOR}44`
              : phase === 'connecting' ? `${PHOSPHOR}33` : `${PHOSPHOR}11`}`,
            textShadow: phase !== 'landing' ? `0 0 8px currentColor` : 'none',
          }}>
            {phase === 'focused' ? `${focusedRegionData?.label}` : phase === 'connecting' ? 'READY' : 'IDLE'}
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100% - 72px)', position: 'relative' }}>
        {/* LEFT: API Connections */}
        <div style={{
          width: phase === 'focused' ? 220 : 280,
          padding: '20px 16px',
          borderRight: `1px solid ${PHOSPHOR}11`,
          overflowY: 'auto',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: PHOSPHOR, marginBottom: 16, fontWeight: 700, textShadow: `0 0 6px ${PHOSPHOR_GLOW}` }}>
            PATHWAYS
          </div>
          {API_CONNECTIONS.map((api) => {
            const connected = connectedAPIs.has(api.id);
            const hovered = hoveredAPI === api.id;
            return (
              <div
                key={api.id}
                role="button"
                tabIndex={0}
                aria-pressed={connected}
                onClick={() => toggleAPI(api.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAPI(api.id); } }}
                onMouseEnter={() => setHoveredAPI(api.id)}
                onMouseLeave={() => setHoveredAPI(null)}
                style={{
                  padding: '12px 14px',
                  marginBottom: 8,
                  borderRadius: 6,
                  cursor: 'pointer',
                  minHeight: 48,
                  display: 'flex',
                  alignItems: 'center',
                  border: `1px solid ${connected ? `${api.color}66` : hovered ? `${PHOSPHOR}22` : `${PHOSPHOR}0A`}`,
                  background: connected ? `${api.color}15` : hovered ? `${PHOSPHOR}08` : 'transparent',
                  transition: 'all 0.25s',
                }}
              >
                <span style={{
                  fontSize: 22,
                  color: connected ? api.color : `${PHOSPHOR}33`,
                  transition: 'color 0.3s',
                  filter: connected ? `drop-shadow(0 0 6px ${api.color}88)` : 'none',
                  marginRight: 12,
                  flexShrink: 0,
                }}>
                  {api.icon}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: connected ? api.color : `${PHOSPHOR}55`,
                    textShadow: connected ? `0 0 8px ${api.color}44` : 'none',
                    transition: 'color 0.3s',
                  }}>
                    {api.name}
                  </div>
                  <div style={{ fontSize: 11, color: connected ? `${api.color}88` : `${PHOSPHOR}22`, marginTop: 2 }}>
                    {api.sub}
                  </div>
                </div>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: connected ? api.color : `${PHOSPHOR}11`,
                  boxShadow: connected ? `0 0 10px ${api.color}AA` : 'none',
                  transition: 'all 0.3s',
                }} />
              </div>
            );
          })}
        </div>

        {/* CENTER: The Brain — zoomable/pannable */}
        <div
          ref={brainRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
        >
          <svg
            viewBox="0 0 600 400"
            style={{
              width: '100%',
              height: phase === 'focused' ? '50%' : '80%',
              maxHeight: 'none',
              transition: 'height 0.5s',
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: 'center center',
            }}
          >
            <defs>
              <radialGradient id="brainGlow" cx="50%" cy="45%">
                <stop offset="0%" stopColor={PHOSPHOR} stopOpacity={phase === 'landing' ? 0.04 : 0.12 + pulseVal * 0.06} />
                <stop offset="60%" stopColor={PHOSPHOR} stopOpacity={0.02} />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <ellipse cx={cx} cy={cy} rx={r * 1.3} ry={r * 0.85} fill="url(#brainGlow)" />

            {/* Dome edges */}
            {dome.edges.map((edge, i) => {
              const n1 = dome.nodes[edge.from];
              const n2 = dome.nodes[edge.to];
              let edgeActive = false;
              let edgeColor = PHOSPHOR_DIM;
              BRAIN_REGIONS.forEach((region) => {
                if (focusedRegion && region.id !== focusedRegion) return;
                const pos = mapRegionToNode(region, cx, cy, r);
                const midX = (n1.x + n2.x) / 2;
                const midY = (n1.y + n2.y) / 2;
                const dist = Math.sqrt((pos.x - midX) ** 2 + (pos.y - midY) ** 2);
                if (dist < 90 && activeRegions.has(region.id)) {
                  edgeActive = true;
                  edgeColor = region.color;
                }
              });
              const baseOpacity = phase === 'landing' ? 0.08 : edgeActive ? 0.35 + pulseVal * 0.2 : 0.1;
              return (
                <line
                  key={i}
                  x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
                  stroke={edgeActive ? edgeColor : PHOSPHOR}
                  strokeWidth={edgeActive ? 1.5 : 0.7}
                  opacity={focusedRegion && !edgeActive ? 0.04 : baseOpacity}
                  style={{ transition: 'all 0.8s' }}
                />
              );
            })}

            {/* Dome nodes */}
            {dome.nodes.map((node, i) => {
              let nodeActive = false;
              let nodeColor = PHOSPHOR;
              BRAIN_REGIONS.forEach((region) => {
                if (focusedRegion && region.id !== focusedRegion) return;
                const pos = mapRegionToNode(region, cx, cy, r);
                const dist = Math.sqrt((pos.x - node.x) ** 2 + (pos.y - node.y) ** 2);
                if (dist < 80 && activeRegions.has(region.id)) {
                  nodeActive = true;
                  nodeColor = region.color;
                }
              });
              return (
                <circle
                  key={i}
                  cx={node.x} cy={node.y}
                  r={nodeActive ? 3 + pulseVal * 1.5 : 2}
                  fill={nodeActive ? nodeColor : PHOSPHOR}
                  opacity={focusedRegion && !nodeActive ? 0.06 : nodeActive ? 0.7 + pulseVal * 0.3 : 0.15}
                  style={{ transition: 'all 0.8s' }}
                />
              );
            })}

            {/* Region labels — bigger text, neon glow */}
            {BRAIN_REGIONS.map((region) => {
              const pos = mapRegionToNode(region, cx, cy, r);
              const isActive = activeRegions.has(region.id);
              const isFocused = focusedRegion === region.id;
              const isHovered = hoveredRegion === region.id;
              const dimmed = focusedRegion != null && !isFocused;

              return (
                <g
                  key={region.id}
                  role={isActive ? 'button' : undefined}
                  tabIndex={isActive ? 0 : undefined}
                  aria-label={isActive ? `${region.label} — ${region.desc}` : undefined}
                  {...(isActive ? { 'aria-pressed': isFocused } : {})}
                  onClick={() => isActive && enterFocus(region.id)}
                  onKeyDown={isActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enterFocus(region.id); } } : undefined}
                  onMouseEnter={() => setHoveredRegion(region.id)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{
                    cursor: isActive ? 'pointer' : 'default',
                    opacity: dimmed ? 0.1 : 1,
                    transition: 'opacity 0.5s',
                  }}
                >
                  {isActive && (
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={isFocused ? 40 + pulseVal * 5 : isHovered ? 36 : 32}
                      fill="none"
                      stroke={region.color}
                      strokeWidth={isFocused ? 2 : 1}
                      opacity={0.3 + pulseVal * 0.2}
                      style={{ transition: 'r 0.3s' }}
                    />
                  )}
                  <text
                    x={pos.x} y={pos.y - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{
                      fontSize: isFocused ? 26 : 22,
                      fill: isActive ? region.color : `${PHOSPHOR}22`,
                      filter: isActive ? 'url(#glow)' : 'none',
                      transition: 'all 0.3s',
                    }}
                  >
                    {region.icon}
                  </text>
                  <text
                    x={pos.x} y={pos.y + 14}
                    textAnchor="middle"
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 3,
                      fill: isActive ? region.color : `${PHOSPHOR}18`,
                      transition: 'fill 0.3s',
                    }}
                  >
                    {region.label}
                  </text>
                  <text
                    x={pos.x} y={pos.y + 26}
                    textAnchor="middle"
                    style={{
                      fontSize: 9,
                      fill: isActive ? `${region.color}88` : `${PHOSPHOR}0D`,
                      transition: 'fill 0.3s',
                    }}
                  >
                    {region.sub}
                  </text>
                </g>
              );
            })}

            {/* Center nucleus */}
            <circle cx={cx} cy={cy} r={14 + pulseVal * 4} fill="none" stroke={PHOSPHOR} strokeWidth={0.8} opacity={0.2 + pulseVal * 0.15} />
            <circle cx={cx} cy={cy} r={5 + pulseVal * 1.5} fill={PHOSPHOR} opacity={phase === 'landing' ? 0.15 : 0.4 + pulseVal * 0.3} filter="url(#softGlow)" />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 8, fill: PHOSPHOR, opacity: 0.6, letterSpacing: 2, fontWeight: 700 }}>
              P31
            </text>
          </svg>

          {/* Zoom controls — touch friendly */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 20 }}>
            <button aria-label="Zoom in" onClick={() => setZoom(z => Math.min(4, z * 1.3))} style={{
              width: 48, height: 48, borderRadius: 8, border: `1px solid ${PHOSPHOR}33`,
              background: `${PHOSPHOR}11`, color: PHOSPHOR, fontSize: 24, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textShadow: `0 0 8px ${PHOSPHOR_GLOW}`,
            }} aria-hidden="false"><span aria-hidden="true">+</span></button>
            <button aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.5, z / 1.3))} style={{
              width: 48, height: 48, borderRadius: 8, border: `1px solid ${PHOSPHOR}33`,
              background: `${PHOSPHOR}11`, color: PHOSPHOR, fontSize: 24, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textShadow: `0 0 8px ${PHOSPHOR_GLOW}`,
            }}><span aria-hidden="true">{'\u2212'}</span></button>
            <button aria-label="Reset zoom to 1:1" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{
              width: 48, height: 48, borderRadius: 8, border: `1px solid ${PHOSPHOR}33`,
              background: `${PHOSPHOR}11`, color: PHOSPHOR, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              textShadow: `0 0 8px ${PHOSPHOR_GLOW}`, letterSpacing: 1,
            }}><span aria-hidden="true">1:1</span></button>
          </div>

          {/* Focus mode task panel */}
          {showTask && (
            <div style={{
              width: '92%',
              maxWidth: 620,
              padding: '18px 22px',
              background: PANEL_BG,
              borderRadius: 10,
              border: `1px solid ${focusedRegionData?.color || PHOSPHOR}44`,
              position: 'relative',
              zIndex: 20,
              maxHeight: '45vh',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 22,
                    color: focusedRegionData?.color,
                    filter: `drop-shadow(0 0 8px ${focusedRegionData?.color}88)`,
                  }}>
                    {focusedRegionData?.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: focusedRegionData?.color, letterSpacing: 2, textShadow: `0 0 8px ${focusedRegionData?.color}44` }}>
                      {focusedRegionData?.label}
                    </div>
                    <div style={{ fontSize: 12, color: `${PHOSPHOR}55` }}>
                      {focusedRegionData?.desc}
                    </div>
                  </div>
                </div>
                <button
                  onClick={exitFocus}
                  style={{
                    background: `${PHOSPHOR}11`,
                    border: `1px solid ${PHOSPHOR}33`,
                    color: PHOSPHOR,
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontSize: 13,
                    cursor: 'pointer',
                    letterSpacing: 2,
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    minHeight: 48,
                    textShadow: `0 0 6px ${PHOSPHOR_GLOW}`,
                  }}
                >
                  EXIT
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEngage()}
                  placeholder="Type your query..."
                  style={{
                    flex: 1,
                    background: `${PHOSPHOR}08`,
                    border: `1px solid ${PHOSPHOR}22`,
                    borderRadius: 8,
                    padding: '14px 16px',
                    color: PHOSPHOR,
                    fontSize: 15,
                    fontFamily: 'inherit',
                    outline: 'none',
                    minHeight: 48,
                  }}
                  onFocus={(e) => { e.target.style.borderColor = (focusedRegionData?.color || PHOSPHOR) + '66'; }}
                  onBlur={(e) => { e.target.style.borderColor = `${PHOSPHOR}22`; }}
                />
                <button
                  onClick={handleEngage}
                  disabled={isThinking}
                  style={{
                    background: `${focusedRegionData?.color || PHOSPHOR}22`,
                    border: `1px solid ${focusedRegionData?.color || PHOSPHOR}55`,
                    color: focusedRegionData?.color || PHOSPHOR,
                    borderRadius: 8,
                    padding: '14px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 3,
                    cursor: isThinking ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    minHeight: 48,
                    minWidth: 100,
                    opacity: isThinking ? 0.6 : 1,
                    textShadow: `0 0 8px currentColor`,
                  }}
                >
                  {isThinking ? '...' : 'GO'}
                </button>
              </div>

              {/* role="log" container must be in the DOM BEFORE content is injected
                  so screen readers register the live region. Conditionally rendering
                  it means ATs miss the first announcement. Collapse visually when empty. */}
              <div
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-label="AI response"
                style={{
                  marginTop: aiResponse || errorMsg ? 14 : 0,
                  background: `${PHOSPHOR}06`,
                  borderRadius: 8,
                  border: `1px solid ${errorMsg ? ROSE : (focusedRegionData?.color || PHOSPHOR)}33`,
                  padding: aiResponse || errorMsg ? 16 : 0,
                  overflowY: 'auto',
                  flex: aiResponse || errorMsg ? 1 : 'none',
                  minHeight: 0,
                  transition: 'padding 0.15s ease-out, margin 0.15s ease-out',
                  contain: 'layout paint',
                }}
              >
                {errorMsg ? (
                  /* role="alert" = assertive live region — announces error immediately */
                  <div role="alert" style={{ color: ROSE, fontSize: 14, textShadow: `0 0 6px ${ROSE}44` }}>
                    {errorMsg}
                  </div>
                ) : aiResponse ? (
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: PHOSPHOR, whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                    {aiResponse}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {phase === 'landing' && (
            <div style={{ textAlign: 'center', marginTop: 24, padding: '0 40px' }}>
              <div style={{ fontSize: 16, color: PHOSPHOR, letterSpacing: 3, marginBottom: 8, textShadow: `0 0 10px ${PHOSPHOR_GLOW}` }}>
                CONNECT PATHWAYS TO ACTIVATE
              </div>
              <div style={{ fontSize: 13, color: `${PHOSPHOR}44`, maxWidth: 400, margin: '0 auto', lineHeight: 1.7 }}>
                Select APIs on the left to light up brain regions.
              </div>
            </div>
          )}

          {phase === 'connecting' && !showTask && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <div style={{ fontSize: 15, color: PHOSPHOR, letterSpacing: 3, textShadow: `0 0 8px ${PHOSPHOR_GLOW}` }}>
                {activeRegions.size} REGION{activeRegions.size !== 1 ? 'S' : ''} ACTIVE — TAP ONE
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Status panel */}
        <div style={{
          width: phase === 'focused' ? 220 : 240,
          padding: '20px 16px',
          borderLeft: `1px solid ${PHOSPHOR}11`,
          overflowY: 'auto',
          transition: 'width 0.5s',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: PHOSPHOR, marginBottom: 16, fontWeight: 700, textShadow: `0 0 6px ${PHOSPHOR_GLOW}` }}>
            STATUS
          </div>

          {/* Harmonic ratio */}
          <div style={{
            padding: '14px',
            background: `${PHOSPHOR}06`,
            borderRadius: 8,
            marginBottom: 10,
            border: `1px solid ${PHOSPHOR}11`,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: `${PHOSPHOR}55`, marginBottom: 6 }}>HARMONIC (H)</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: PHOSPHOR, textShadow: `0 0 12px ${PHOSPHOR_GLOW}` }}>0.35</span>
              <span style={{ fontSize: 11, color: `${PHOSPHOR}44` }}>TARGET</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: `${PHOSPHOR}11`, marginTop: 8, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%',
                background: `linear-gradient(90deg, ${PHOSPHOR}66, ${PHOSPHOR})`,
                borderRadius: 2,
                boxShadow: `0 0 8px ${PHOSPHOR_GLOW}`,
              }} />
            </div>
          </div>

          {/* Active swarms */}
          <div style={{
            padding: '14px',
            background: `${PHOSPHOR}06`,
            borderRadius: 8,
            marginBottom: 10,
            border: `1px solid ${PHOSPHOR}11`,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: `${PHOSPHOR}55`, marginBottom: 8 }}>SWARMS</div>
            {[
              { name: 'ALPHA', status: 'SSA Prep', color: ROSE },
              { name: 'BETA', status: '3 essays', color: VIOLET },
              { name: 'GAMMA', status: 'Court', color: AMBER },
              { name: 'DELTA', status: 'Cleanup', color: CYAN },
              { name: 'IOTA', status: 'Always on', color: PHOSPHOR },
            ].map((swarm) => (
              <div key={swarm.name} style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 13,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: swarm.color,
                  boxShadow: `0 0 6px ${swarm.color}88`,
                  flexShrink: 0,
                }} />
                <span style={{ color: swarm.color, fontWeight: 700, width: 56, textShadow: `0 0 4px ${swarm.color}44` }}>{swarm.name}</span>
                <span style={{ color: `${PHOSPHOR}44` }}>{swarm.status}</span>
              </div>
            ))}
          </div>

          {/* Deadlines */}
          <div style={{
            padding: '14px',
            background: `${PHOSPHOR}06`,
            borderRadius: 8,
            marginBottom: 10,
            border: `1px solid ${PHOSPHOR}11`,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: `${PHOSPHOR}55`, marginBottom: 8 }}>DEADLINES</div>
            {[
              { date: 'MAR 10', label: 'BONDING Ship', urgent: true },
              { date: 'MAR 12', label: 'Court', urgent: true },
              { date: 'SEP 26', label: 'OPM', urgent: false },
            ].map((d, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, fontSize: 13,
              }}>
                <span style={{
                  color: d.urgent ? ROSE : `${PHOSPHOR}44`,
                  fontWeight: d.urgent ? 700 : 400,
                  textShadow: d.urgent ? `0 0 6px ${ROSE}44` : 'none',
                }}>
                  {d.date}
                </span>
                <span style={{ color: `${PHOSPHOR}44` }}>{d.label}</span>
              </div>
            ))}
          </div>

          {/* Context cache */}
          <div style={{
            padding: '14px',
            background: `${PHOSPHOR}06`,
            borderRadius: 8,
            border: `1px solid ${PHOSPHOR}11`,
          }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: `${PHOSPHOR}55`, marginBottom: 8 }}>CACHE</div>
            <div style={{ fontSize: 13, color: `${PHOSPHOR}66`, lineHeight: 1.7 }}>
              <div>Sessions: <span style={{ color: PHOSPHOR, textShadow: `0 0 4px ${PHOSPHOR_GLOW}` }}>70</span></div>
              <div>Words: <span style={{ color: PHOSPHOR, textShadow: `0 0 4px ${PHOSPHOR_GLOW}` }}>~2M</span></div>
              <div>Deliverables: <span style={{ color: PHOSPHOR, textShadow: `0 0 4px ${PHOSPHOR_GLOW}` }}>108</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
