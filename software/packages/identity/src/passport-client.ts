import type {
  PassportIdentity,
  PassportSession,
  RegisterRequest,
  RegisterResponse,
  VerifyRequest,
  VerifyResponse,
  SessionResponse,
  IdentityResolution,
} from './types';
import { PASSPORT_API_BASE } from './types';

export class PassportClient {
  private baseUrl: string;

  constructor(baseUrl: string = PASSPORT_API_BASE) {
    this.baseUrl = baseUrl;
  }

  async register(req: RegisterRequest): Promise<RegisterResponse> {
    const res = await fetch(`${this.baseUrl}/identity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const body = await res.json() as RegisterResponse;
    if (!res.ok && !body.error) {
      body.error = `Server error: ${res.status}`;
    }
    return body;
  }

  async verify(req: VerifyRequest): Promise<VerifyResponse> {
    const res = await fetch(`${this.baseUrl}/identity/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    const body = await res.json() as VerifyResponse;
    if (!res.ok && !body.error) {
      body.error = `Server error: ${res.status}`;
    }
    return body;
  }

  async resolve(did: string): Promise<IdentityResolution> {
    const res = await fetch(`${this.baseUrl}/identity/resolve/${encodeURIComponent(did)}`);
    if (res.status === 404) {
      return { did, publicKey: null, exists: false };
    }
    const body = await res.json() as IdentityResolution;
    if (!res.ok && !body.error) {
      body.error = `Server error: ${res.status}`;
    }
    return body;
  }

  async createSession(did: string): Promise<SessionResponse> {
    const res = await fetch(`${this.baseUrl}/identity/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did }),
    });
    const body = await res.json() as SessionResponse;
    if (!res.ok && !body.error) {
      body.error = `Server error: ${res.status}`;
    }
    return body;
  }

  async refreshSession(sessionId: string): Promise<SessionResponse> {
    const res = await fetch(`${this.baseUrl}/identity/session/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const body = await res.json() as SessionResponse;
    if (!res.ok && !body.error) {
      body.error = `Server error: ${res.status}`;
    }
    return body;
  }
}
