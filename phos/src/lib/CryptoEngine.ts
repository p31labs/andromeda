const STORAGE_KEY = 'phos_crypto_soul';

export class CryptoEngine {
  private static generateChallenge(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }

  public static isDeviceSealed(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  }

  public static async sealDevice(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!window.PublicKeyCredential) return false;

    try {
      const challenge = this.generateChallenge();
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          rp: { name: 'PHOS Sanctuary', id: window.location.hostname },
          user: {
            id: userId.buffer as ArrayBuffer,
            name: 'operator@phos.local',
            displayName: 'PHOS Operator',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      });

      if (credential) {
        localStorage.setItem(STORAGE_KEY, credential.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private static base64urlToBuffer(credId: string): ArrayBuffer {
    const base64 = credId.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const decoded = atob(base64 + padding);
    const buf = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      buf[i] = decoded.charCodeAt(i);
    }
    return buf.buffer;
  }

  public static async unlockDevice(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    let credentialId: string | null = null;
    try {
      credentialId = localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
    if (!credentialId) return false;

    try {
      const challenge = this.generateChallenge();
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge.buffer as ArrayBuffer,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
          allowCredentials: [{
            id: this.base64urlToBuffer(credentialId),
            type: 'public-key',
          }],
        },
      });

      return !!assertion;
    } catch {
      return false;
    }
  }

  public static async revokeSeal(): Promise<void> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // silently fail
    }
  }
}

export class DropSafeCrypto {
  static async sealForDropSafe(
    payloadBuffer: ArrayBuffer,
    vaultPublicKey: CryptoKey
  ): Promise<{ encryptedPayload: ArrayBuffer; iv: Uint8Array; encryptedAesKey: ArrayBuffer }> {
    const ephemeralAesKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedPayload = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      ephemeralAesKey,
      payloadBuffer
    );

    const rawAesKey = await window.crypto.subtle.exportKey('raw', ephemeralAesKey);
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      vaultPublicKey,
      rawAesKey
    );

    return { encryptedPayload, iv, encryptedAesKey };
  }

  static async generateVaultKeyPair(): Promise<CryptoKeyPair> {
    return window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('spki', key);
    const bytes = new Uint8Array(exported);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static async importPublicKey(pem: string): Promise<CryptoKey> {
    const binary = atob(pem);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buf[i] = binary.charCodeAt(i);
    }
    return window.crypto.subtle.importKey(
      'spki',
      buf.buffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    );
  }
}
