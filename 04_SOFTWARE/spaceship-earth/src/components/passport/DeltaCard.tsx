/**
 * @file DeltaCard — WCD-PASS-04
 * P31 Labs — Cognitive Passport System
 *
 * Delta Card component for high-efficiency support requests.
 * Uses Web Share API for packet sharing.
 *
 * Brand: Phosphor Green #00FF88, Calcium Amber #F59E0B, Void #050510
 */

import { useState, useCallback } from 'react';
import type { DeltaCardData, DeltaCardType, Bandwidth } from '../../data/deltaCards';
import { TYPE_COLORS, BANDWIDTH_LABELS } from '../../data/deltaCards';
import { usePassportStore, usePassportInitialized } from '../../stores/passportStore';

// ─────────────────────────────────────────────────────────────────
// Icons (inline SVG for zero dependencies)
// ─────────────────────────────────────────────────────────────────

function ShareIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function AlertIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function RequestIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function OfferIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CopyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// Brand Colors
// ─────────────────────────────────────────────────────────────────
const COLORS = {
  void: '#050510',
  phosphorGreen: '#00FF88',
  calciumAmber: '#F59E0B',
  quantumCyan: '#00D4FF',
  dangerRed: '#EF4444',
  textPrimary: '#E8ECF4',
  textMuted: '#8B95A5',
  border: '#1E2433',
  cardBg: '#0B0F19',
};

// ─────────────────────────────────────────────────────────────────
// Type Icons
// ─────────────────────────────────────────────────────────────────
const TYPE_ICONS: Record<DeltaCardType, React.ComponentType<{ size?: number }>> = {
  REQUEST: RequestIcon,
  OFFER: OfferIcon,
  ALERT: AlertIcon,
};

// ─────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────
interface DeltaCardProps {
  card: DeltaCardData;
  showShareButton?: boolean;
  onShare?: (card: DeltaCardData) => void;
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export function DeltaCard({ card, showShareButton = true, onShare, disabled = false }: DeltaCardProps) {
  const isPassportReady = usePassportInitialized();
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const typeColor = TYPE_COLORS[card.type];
  const TypeIcon = TYPE_ICONS[card.type];
  const bandwidthLabel = BANDWIDTH_LABELS[card.bandwidth];

  // Generate share payload
  const getSharePayload = useCallback(() => {
    const payload = {
      ...card.payload,
      _deltaCard: {
        id: card.id,
        type: card.type,
        title: card.title,
        description: card.description,
        bandwidth: card.bandwidth,
        spoonCost: card.spoonCost,
        larmorReward: card.larmorReward,
        createdAt: card.createdAt,
      },
      _protocol: 'P31_DELTA_CARD_v1',
      _timestamp: new Date().toISOString(),
    };

    // Add cryptographic signature if passport is ready
    if (isPassportReady) {
      const keys = usePassportStore.getState().getKeys();
      if (keys) {
        (payload._deltaCard as Record<string, unknown>)._keyId = keys.keyId;
      }
    }

    return payload;
  }, [card, isPassportReady]);

  // Handle Web Share API
  const handleShare = useCallback(async () => {
    if (disabled || isSharing) return;

    setIsSharing(true);
    setShareSuccess(false);

    try {
      const payload = getSharePayload();
      const shareText = `🔺 ${card.title}\n\n${card.description}\n\nBandwidth: ${bandwidthLabel}\nSpoons: ${card.spoonCost} | LOVE: ${card.larmorReward}\n\n${JSON.stringify(payload, null, 2)}`;

      // Try Web Share API first
      if (navigator.share) {
        await navigator.share({
          title: `Delta Card: ${card.title}`,
          text: shareText,
        });
        setShareSuccess(true);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        setCopySuccess(true);
      }

      onShare?.(card);
    } catch (error) {
      // User cancelled or error
      if (error instanceof Error && !error.message.includes('canceled')) {
        console.error('[DeltaCard] Share failed:', error);
      }
    } finally {
      setIsSharing(false);
      // Reset success states after delay
      setTimeout(() => {
        setShareSuccess(false);
        setCopySuccess(false);
      }, 2000);
    }
  }, [card, bandwidthLabel, disabled, getSharePayload, isSharing, onShare]);

  // Handle clipboard fallback
  const handleCopy = useCallback(async () => {
    if (disabled || isSharing) return;

    setIsSharing(true);
    setCopySuccess(false);

    try {
      const payload = getSharePayload();
      const shareText = `🔺 ${card.title}\n\n${card.description}\n\nBandwidth: ${bandwidthLabel}\nSpoons: ${card.spoonCost} | LOVE: ${card.larmorReward}\n\n${JSON.stringify(payload, null, 2)}`;

      await navigator.clipboard.writeText(shareText);
      setCopySuccess(true);
      onShare?.(card);
    } catch (error) {
      console.error('[DeltaCard] Copy failed:', error);
    } finally {
      setIsSharing(false);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [card, bandwidthLabel, disabled, getSharePayload, isSharing, onShare]);

  return (
    <div
      className="delta-card"
      style={{
        backgroundColor: COLORS.cardBg,
        border: `1px solid ${typeColor}40`,
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'default',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Type indicator */}
      <div
        style={{
          position: 'absolute',
          top: '-1px',
          left: '16px',
          right: '16px',
          height: '3px',
          backgroundColor: typeColor,
          borderRadius: '12px 12px 0 0',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        {/* Type icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: `${typeColor}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: typeColor,
            flexShrink: 0,
          }}
        >
          <TypeIcon size={20} />
        </div>

        {/* Title and type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: COLORS.textPrimary,
              }}
            >
              {card.title}
            </h3>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: typeColor,
                backgroundColor: `${typeColor}20`,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {card.type}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: COLORS.textMuted,
              lineHeight: 1.4,
            }}
          >
            {card.description}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: showShareButton ? '16px' : '0',
        }}
      >
        {/* Bandwidth */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: COLORS.textMuted,
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                card.bandwidth === 'HIGH'
                  ? COLORS.dangerRed
                  : card.bandwidth === 'MEDIUM'
                  ? COLORS.calciumAmber
                  : COLORS.phosphorGreen,
            }}
          />
          {bandwidthLabel}
        </div>

        {/* Spoon cost */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: COLORS.calciumAmber,
          }}
        >
          <span>🥄</span>
          {card.spoonCost} spoons
        </div>

        {/* Larmor reward */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: COLORS.phosphorGreen,
          }}
        >
          <span>💚</span>
          {card.larmorReward} LOVE
        </div>
      </div>

      {/* Share button */}
      {showShareButton && (
        <button
          onClick={typeof navigator.share === 'function' ? handleShare : handleCopy}
          disabled={disabled || isSharing}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: shareSuccess || copySuccess ? COLORS.phosphorGreen : `${typeColor}20`,
            color: shareSuccess || copySuccess ? COLORS.void : typeColor,
            fontSize: '14px',
            fontWeight: 600,
            cursor: disabled || isSharing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          {shareSuccess ? (
            <>
              <CheckIcon size={16} />
              Shared!
            </>
          ) : copySuccess ? (
            <>
              <CheckIcon size={16} />
              Copied!
            </>
          ) : isSharing ? (
            'Sharing...'
          ) : (
            <>
              {typeof navigator.share === 'function' ? <ShareIcon size={16} /> : <CopyIcon size={16} />}
              [SHARE PACKET]
            </>
          )}
        </button>
      )}

      {/* P31 footer */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${COLORS.border}`,
          fontSize: '11px',
          color: COLORS.textMuted,
          textAlign: 'center',
        }}
      >
        🔺 Delta topology — Peer-to-peer support
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Delta Card List Component
// ─────────────────────────────────────────────────────────────────
interface DeltaCardListProps {
  cards: DeltaCardData[];
  showShareButton?: boolean;
  onShare?: (card: DeltaCardData) => void;
  disabled?: boolean;
}

export function DeltaCardList({
  cards,
  showShareButton = true,
  onShare,
  disabled = false,
}: DeltaCardListProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {cards.map((card) => (
        <DeltaCard
          key={card.id}
          card={card}
          showShareButton={showShareButton}
          onShare={onShare}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
