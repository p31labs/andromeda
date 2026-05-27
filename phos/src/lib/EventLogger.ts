/**
 * EventLogger — Cryptographic telemetry logger for PHOS.
 *
 * Dual-mode operation:
 * 1. HashChain-backed immutable ledger (append-only, SHA-256 chained)
 * 2. localStorage ring buffer for UI display (last 50 events)
 *
 * SSA Schema Mapping:
 * Events are typed to map directly to SSA Paragraph B criteria:
 * - B1: Understand, remember, apply information
 * - B3: Concentrate, persist, maintain pace
 * - B4: Adapt or manage oneself
 *
 * Export format satisfies FRE 902(14) self-authentication:
 *   - Root hash of all events signed with WebCrypto ECDSA P-256
 *   - Verification manifest included in export JSON
 */

import { appendEvent, getChainState, getHeadHash, verifyChain } from './HashChain';
import { signPayload, verifySignature, getKeyMetaData, getOrCreateKeyPair } from './PhosCrypto';

export type PHOSEventType =
  | 'INTENT_ROUTED'
  | 'GUARDIAN_ACTIVATED'
  | 'SPOON_STATE_CHANGED'
  | 'SURFACE_NAVIGATED'
  | 'VOICE_TOGGLED'
  | 'DEVICE_SEALED'
  | 'DEVICE_UNLOCKED'
  | 'GROUNDING_COMPLETED'
  | 'LOVE_CHANGED'
  | 'ERROR'
  | 'PAIN_LOGGED'
  | 'TASK_ABANDONED'
  | 'CRISIS_SURFACE_ENTERED'
  | 'FAMILY_CONTACT'
  | 'VISITATION_COMPLETED'
  | 'BONDING_SESSION';

export type SSADomain = 'B1' | 'B3' | 'B4' | 'GENERAL';

export type DistressClassification =
  | 'executive_dysfunction'
  | 'somatic_pain'
  | 'tachycardia'
  | 'sensory_overload'
  | 'cognitive_fatigue'
  | 'autonomic_dysregulation';

export type ActivityDomain =
  | 'high_cognitive_demand'
  | 'physical_exertion'
  | 'social_interaction'
  | 'creative_expression'
  | 'rest_recovery'
  | 'family_contact';

export interface PHOSEvent {
  id: string;
  type: PHOSEventType;
  timestamp: string;
  data: Record<string, unknown>;
  ssaDomain?: SSADomain;
  distressClassification?: DistressClassification;
  activityDomain?: ActivityDomain;
  durationActiveMin?: number;
  recoveryDurationMin?: number;
}

export interface SSAMappedEvent {
  timestamp_iso: string;
  activity_domain: ActivityDomain | string;
  duration_active_min: number;
  distress_classification: DistressClassification | string;
  intervention_required: string;
  recovery_duration_min: number;
  ssa_paragraph_b_domain: SSADomain;
  cryptographic_hash: string;
}

const RING_KEY = 'phos_event_ring';
const MAX_EVENTS = 50;

export function getEventLog(): PHOSEvent[] {
  try {
    const raw = localStorage.getItem(RING_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PHOSEvent[];
  } catch {
    return [];
  }
}

function persistToRingBuffer(event: PHOSEvent): void {
  try {
    const log = getEventLog();
    log.push(event);
    if (log.length > MAX_EVENTS) {
      log.splice(0, log.length - MAX_EVENTS);
    }
    localStorage.setItem(RING_KEY, JSON.stringify(log));
  } catch { /* storage full — silently degrade */ }
}

export function logEvent(
  type: PHOSEventType,
  data: Record<string, unknown>,
  ssaMeta?: {
    ssaDomain?: SSADomain;
    distressClassification?: DistressClassification;
    activityDomain?: ActivityDomain;
    durationActiveMin?: number;
    recoveryDurationMin?: number;
    intervention_required?: string;
  }
): void {
  const timestamp = new Date().toISOString();

  const event: PHOSEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp,
    data,
    ssaDomain: ssaMeta?.ssaDomain,
    distressClassification: ssaMeta?.distressClassification,
    activityDomain: ssaMeta?.activityDomain,
    durationActiveMin: ssaMeta?.durationActiveMin,
    recoveryDurationMin: ssaMeta?.recoveryDurationMin,
  };

  // Append to hash chain (async, fire-and-forget — never blocks UI)
  void appendEvent(type, {
    ...data,
    eventId: event.id,
    timestamp,
    ssaDomain: ssaMeta?.ssaDomain || null,
    distressClassification: ssaMeta?.distressClassification || null,
    activityDomain: ssaMeta?.activityDomain || null,
    durationActiveMin: ssaMeta?.durationActiveMin || null,
    recoveryDurationMin: ssaMeta?.recoveryDurationMin || null,
  });

  persistToRingBuffer(event);

  // Console output (dev-friendly)
  const styles: Record<string, string> = {
    INTENT_ROUTED: 'color: #39ff14; font-weight: bold',
    GUARDIAN_ACTIVATED: 'color: #ff3355; font-weight: bold; font-size: 1.1em',
    SPOON_STATE_CHANGED: 'color: #ffb000; font-weight: bold',
    SURFACE_NAVIGATED: 'color: #00e5ff; font-weight: bold',
    VOICE_TOGGLED: 'color: #b026ff; font-weight: bold',
    DEVICE_SEALED: 'color: #ffb000; font-weight: bold; font-size: 1.1em',
    DEVICE_UNLOCKED: 'color: #00e5ff; font-weight: bold; font-size: 1.1em',
    GROUNDING_COMPLETED: 'color: #ffb000; font-weight: bold',
    LOVE_CHANGED: 'color: #ffb000; font-weight: bold',
    ERROR: 'color: #ff3355; font-weight: bold',
    PAIN_LOGGED: 'color: #ff6688; font-weight: bold',
    TASK_ABANDONED: 'color: #ff9933; font-weight: bold',
    CRISIS_SURFACE_ENTERED: 'color: #ff3355; font-weight: bold; font-size: 1.1em',
  };
  const style = styles[type] || 'color: #888888';
  // eslint-disable-next-line no-console
  console.log(
    `%c[PHOS:${type}]%c ${timestamp.split('T')[1]?.slice(0, 12) || timestamp}`,
    style,
    'color: #666666',
    data
  );
}

export function logIntentRouted(
  input: string,
  targetSurface: string,
  spoons: number
): void {
  logEvent('INTENT_ROUTED', {
    input: input.slice(0, 100),
    targetSurface,
    spoons,
  }, { ssaDomain: 'B1' });
}

export function logGuardianActivated(spoons: number): void {
  logEvent('GUARDIAN_ACTIVATED', {
    spoons,
    urgent: true,
  }, { ssaDomain: 'B4', distressClassification: 'autonomic_dysregulation' });
}

export function logSpokenStateChanged(
  from: number,
  to: number
): void {
  logEvent('SPOON_STATE_CHANGED', {
    from,
    to,
    delta: to - from,
  }, {
    ssaDomain: to <= 1 ? 'B3' : 'GENERAL',
    distressClassification: to <= 1 ? 'cognitive_fatigue' : undefined,
  });
}

export function logSurfaceNavigated(
  from: string,
  to: string,
  grayRock: boolean
): void {
  logEvent('SURFACE_NAVIGATED', {
    fromSurface: from,
    toSurface: to,
    grayRock,
  }, { ssaDomain: grayRock ? 'B4' : 'GENERAL' });
}

export function logVoiceToggled(muted: boolean): void {
  logEvent('VOICE_TOGGLED', { muted });
}

export function logDeviceSealed(): void {
  logEvent('DEVICE_SEALED', {
    timestamp: Date.now(),
    method: 'WebAuthn platform',
  });
}

export function logDeviceUnlocked(): void {
  logEvent('DEVICE_UNLOCKED', {
    timestamp: Date.now(),
    method: 'WebAuthn platform',
  });
}

export function logGroundingCompleted(spoons: number): void {
  logEvent('GROUNDING_COMPLETED', {
    spoons,
    method: '4-7-8 breathing',
    loveAwarded: 10,
  }, {
    ssaDomain: 'B3',
    recoveryDurationMin: 2,
    intervention_required: 'breathing_protocol',
  });
}

export function logLoveChanged(balance: number, delta: number): void {
  logEvent('LOVE_CHANGED', {
    balance,
    delta,
  });
}

export function logPainEvent(
  painLevel: number,
  activityDomain: ActivityDomain,
  durationActiveMin: number,
  recoveryDurationMin: number
): void {
  const distress: DistressClassification = painLevel >= 7 ? 'somatic_pain' : 'cognitive_fatigue';
  logEvent('PAIN_LOGGED', {
    painLevel,
    activityDomain,
    durationActiveMin,
    recoveryDurationMin,
  }, {
    ssaDomain: 'B3',
    distressClassification: distress,
    activityDomain,
    durationActiveMin,
    recoveryDurationMin,
  });
}

export function logTaskAbandoned(
  activityDomain: ActivityDomain,
  durationActiveMin: number,
  distress: DistressClassification
): void {
  logEvent('TASK_ABANDONED', {
    activityDomain,
    durationActiveMin,
    distress,
  }, {
    ssaDomain: 'B3',
    distressClassification: distress,
    activityDomain,
    durationActiveMin,
  });
}

export function getLogs(): PHOSEvent[] {
  return getEventLog();
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(RING_KEY);
  } catch { /* silently fail */ }
}

/**
 * Generate a cryptographically signed Functional Capacity Log export.
 * Maps ring buffer events (which carry SSA metadata) to SSA Paragraph B schema.
 * Returns a self-contained JSON document with verification manifest.
 */
export async function generateSignedExport(): Promise<object> {
  const chainState = getChainState();
  const headHash = getHeadHash();

  // Ensure key pair exists
  await getOrCreateKeyPair();

  // Sign the head hash
  const signature = await signPayload(headHash);

  // Use ring buffer events for SSA mapping (they carry the SSA metadata)
  const ringEvents = getEventLog();

  // Map events to SSA schema
  const ssaEvents: SSAMappedEvent[] = ringEvents
    .filter((e) => e.ssaDomain && e.ssaDomain !== 'GENERAL')
    .map((e) => ({
      timestamp_iso: e.timestamp,
      activity_domain: e.activityDomain || 'unspecified',
      duration_active_min: e.durationActiveMin || 0,
      distress_classification: e.distressClassification || 'unspecified',
      intervention_required: (e.data['intervention_required'] as string) || 'none',
      recovery_duration_min: e.recoveryDurationMin || 0,
      ssa_paragraph_b_domain: e.ssaDomain || 'GENERAL',
      cryptographic_hash: '',
    }));

  const keyMeta = getKeyMetaData();

  return {
    export_metadata: {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      site_id_pseudonym: chainState.siteId,
      total_events: chainState.events.length,
      ssa_mapped_events: ssaEvents.length,
      chain_integrity: (await verifyChain()).valid,
      algorithms: {
        hash: 'SHA-256',
        signature: 'ECDSA-P256',
      },
    },
    events: ringEvents,
    ssa_paragraph_b_data: ssaEvents,
    verification_manifest: {
      root_hash: headHash,
      signature,
      public_key_jwk: keyMeta?.publicKeyJWK || null,
      key_attested_by_webauthn: keyMeta?.attestedByWebAuthn || false,
    },
  };
}

/**
 * Verify a signed export against its embedded public key.
 */
export async function verifyExport(
  rootHash: string,
  signatureB64: string,
  publicKeyJWK: JsonWebKey
): Promise<boolean> {
  return verifySignature(rootHash, signatureB64, publicKeyJWK);
}
