// ═══════════════════════════════════════════════════════
// BONDING — P31 Labs
// Avatar Display Component: Shows user's badges and progress
//
// Phase 4: Avatar System
// Visual badge collection for kids ages 6-8
// ═══════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  BADGES,
  getLevelForBonds,
  getLevelProgress,
  getNextLevel,
  getEarnedBadgesCount,
  getTotalBadgesCount,
  type Badge,
} from '../engine/achievements';
import { useProgressStore } from '../store/progressStore';

// ── Types ──

interface AvatarDisplayProps {
  /** Show expanded badge list */
  expanded?: boolean;
  /** Callback when a badge is earned */
  onBadgeEarn?: (badge: Badge) => void;
}

// ── Sub-components ──

/** Single badge display with progress ring */
<<<<<<< HEAD
function BadgeItem({ 
  badge, 
  progress,
  isNew,
}: { 
=======
function BadgeItem({
  badge,
  progress,
  isNew,
}: {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  badge: Badge;
  progress: { current: number; target: number; earned: boolean };
  isNew?: boolean;
}) {
  const [showCelebration, setShowCelebration] = useState(isNew);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setShowCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);
<<<<<<< HEAD
  
  return (
    <div 
=======

  return (
    <div
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      className={`badge-item ${progress.earned ? 'earned' : 'locked'} ${showCelebration ? 'celebrating' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px',
        margin: '4px',
        borderRadius: '12px',
<<<<<<< HEAD
        background: progress.earned 
          ? 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,212,255,0.1))'
          : 'rgba(255,255,255,0.05)',
        border: progress.earned 
=======
        background: progress.earned
          ? 'linear-gradient(135deg, rgba(0,255,136,0.2), rgba(0,212,255,0.1))'
          : 'rgba(255,255,255,0.05)',
        border: progress.earned
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          ? '2px solid rgba(0,255,136,0.5)'
          : '2px solid rgba(255,255,255,0.1)',
        opacity: progress.earned ? 1 : 0.5,
        transform: showCelebration ? 'scale(1.1)' : 'scale(1)',
        transition: 'all 0.3s ease',
        animation: showCelebration ? 'badgePop 0.5s ease-out' : 'none',
      }}
    >
      <div className="badge-icon" style={{ fontSize: '32px' }}>
        {progress.earned ? badge.icon : '🔒'}
      </div>
<<<<<<< HEAD
      <div className="badge-name" style={{ 
        fontSize: '12px', 
=======
      <div className="badge-name" style={{
        fontSize: '12px',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        color: '#E8ECF4',
        marginTop: '4px',
        textAlign: 'center',
        maxWidth: '60px',
      }}>
        {badge.name}
      </div>
      {!progress.earned && (
        <div className="badge-progress" style={{
          fontSize: '10px',
          color: 'rgba(232,236,244,0.6)',
          marginTop: '2px',
        }}>
          {progress.current}/{progress.target}
        </div>
      )}
    </div>
  );
}

/** Level progress bar component */
function LevelProgress({ bonds }: { bonds: number }) {
  const level = getLevelForBonds(bonds);
  const progress = getLevelProgress(bonds);
  const nextLevel = getNextLevel(bonds);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return (
    <div className="level-progress" style={{
      padding: '16px',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '16px',
      border: '1px solid rgba(0,255,136,0.3)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '28px' }}>{level.icon}</span>
          <div>
<<<<<<< HEAD
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#00FF88',
            }}>
              {level.title}
            </div>
            <div style={{ 
              fontSize: '12px', 
=======
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'var(--color-phosphor)',
            }}>
              {level.title}
            </div>
            <div style={{
              fontSize: '12px',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              color: 'rgba(232,236,244,0.7)',
            }}>
              Level {level.level}
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}>
<<<<<<< HEAD
          <div style={{ 
            fontSize: '14px', 
=======
          <div style={{
            fontSize: '14px',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            color: '#00D4FF',
            fontWeight: 'bold',
          }}>
            {bonds} bonds
          </div>
          {nextLevel && (
<<<<<<< HEAD
            <div style={{ 
              fontSize: '11px', 
=======
            <div style={{
              fontSize: '11px',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              color: 'rgba(232,236,244,0.6)',
            }}>
              {nextLevel.requiredBonds - bonds} to {nextLevel.title} {nextLevel.icon}
            </div>
          )}
        </div>
      </div>
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      {/* Progress bar */}
      <div style={{
        height: '12px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${progress * 100}%`,
<<<<<<< HEAD
          background: 'linear-gradient(90deg, #00FF88, #00D4FF)',
=======
          background: 'linear-gradient(90deg, var(--color-phosphor), #00D4FF)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          borderRadius: '6px',
          transition: 'width 0.5s ease-out',
        }} />
      </div>
    </div>
  );
}

/** Stats summary component */
<<<<<<< HEAD
function StatsSummary({ 
  bonds, 
  molecules, 
  unique,
  familySessions,
  playMinutes,
}: { 
=======
function StatsSummary({
  bonds,
  molecules,
  unique,
  familySessions,
  playMinutes,
}: {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  bonds: number;
  molecules: number;
  unique: number;
  familySessions: number;
  playMinutes: number;
}) {
  const stats = [
    { icon: '🔗', value: bonds, label: 'Bonds' },
    { icon: '🧱', value: molecules, label: 'Molecules' },
    { icon: '🔍', value: unique, label: 'Found' },
    { icon: '👨‍👩‍👧‍👦', value: familySessions, label: 'Family Play' },
    { icon: '⏱️', value: playMinutes, label: 'Minutes' },
  ];
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return (
    <div className="stats-summary" style={{
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px',
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '12px',
      marginTop: '12px',
    }}>
      {stats.map((stat) => (
        <div key={stat.label} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{ fontSize: '20px' }}>{stat.icon}</span>
<<<<<<< HEAD
          <span style={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#00FF88',
          }}>
            {stat.value}
          </span>
          <span style={{ 
            fontSize: '10px', 
=======
          <span style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: 'var(--color-phosphor)',
          }}>
            {stat.value}
          </span>
          <span style={{
            fontSize: '10px',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            color: 'rgba(232,236,244,0.6)',
          }}>
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Celebration animation overlay */
<<<<<<< HEAD
function CelebrationOverlay({ 
  badge, 
  onComplete 
}: { 
  badge: Badge; 
=======
function CelebrationOverlay({
  badge,
  onComplete
}: {
  badge: Badge;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return (
    <div className="celebration-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        fontSize: '80px',
        animation: 'bounce 0.6s ease-out',
      }}>
        🎉
      </div>
      <div style={{
        fontSize: '48px',
        marginTop: '16px',
<<<<<<< HEAD
        color: '#00FF88',
=======
        color: 'var(--color-phosphor)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        fontWeight: 'bold',
      }}>
        {badge.name}!
      </div>
      <div style={{
        fontSize: '64px',
        marginTop: '16px',
      }}>
        {badge.icon}
      </div>
      <div style={{
        fontSize: '18px',
        marginTop: '16px',
        color: '#00D4FF',
      }}>
        +{badge.love} LOVE
      </div>
    </div>
  );
}

// ── Main Component ──

export function AvatarDisplay({ expanded = false, onBadgeEarn }: AvatarDisplayProps) {
  const [showCelebration, setShowCelebration] = useState<Badge | null>(null);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Get state from progress store
  const totalBonds = useProgressStore((s) => s.totalBonds);
  const totalMolecules = useProgressStore((s) => s.totalMolecules);
  const uniqueMolecules = useProgressStore((s) => s.uniqueMolecules);
  const familyPlaySessions = useProgressStore((s) => s.familyPlaySessions);
  const totalPlayMinutes = useProgressStore((s) => s.totalPlayMinutes);
  const badgeCollection = useProgressStore((s) => s.badgeCollection);
  const recentBadges = useProgressStore((s) => s.recentBadges);
<<<<<<< HEAD
  
  const earnedCount = getEarnedBadgesCount(badgeCollection);
  const totalBadges = getTotalBadgesCount();
  const level = getLevelForBonds(totalBonds);
  
=======

  const earnedCount = getEarnedBadgesCount(badgeCollection);
  const totalBadges = getTotalBadgesCount();
  const level = getLevelForBonds(totalBonds);

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  // Show celebration when new badge earned
  useEffect(() => {
    if (recentBadges.length > 0) {
      const latestBadgeId = recentBadges[recentBadges.length - 1];
      const badge = BADGES.find((b) => b.id === latestBadgeId);
      if (badge) {
        setShowCelebration(badge);
        onBadgeEarn?.(badge);
      }
    }
  }, [recentBadges, onBadgeEarn]);
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  return (
    <div className="avatar-display" style={{
      padding: '16px',
      background: 'linear-gradient(180deg, rgba(5,5,16,0.9), rgba(11,15,25,0.95))',
      borderRadius: '20px',
      border: '1px solid rgba(0,255,136,0.2)',
      color: '#E8ECF4',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: expanded ? '600px' : '300px',
      margin: '0 auto',
    }}>
      {/* CSS animations */}
      <style>{`
        @keyframes badgePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce {
          0% { transform: translateY(-30px); }
          50% { transform: translateY(10px); }
          100% { transform: translateY(0); }
        }
        .badge-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
          margin-top: 16px;
          max-height: 400px;
          overflow-y: auto;
        }
        .badge-grid::-webkit-scrollbar {
          width: 6px;
        }
        .badge-grid::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
        .badge-grid::-webkit-scrollbar-thumb {
          background: rgba(0,255,136,0.5);
          border-radius: 3px;
        }
      `}</style>
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
<<<<<<< HEAD
            background: 'linear-gradient(135deg, #00FF88, #00D4FF)',
=======
            background: 'linear-gradient(135deg, var(--color-phosphor), #00D4FF)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            border: '3px solid rgba(255,255,255,0.3)',
          }}>
            {level.icon}
          </div>
          <div>
<<<<<<< HEAD
            <div style={{ 
              fontSize: '14px', 
=======
            <div style={{
              fontSize: '14px',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
              color: 'rgba(232,236,244,0.7)',
            }}>
              Your Avatar
            </div>
<<<<<<< HEAD
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold',
              color: '#00FF88',
=======
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'var(--color-phosphor)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            }}>
              {level.title}
            </div>
          </div>
        </div>
<<<<<<< HEAD
        
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        {/* Badge count */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '8px 12px',
          background: 'rgba(0,255,136,0.1)',
          borderRadius: '20px',
        }}>
          <span>🏆</span>
<<<<<<< HEAD
          <span style={{ 
            fontWeight: 'bold', 
            color: '#00FF88',
          }}>
            {earnedCount}
          </span>
          <span style={{ 
=======
          <span style={{
            fontWeight: 'bold',
            color: 'var(--color-phosphor)',
          }}>
            {earnedCount}
          </span>
          <span style={{
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
            color: 'rgba(232,236,244,0.6)',
            fontSize: '12px',
          }}>
            /{totalBadges}
          </span>
        </div>
      </div>
<<<<<<< HEAD
      
      {/* Level progress */}
      <LevelProgress bonds={totalBonds} />
      
      {/* Stats summary */}
      <StatsSummary 
=======

      {/* Level progress */}
      <LevelProgress bonds={totalBonds} />

      {/* Stats summary */}
      <StatsSummary
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        bonds={totalBonds}
        molecules={totalMolecules}
        unique={uniqueMolecules.length}
        familySessions={familyPlaySessions}
        playMinutes={totalPlayMinutes}
      />
<<<<<<< HEAD
      
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      {/* Badge grid - only show when expanded */}
      {expanded && (
        <div className="badge-grid">
          {BADGES.map(badge => {
            const progress = badgeCollection.badges.get(badge.id) || {
              current: 0,
              target: 1,
              earned: false,
            };
            const isNew = recentBadges.includes(badge.id);
            return (
<<<<<<< HEAD
              <BadgeItem 
=======
              <BadgeItem
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
                key={badge.id}
                badge={badge}
                progress={progress}
                isNew={isNew}
              />
            );
          })}
        </div>
      )}
<<<<<<< HEAD
      
      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationOverlay 
=======

      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationOverlay
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          badge={showCelebration}
          onComplete={() => setShowCelebration(null)}
        />
      )}
    </div>
  );
}

// ── Compact version for HUD ──

<<<<<<< HEAD
export function AvatarCompact({ 
  bonds = 0, 
=======
export function AvatarCompact({
  bonds = 0,
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  badgeCount = 0,
  level = 'Seed',
  levelIcon = '🌱',
  onClick,
<<<<<<< HEAD
}: { 
=======
}: {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  bonds?: number;
  badgeCount?: number;
  level?: string;
  levelIcon?: string;
  onClick?: () => void;
}) {
  return (
<<<<<<< HEAD
    <button 
=======
    <button
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(0,255,136,0.3)',
        borderRadius: '20px',
        cursor: 'pointer',
        color: '#E8ECF4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span style={{ fontSize: '20px' }}>{levelIcon}</span>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{level}</span>
        <span style={{ fontSize: '10px', color: 'rgba(232,236,244,0.6)' }}>
          {bonds} bonds · {badgeCount} badges
        </span>
      </div>
    </button>
  );
}

<<<<<<< HEAD
export default AvatarDisplay;
=======
export default AvatarDisplay;
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
