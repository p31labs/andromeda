export type OrbState = 'idle' | 'active' | 'crisis';
export type ActivePanel = 'none' | 'biological' | 'ledger' | 'archive';

export interface BioPayload {
  compound: 'calcium' | 'calcitriol' | 'magnesium';
  action: 'ingest' | 'symptom_crash';
}

export interface LaborEvent {
  id: string;
  actionType: 'vault_maintenance' | 'security_audit' | 'data_ingestion';
  timestamp: string;
}

export interface LedgerArtifact {
  id: string;
  type: 'survival_proof' | 'connection_proof';
  timestamp: string;
  evidenceText: string;
}

export interface DecryptedArtifact {
  id: string;
  timestamp: string;
  category: 'medical' | 'communication' | 'legal' | 'incident';
  content: string;
}

export interface VaultEntry {
  id: string;
  timestamp: string;
  encryptedPayload: ArrayBuffer;
  iv: Uint8Array;
  encryptedAesKey: ArrayBuffer;
  previousHash: string | null;
  currentHash: string;
}

export interface EphemeralGrantProps {
  gatewayToken: string;
  dunaName: string;
}

export interface SanctuarySurfaceProps {
  onAttemptUnlock: (passphrase: string) => Promise<boolean>;
  onEject: () => void;
  isUnlocked: boolean;
}
