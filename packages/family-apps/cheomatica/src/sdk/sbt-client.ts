/**
 * P31 SBT Client SDK
 * Reusable SBT attachment for edge apps
 */

export interface SBTConfig {
  identityUrl: string
  appId: string
  userId: string
  roles: string[]
}

export interface SBTToken {
  token: string
  signature: string
  public_key: string
  issued_at: number
  expires_at: number
}

export interface SyncPayload {
  payload_id: string
  app_id: string
  user_id: string
  device_fp: string
  timestamp: number
  queue: Array<{
    id: number
    type: string
    pl: string
    ts: number
  }>
}

const STORAGE_KEY = 'p31_sbt_cache'

export class SBTClient {
  private config: SBTConfig
  private cachedToken: SBTToken | null = null

  constructor(config: SBTConfig) {
    this.config = config
    this.loadCachedToken()
  }

  private loadCachedToken(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SBTToken
        // Only use if not expired (with 5-min buffer)
        if (parsed.expires_at > Math.floor(Date.now() / 1000) + 300) {
          this.cachedToken = parsed
        }
      }
    } catch {
      // localStorage unavailable (e.g., private mode)
    }
  }

  private saveCachedToken(token: SBTToken): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(token))
    } catch {
      // Ignore storage errors
    }
  }

  async issue(): Promise<SBTToken | null> {
    try {
      const res = await fetch(`${this.config.identityUrl}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub: this.config.userId,
          roles: this.config.roles,
          ttl_hours: 168 // 1 week
        })
      })

      if (!res.ok) {
        console.error('SBT issue failed:', await res.text())
        return null
      }

      const data = await res.json() as { sbt: SBTToken; public_key: string; issued_at: number; expires_at: number }
      
      const token: SBTToken = {
        token: data.sbt.token,
        signature: data.sbt.signature,
        public_key: data.public_key,
        issued_at: data.issued_at,
        expires_at: data.expires_at
      }

      this.cachedToken = token
      this.saveCachedToken(token)
      
      return token
    } catch (err) {
      console.error('SBT issue error:', err)
      return null
    }
  }

  async getValidToken(): Promise<SBTToken | null> {
    // Return cached if still valid
    if (this.cachedToken) {
      const now = Math.floor(Date.now() / 1000)
      if (this.cachedToken.expires_at > now + 300) {
        return this.cachedToken
      }
    }
    
    // Issue new token
    return this.issue()
  }

  getAuthorizationHeader(token: SBTToken): string {
    return `SBT ${token.token} ${token.signature}`
  }

  async syncToOrchestrator(
    orchestratorUrl: string,
    queue: SyncPayload['queue']
  ): Promise<{ success: boolean; processed?: number; error?: string }> {
    const token = await this.getValidToken()
    if (!token) {
      return { success: false, error: 'No valid SBT available' }
    }

    const payload: SyncPayload = {
      payload_id: `sync-${this.config.appId}-${Date.now()}`,
      app_id: this.config.appId,
      user_id: this.config.userId,
      device_fp: this.getDeviceFingerprint(),
      timestamp: Math.floor(Date.now() / 1000),
      queue
    }

    try {
      const res = await fetch(`${orchestratorUrl}/sync/${this.config.appId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthorizationHeader(token)
        },
        body: JSON.stringify(payload)
      })

      const result = await res.json()
      
      if (!res.ok) {
        return { 
          success: false, 
          error: result.error || `HTTP ${res.status}` 
        }
      }

      return {
        success: true,
        processed: result.processed
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Sync failed' 
      }
    }
  }

  private getDeviceFingerprint(): string {
    const raw = `${navigator.userAgent}:${navigator.language}:${screen.width}x${screen.height}`
    // Simple hash - in production use proper SHA-256
    let hash = 0
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).substring(0, 16)
  }
}

// Convenience function for apps to initialize SBT client
export function createSBTClient(userId: string, appId: string, roles: string[]): SBTClient {
  return new SBTClient({
    identityUrl: 'https://p31-identity-sbt.trimtab-signal.workers.dev',
    appId,
    userId,
    roles
  })
}
