// spaceship-earth/src/components/rooms/BridgeRoom.tsx
// The Bridge — LOVE economy + Phenix Donation Wallet merged dashboard.
// Tabbed layout: LOVE | WALLET | STEALTH | LEDGER | HARDWARE
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNode } from '../../contexts/NodeContext';
import { usePhenixWallet, type LogLine } from '../../hooks/usePhenixWallet';
import type { MemoEntry } from '../../services/phenixWallet';

interface Props {
  love: number;
  spoons: number;
  maxSpoons: number;
  tier: string;
}

const PINK = 'var(--magenta)';
const MINT = 'var(--mint)';
const CORAL = 'var(--coral)';
const BLUE = 'var(--blue)';
const LAVENDER = 'var(--lavender)';
const AMBER = 'var(--amber)';
const WARM_WHITE = 'var(--text)';
const DIM = 'var(--dim)';

type TabId = 'love' | 'wallet' | 'stealth' | 'ledger' | 'hardware';

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'love', label: 'LOVE', color: PINK },
  { id: 'wallet', label: 'WALLET', color: MINT },
  { id: 'stealth', label: 'STEALTH', color: BLUE },
  { id: 'ledger', label: 'LEDGER', color: AMBER },
  { id: 'hardware', label: 'HW', color: CORAL },
];

// ── Shared sub-components ──────────────────────────────────────

function useAnimatedValue(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  const frame = useRef(0);

  useEffect(() => {
    const from = prev.current;
    const delta = target - from;
    if (Math.abs(delta) < 0.01) { setDisplay(target); prev.current = target; return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * ease);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else prev.current = target;
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return display;
}

function PulseRing({ color, size = 36, value, max, label }: {
  color: string; size?: number; value: number; max: number; label: string;
}) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--neon-faint)" strokeWidth={2.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={2.5}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out', filter: `drop-shadow(0 0 4px ${color})` }} />
      <text x={size / 2} y={size / 2 - 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size > 34 ? 9 : 8} fontFamily="var(--font-display)" fontWeight={600}>
        {typeof value === 'number' ? (value < 100 ? value.toFixed(1) : Math.round(value)) : value}
      </text>
      <text x={size / 2} y={size / 2 + 8} textAnchor="middle" dominantBaseline="middle"
        fill={DIM} fontSize={6} fontFamily="var(--font-display)" letterSpacing={0.5}>
        {label}
      </text>
    </svg>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 3, background: 'var(--neon-faint)', borderRadius: 3 }}>
      <div style={{
        height: '100%', borderRadius: 3, background: color,
        width: `${pct}%`, transition: 'width 0.6s ease-out',
        boxShadow: `0 0 6px ${color}`,
      }} />
    </div>
  );
}

function Card({ title, accent, children, style }: {
  title: string; accent: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div className="glass-card" style={{
      border: `1px solid ${accent}33`, borderRadius: 'var(--radius-lg)',
      display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', ...style,
    }}>
      <div style={{
        padding: 'clamp(4px, 0.6vh, 8px) clamp(8px, 1vw, 14px)',
        borderBottom: `1px solid ${accent}18`,
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: accent,
          boxShadow: `0 0 6px ${accent}`,
        }} />
        <span style={{
          color: accent, fontSize: 'var(--fs-md)', fontWeight: 600, fontFamily: 'var(--font-display)',
          letterSpacing: '0.04em', textShadow: `0 0 10px ${accent}66`,
        }}>{title}</span>
      </div>
      <div style={{
        padding: 'clamp(6px, 1vh, 12px) clamp(8px, 1vw, 14px)',
        flex: 1, overflow: 'auto', minHeight: 0,
      }}>{children}</div>
    </div>
  );
}

const fs = {
  xs: 'var(--fs-xs)',
  sm: 'var(--fs-sm)',
  md: 'var(--fs-md)',
  lg: 'var(--fs-lg)',
  big: 'var(--fs-big)',
};

// ── LOVE TAB ───────────────────────────────────────────────────

function LoveTab({ love, spoons, maxSpoons, tier }: Props) {
  const { protocolWallet, vesting, protocolTxCount } = useNode();
  const [spendFlash, setSpendFlash] = useState<string | null>(null);

  const animLove = useAnimatedValue(love);
  const animProtocol = useAnimatedValue(protocolWallet?.totalEarned ?? 0);
  const animSpoons = useAnimatedValue(spoons);

  const handleSpend = useCallback((label: string, cost: number) => {
    const available = protocolWallet?.availableBalance ?? 0;
    if (available < cost) return;
    setSpendFlash(label);
    setTimeout(() => setSpendFlash(null), 1200);
  }, [protocolWallet]);

  const totalEarned = protocolWallet?.totalEarned ?? 0;
  const available = protocolWallet?.availableBalance ?? 0;
  const sovereignty = protocolWallet?.sovereigntyPool ?? 0;
  const careScore = protocolWallet?.careScore ?? 0;
  const spent = totalEarned - available - sovereignty;
  const tierColor = tier === 'REFLEX' ? CORAL : tier === 'PATTERN' ? AMBER : MINT;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 'var(--fs-xs)', minHeight: 0 }}>
      {/* Status bar */}
      <div className="glass-card" style={{
        display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1vw, 14px)',
        padding: 'clamp(4px, 0.5vh, 8px) clamp(8px, 1vw, 14px)',
        borderBottom: `1px solid ${PINK}18`, fontSize: fs.md, flexShrink: 0,
        borderRadius: 'var(--radius-md)', background: 'var(--s2)',
      }}>
        <span style={{ color: PINK, fontWeight: 700, letterSpacing: '0.08em', fontSize: fs.lg, textShadow: `0 0 10px ${PINK}66`, whiteSpace: 'nowrap' }}>
          Love Economy
        </span>
        <span style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 'clamp(4px, 0.6vw, 10px)', alignItems: 'center' }}>
          <PulseRing color={PINK} value={animLove} max={Math.max(1000, love)} label="GAME" size={36} />
          <PulseRing color={MINT} value={animProtocol} max={Math.max(100, totalEarned)} label="PROTO" size={36} />
          <PulseRing color={BLUE} value={animSpoons} max={maxSpoons} label="SPOONS" size={36} />
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ color: DIM, fontSize: fs.sm, whiteSpace: 'nowrap' }}>{spoons}/{maxSpoons}</span>
        <span style={{
          color: tierColor, fontWeight: 600, fontSize: fs.xs,
          padding: '1px 6px', borderRadius: 'var(--radius-sm)',
          border: `1px solid ${tierColor}44`, background: `${tierColor}11`,
        }}>{tier}</span>
      </div>

      {/* 2x2 responsive card grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--fs-xs)',
        minHeight: 0,
        overflowY: 'auto',
        paddingBottom: 12
      }}>
        <Card title="Game Love" accent={PINK}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: fs.sm }}>
            <span style={{ color: PINK }}>From Bonding</span>
            <span style={{ color: DIM }}>live sync</span>
          </div>
          <div style={{ fontSize: fs.big, fontWeight: 300, color: PINK, textShadow: `0 0 16px ${PINK}44`, margin: 'clamp(2px, 0.4vh, 6px) 0' }}>
            {Math.round(animLove).toLocaleString()}
          </div>
          <Bar value={love} max={Math.max(1, love + 100)} color={PINK} />
          <div style={{ fontSize: fs.xs, color: DIM, marginTop: 'clamp(2px, 0.4vh, 8px)', lineHeight: 1.7 }}>
            <div>Total: <span style={{ color: WARM_WHITE }}>{Math.round(love).toLocaleString()}</span></div>
            <div>Source: <span style={{ color: PINK }}>bonding handshake</span></div>
          </div>
        </Card>

        <Card title="Protocol Love" accent={MINT}>
          <div style={{ fontSize: fs.sm, color: MINT }}>Earned from play</div>
          <div style={{ fontSize: fs.big, fontWeight: 300, color: MINT, textShadow: `0 0 16px ${MINT}44`, margin: 'clamp(2px, 0.4vh, 6px) 0' }}>
            {animProtocol.toFixed(1)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(4px, 0.5vh, 8px)', fontSize: fs.sm }}>
            <div>
              <span style={{ color: DIM, fontSize: fs.xs }}>Sovereignty</span>
              <div style={{ color: LAVENDER, fontWeight: 600 }}>{sovereignty.toFixed(1)}</div>
            </div>
            <div>
              <span style={{ color: DIM, fontSize: fs.xs }}>Available</span>
              <div style={{ color: MINT, fontWeight: 600 }}>{available.toFixed(1)}</div>
            </div>
            <div>
              <span style={{ color: DIM, fontSize: fs.xs }}>Care</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: AMBER, fontWeight: 600 }}>{(careScore * 100).toFixed(0)}%</span>
                <div style={{ flex: 1 }}><Bar value={careScore} max={1} color={AMBER} /></div>
              </div>
            </div>
            <div>
              <span style={{ color: DIM, fontSize: fs.xs }}>Spent</span>
              <div style={{ color: CORAL, fontWeight: 600 }}>{spent.toFixed(1)}</div>
            </div>
          </div>
          <div style={{ fontSize: fs.xs, color: 'var(--neon-ghost)', marginTop: 'clamp(2px, 0.3vh, 6px)' }}>
            {protocolTxCount} tx
          </div>
        </Card>

        <Card title="Spend Love" accent={CORAL}>
          {[
            { label: 'Unlock Panel', desc: 'Observatory Axis', cost: 5 },
            { label: 'Gift to S.J.', desc: 'Increase vesting', cost: 10 },
            { label: 'Boost Spoons', desc: '+2 temporary', cost: 3 },
            { label: 'Donate', desc: 'P31 Labs', cost: 1 },
          ].map(item => {
            const canAfford = available >= item.cost;
            const flashing = spendFlash === item.label;
            return (
              <button type="button" key={item.label}
                onClick={() => canAfford && handleSpend(item.label, item.cost)}
                disabled={!canAfford}
                className="glass-btn"
                aria-label={`${item.label}: ${item.desc}, costs ${item.cost} love`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: 'clamp(3px, 0.4vh, 6px) 4px',
                  borderBottom: '1px solid var(--neon-ghost)',
                  width: '100%', textAlign: 'left',
                  cursor: canAfford ? 'pointer' : 'default',
                  opacity: canAfford ? 1 : 0.35,
                  minHeight: 'auto',
                  borderRadius: 'var(--radius-md)', transition: 'background var(--trans-fast)',
                  background: flashing ? 'rgba(255,0,204,0.1)' : 'transparent',
                  fontFamily: 'var(--font-display)',
                }}
              >
                <div>
                  <div style={{ color: WARM_WHITE, fontSize: fs.sm, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: fs.xs, color: DIM }}>{item.desc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: canAfford ? CORAL : DIM, fontSize: fs.md, fontWeight: 600 }}>{item.cost}</span>
                  <div style={{ fontSize: 'clamp(7px, 0.8vh, 8px)', color: DIM }}>LOVE</div>
                </div>
              </button>
            );
          })}
        </Card>

        <Card title="Vesting" accent={BLUE}>
          {vesting.map((v) => (
            <div key={v.node.initials} style={{ marginBottom: 'clamp(8px, 1vh, 12px)' }}>
              {/* Kid-friendly header with avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 0.8vw, 8px)', marginBottom: 'clamp(4px, 0.5vh, 6px)' }}>
                <span style={{ 
                  fontSize: 'clamp(16px, 2vw, 20px)', 
                  lineHeight: 1,
                  filter: v.vestedPercent >= 100 ? 'drop-shadow(0 0 4px var(--mint))' : 'none'
                }}>
                  {v.node.name === 'Bashium' ? '🧬' : v.node.name === 'Willium' ? '🌱' : '⭐'}
                </span>
                <span style={{ color: WARM_WHITE, fontWeight: 600, fontSize: fs.md }}>{v.node.name}</span>
                <span style={{ color: DIM, fontSize: fs.xs }}>({v.node.initials})</span>
              </div>
              
              {/* Progress bar with milestone markers */}
              <div style={{ position: 'relative', height: 'clamp(16px, 2vh, 20px)', marginBottom: 'clamp(2px, 0.3vh, 4px)' }}>
                <Bar value={v.vestedPercent} max={100} color={BLUE} />
                {/* All 5 milestone markers */}
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: '100%', 
                  pointerEvents: 'none' 
                }}>
                  {v.milestones.map((m, i) => {
                    const pos = m.milestone.cumulativePercent;
                    return (
                      <div
                        key={m.milestone.ageYears}
                        style={{
                          position: 'absolute',
                          left: `${pos}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: 'clamp(8px, 1vw, 10px)',
                          height: 'clamp(8px, 1vw, 10px)',
                          borderRadius: '50%',
                          backgroundColor: m.reached ? (i === v.milestones.length - 1 ? 'var(--mint)' : 'var(--phosphor)') : 'var(--bg)',
                          border: `2px solid ${m.reached ? 'transparent' : DIM}`,
                          boxShadow: m.reached ? `0 0 6px var(--phosphor)` : 'none',
                          zIndex: 1,
                        }}
                        title={`Age ${m.milestone.ageYears}: ${m.milestone.cumulativePercent}% - ${m.milestone.description}`}
                      />
                    );
                  })}
                </div>
              </div>
              
              {/* Age and vesting info */}
              <div style={{ fontSize: fs.sm, color: DIM, lineHeight: 1.4 }}>
                <span style={{ color: BLUE, fontWeight: 600 }}>{v.vestedPercent.toFixed(0)}%</span>
                {' '}vested — Age {v.ageYears}
                {v.vestedAmount > 0 && (
                  <span style={{ color: 'var(--mint)' }}> • {v.vestedAmount.toFixed(1)} LOVE</span>
                )}
              </div>
              
              {/* Next milestone countdown */}
              {v.nextMilestone && v.daysUntilNext !== null && (
                <div style={{ 
                  fontSize: fs.xs, 
                  color: v.daysUntilNext <= 30 ? CORAL : 'var(--neon-ghost)', 
                  marginTop: 2 
                }}>
                  🎯 {v.nextMilestone.description} at age {v.nextMilestone.ageYears}
                  {v.daysUntilNext > 0 ? ` (${v.daysUntilNext.toLocaleString()} days)` : ' — TODAY!'}
                </div>
              )}
              
              {/* Celebration for fully vested */}
              {v.vestedPercent >= 100 && (
                <div style={{ 
                  fontSize: fs.sm, 
                  color: 'var(--mint)', 
                  marginTop: 4,
                  animation: 'pulse 1s ease-in-out infinite'
                }}>
                  ✨ Fully Vested! ✨
                </div>
              )}
            </div>
          ))}
          {vesting.length === 0 && (
            <div style={{ fontSize: fs.sm, color: DIM, fontStyle: 'italic' }}>No vesting schedules yet.</div>
          )}
          
          {/* Legend for all milestones */}
          <div style={{ 
            marginTop: 'clamp(8px, 1vh, 10px)', 
            paddingTop: 'clamp(6px, 0.8vh, 8px)', 
            borderTop: '1px solid var(--border)', 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 'clamp(4px, 0.5vw, 6px)' 
          }}>
            {[
              { age: 13, desc: 'First device' },
              { age: 16, desc: 'Expanded autonomy' },
              { age: 18, desc: 'Legal majority' },
              { age: 21, desc: 'Full adult' },
              { age: 25, desc: 'Full sovereignty' },
            ].map((m) => (
              <div 
                key={m.age} 
                style={{ 
                  fontSize: fs.xs - 1, 
                  color: DIM,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ color: BLUE, fontWeight: 600 }}>{m.age}</span>
                <span>{m.desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── WALLET TAB ─────────────────────────────────────────────────

function WalletTab({ wallet }: { wallet: ReturnType<typeof usePhenixWallet> }) {
  const { state, loading, error, createWallet, unlock, lock, clearError } = wallet;
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  if (!state.exists) {
    return (
      <Card title="Genesis Gate" accent={MINT} style={{ flex: 1 }}>
        <div style={{ fontSize: fs.sm, color: DIM, marginBottom: 8 }}>
          Initialize your sovereign donation vault. AES-256-GCM encrypted, PBKDF2 600K iterations.
        </div>
        <input
          type="password"
          placeholder="Vault password (8+ chars)"
          aria-label="Password"
          className="glass-input"
          value={pw}
          onChange={e => setPw(e.target.value)}
          style={{ background: 'var(--s3)' }}
        />
        <input
          type="password"
          placeholder="Confirm password"
          aria-label="Confirm password"
          className="glass-input"
          value={confirmPw}
          onChange={e => setConfirmPw(e.target.value)}
          style={{ marginTop: 6, background: 'var(--s3)' }}
          onKeyDown={e => {
            if (e.key === 'Enter' && pw.length >= 8 && pw === confirmPw) createWallet(pw);
          }}
        />
        {error && <div style={{ color: CORAL, fontSize: fs.xs, marginTop: 6 }}>{error}</div>}
        <button
          disabled={loading || pw.length < 8 || pw !== confirmPw}
          onClick={() => { clearError(); createWallet(pw); }}
          className="glass-btn"
          style={{ color: MINT, borderColor: `${MINT}44`, marginTop: 10, width: '100%' }}
        >
          {loading ? 'GENERATING KEYS...' : 'Initialize Genesis Gate'}
        </button>
        {pw.length > 0 && pw.length < 8 && (
          <div style={{ color: AMBER, fontSize: fs.xs, marginTop: 4 }}>Min 8 characters</div>
        )}
        {confirmPw.length > 0 && pw !== confirmPw && (
          <div style={{ color: CORAL, fontSize: fs.xs, marginTop: 4 }}>Passwords don't match</div>
        )}
      </Card>
    );
  }

  if (!state.unlocked) {
    return (
      <Card title="Unlock Vault" accent={LAVENDER} style={{ flex: 1 }}>
        <div style={{ fontSize: fs.sm, color: DIM, marginBottom: 8 }}>
          Enter your vault password to unseal the Phenix wallet.
        </div>
        <input
          type="password"
          placeholder="Vault password"
          aria-label="Password"
          className="glass-input"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && pw) { clearError(); unlock(pw); }
          }}
        />
        {error && <div style={{ color: CORAL, fontSize: fs.xs, marginTop: 6 }}>{error}</div>}
        <button
          disabled={loading || !pw}
          onClick={() => { clearError(); unlock(pw); }}
          className="glass-btn"
          style={{ color: LAVENDER, borderColor: `${LAVENDER}44`, marginTop: 10, width: '100%' }}
        >
          {loading ? 'DECRYPTING...' : 'Unlock Vault'}
        </button>
      </Card>
    );
  }

  // Dashboard
  const metaHex = state.metaAddress ? state.metaAddress.replace('st:eth:0x', '') : '';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8, minHeight: 0 }}>
      {/* Balance card */}
      <Card title="Phenix Wallet" accent={MINT}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: fs.xs, color: DIM }}>Total Balance</div>
            <div style={{ fontSize: fs.big, fontWeight: 300, color: MINT, textShadow: `0 0 16px ${MINT}44` }}>
              {state.totalETH.toFixed(4)} <span style={{ fontSize: fs.sm, color: DIM }}>ETH</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: fs.xs, color: DIM }}>Donations</div>
            <div style={{ fontSize: fs.lg, color: BLUE, fontWeight: 600 }}>{state.donationCount}</div>
          </div>
        </div>
        <Bar value={state.totalETH} max={Math.max(1, state.totalETH + 0.1)} color={MINT} />
      </Card>

      {/* Meta-address */}
      <Card title="Stealth Meta-Address" accent={BLUE}>
        <button
          type="button"
          onClick={() => { if (state.metaAddress) navigator.clipboard.writeText(state.metaAddress); }}
          className="glass-btn"
          aria-label="Copy stealth meta-address to clipboard"
          style={{
            fontSize: fs.xs, fontFamily: 'var(--font-data)', color: BLUE,
            padding: '6px 8px', background: 'var(--s1)', borderRadius: 'var(--radius-sm)',
            border: `1px solid ${BLUE}22`, wordBreak: 'break-all',
            width: '100%', textAlign: 'left', minHeight: 'auto'
          }}
          title="Click to copy"
        >
          st:eth:0x{metaHex.slice(0, 20)}...{metaHex.slice(-20)}
        </button>
        <div style={{ fontSize: fs.xs, color: DIM, marginTop: 4 }}>Click to copy full meta-address</div>
      </Card>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => wallet.refreshBalances()} className="glass-btn" style={{ flex: 1, color: MINT, borderColor: `${MINT}33` }}>
          Refresh Balances
        </button>
        <button onClick={lock} className="glass-btn" style={{ flex: 1, color: CORAL, borderColor: `${CORAL}33` }}>
          Lock Vault
        </button>
      </div>
    </div>
  );
}

// ── STEALTH TAB ────────────────────────────────────────────────

function StealthTab({ wallet }: { wallet: ReturnType<typeof usePhenixWallet> }) {
  const { state } = wallet;

  if (!state.unlocked) {
    return <LockedMessage />;
  }

  return (
    <Card title={`Stealth Addresses (${state.stealthAddresses.length})`} accent={BLUE} style={{ flex: 1 }}>
      {state.stealthAddresses.length === 0 ? (
        <div style={{ fontSize: fs.sm, color: DIM, textAlign: 'center', padding: 20 }}>
          No donations detected yet.
          <div style={{ marginTop: 8, fontSize: fs.xs }}>
            Share your meta-address to receive stealth donations.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {state.stealthAddresses.map((sa, i) => (
            <div key={i} className="glass-card" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 8px', background: 'var(--s1)', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${BLUE}15`,
            }}>
              <div>
                <div style={{ fontSize: fs.sm, fontFamily: 'var(--font-data)', color: BLUE }}>
                  {sa.address.slice(0, 10)}...{sa.address.slice(-8)}
                </div>
                <div style={{ fontSize: fs.xs, color: DIM }}>{sa.detectedAt?.slice(0, 10) || 'unknown'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: fs.md, color: MINT, fontWeight: 600 }}>
                  {sa.balance ? parseFloat(sa.balance).toFixed(4) : '?.????'}
                </div>
                <div style={{ fontSize: fs.xs, color: DIM }}>ETH</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── LEDGER TAB ─────────────────────────────────────────────────

function LedgerTab({ wallet }: { wallet: ReturnType<typeof usePhenixWallet> }) {
  const { state, addMemo, exportLedger, getStats } = wallet;
  const [memoType, setMemoType] = useState<MemoEntry['type']>('NOTE');
  const [memoText, setMemoText] = useState('');
  const [memoAmount, setMemoAmount] = useState('');
  const stats = getStats();

  if (!state.unlocked) {
    return <LockedMessage />;
  }

  const handleLog = () => {
    if (!memoText) return;
    addMemo({ type: memoType, memo: memoText, amount: memoAmount || null });
    setMemoText('');
    setMemoAmount('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 8, minHeight: 0 }}>
      {/* Stats */}
      <Card title="Memo-to-File Ledger" accent={AMBER}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: fs.sm }}>
          <div>
            <div style={{ color: DIM, fontSize: fs.xs }}>Entries</div>
            <div style={{ color: AMBER, fontWeight: 600 }}>{stats.totalEntries}</div>
          </div>
          <div>
            <div style={{ color: DIM, fontSize: fs.xs }}>Donations</div>
            <div style={{ color: MINT, fontWeight: 600 }}>{stats.totalDonationsETH.toFixed(2)} ETH</div>
          </div>
          <div>
            <div style={{ color: DIM, fontSize: fs.xs }}>GME Shares</div>
            <div style={{ color: BLUE, fontWeight: 600 }}>{stats.totalGMEShares}</div>
          </div>
        </div>
        <div style={{ fontSize: fs.xs, color: DIM, marginTop: 6 }}>
          Provenance: Pre-marital asset x pre-marital skill = Separate Property
        </div>
      </Card>

      {/* Log new memo */}
      <Card title="Log Memo" accent={LAVENDER}>
        <select
          value={memoType}
          onChange={e => setMemoType(e.target.value as MemoEntry['type'])}
          title="Memo type"
          aria-label="Memo type"
          className="glass-input"
          style={{ marginBottom: 6, background: 'var(--s1)', color: WARM_WHITE, minHeight: 'auto', padding: '6px 10px' }}
        >
          <option value="NOTE">Note</option>
          <option value="DONATION_RECEIVED">Donation Received</option>
          <option value="FIAT_CONVERSION">Fiat Conversion</option>
          <option value="GME_PURCHASE">GME Purchase</option>
          <option value="EXPENSE">Expense</option>
        </select>
        <textarea
          placeholder="Memo text..."
          value={memoText}
          onChange={e => setMemoText(e.target.value)}
          rows={2}
          title="Memo text"
          aria-label="Memo text"
          className="glass-input"
          style={{ resize: 'vertical', fontFamily: 'var(--font-display)', background: 'var(--s3)' }}
        />
        <input
          type="text"
          placeholder="Amount (optional)"
          aria-label="Amount"
          value={memoAmount}
          className="glass-input"
          onChange={e => setMemoAmount(e.target.value)}
          style={{ marginTop: 6, background: 'var(--s3)' }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={handleLog} disabled={!memoText}
            className="glass-btn"
            style={{ flex: 1, color: LAVENDER, borderColor: `${LAVENDER}44`, minHeight: 'auto' }}>
            Log Memo
          </button>
          <button onClick={() => exportLedger()}
            className="glass-btn"
            style={{ flex: 1, color: AMBER, borderColor: `${AMBER}33`, minHeight: 'auto' }}>
            Export OQE
          </button>
        </div>
      </Card>
    </div>
  );
}

// ── HARDWARE TAB ───────────────────────────────────────────────

function HardwareTab() {
  const [hwDevice, setHwDevice] = useState<{ name: string; connected: boolean } | null>(null);

  const connectHardware = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      const device = await nav.usb.requestDevice({
        filters: [{ vendorId: 0x303A }],
      });
      await device.open();
      if (device.configuration === null) await device.selectConfiguration(1);
      const iface = device.configuration!.interfaces[0];
      await device.claimInterface(iface.interfaceNumber);
      setHwDevice({ name: device.productName || 'ESP32-S3', connected: true });
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'NotFoundError') return;
      console.warn('[PHENIX HW]', e);
    }
  };

  return (
    <Card title="Hardware Root of Trust" accent={CORAL} style={{ flex: 1 }}>
      <div style={{ fontSize: fs.sm, color: DIM, marginBottom: 12 }}>
        Bi-Cameral Architecture: Browser = House of Commons, ESP32-S3 = House of Lords.
      </div>

      <div className="glass-card" style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
        background: 'var(--s1)', borderRadius: 'var(--radius-md)', border: `1px solid ${CORAL}22`, marginBottom: 12,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: hwDevice?.connected ? MINT : CORAL,
          boxShadow: `0 0 8px ${hwDevice?.connected ? MINT : CORAL}`,
        }} />
        <div>
          <div style={{ fontSize: fs.md, color: WARM_WHITE, fontWeight: 500 }}>
            {hwDevice?.connected ? hwDevice.name : 'No Device Connected'}
          </div>
          <div style={{ fontSize: fs.xs, color: DIM }}>
            {hwDevice?.connected ? 'Bi-Cameral bridge established' : 'WebUSB (Espressif VID 0x303A)'}
          </div>
        </div>
      </div>

      <button
        onClick={connectHardware}
        className="glass-btn"
        style={{ width: '100%', background: `${CORAL}22`, color: CORAL, borderColor: `${CORAL}44` }}
      >
        {hwDevice?.connected ? 'Reconnect Device' : 'Connect Phenix Navigator'}
      </button>

      <div style={{ fontSize: fs.xs, color: DIM, marginTop: 12, lineHeight: 1.6 }}>
        <div>Protocol: APDU (CLA 0x50)</div>
        <div>Commands: GET_INFO, SIGN_TX, SIGN_MSG, HEARTBEAT</div>
        <div>Security: WYSIWYS (What You See Is What You Sign)</div>
        <div>Physical confirmation required for all transactions.</div>
      </div>
    </Card>
  );
}

// ── TERMINAL ───────────────────────────────────────────────────

function Terminal({ logs }: { logs: LogLine[] }) {
  const termRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs]);

  const levelColor: Record<string, string> = {
    info: DIM,
    success: MINT,
    warn: AMBER,
    error: CORAL,
  };

  return (
    <div ref={termRef} className="glass-card" style={{
      background: 'rgba(5, 5, 16, 0.8)', borderRadius: 'var(--radius-sm)', padding: '6px 10px',
      fontSize: fs.xs, fontFamily: 'var(--font-data)', maxHeight: 80,
      overflow: 'auto', border: '1px solid var(--neon-ghost)',
      flexShrink: 0,
    }}>
      {logs.length === 0 && <div style={{ color: DIM }}>[ Phenix terminal ready ]</div>}
      {logs.map((line, i) => (
        <div key={i} style={{ color: levelColor[line.level] || DIM, lineHeight: 1.5 }}>
          [{line.time}] {line.message}
        </div>
      ))}
    </div>
  );
}

// ── HELPERS ────────────────────────────────────────────────────

function LockedMessage() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexDirection: 'column', justifyContent: 'center',
      flex: 1, color: DIM, fontSize: fs.md, fontFamily: 'var(--font-display)', gap: 12
    }}>
      <div style={{ fontSize: 32 }}>🔒</div>
      <div>Vault locked. Unlock from Wallet tab.</div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────

export function BridgeRoom({ love, spoons, maxSpoons, tier }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('love');
  const wallet = usePhenixWallet();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', color: WARM_WHITE, fontFamily: 'var(--font-display)',
      overflow: 'hidden', background: 'var(--s1)',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2, padding: '4px 8px',
        borderBottom: '1px solid var(--neon-ghost)',
        flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="glass-btn"
              style={{
                flex: 1, padding: '6px 4px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                border: 'none', cursor: 'pointer',
                fontSize: fs.xs, fontWeight: active ? 700 : 500,
                letterSpacing: '0.06em',
                color: active ? tab.color : DIM,
                background: active ? `${tab.color}11` : 'transparent',
                borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent',
                textShadow: active ? `0 0 10px ${tab.color}44` : 'none',
                transition: 'all var(--trans-fast)',
                minHeight: 'auto',
              }}
            >
              {tab.label}
              {tab.id === 'wallet' && wallet.state.unlocked && (
                <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: MINT, marginLeft: 4, verticalAlign: 'middle' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: 'clamp(6px, 1vh, 14px) clamp(8px, 1.2vw, 18px)',
        gap: 'clamp(4px, 0.8vh, 10px)', minHeight: 0, overflow: 'auto',
      }}>
        {activeTab === 'love' && <LoveTab love={love} spoons={spoons} maxSpoons={maxSpoons} tier={tier} />}
        {activeTab === 'wallet' && <WalletTab wallet={wallet} />}
        {activeTab === 'stealth' && <StealthTab wallet={wallet} />}
        {activeTab === 'ledger' && <LedgerTab wallet={wallet} />}
        {activeTab === 'hardware' && <HardwareTab />}
      </div>

      {/* Terminal */}
      <Terminal logs={wallet.logs} />
    </div>
  );
}

