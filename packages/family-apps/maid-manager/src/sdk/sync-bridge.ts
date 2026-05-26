/**
 * PGLite → P31-State Sync Bridge
 * Attaches to PGLite sync_queue and pushes to orchestrator
 */

import { SBTClient, type SyncPayload } from './sbt-client'

export interface SyncBridgeConfig {
  sbtClient: SBTClient
  orchestratorUrl: string
  db: any // PGLite instance
  batchSize?: number
  syncIntervalMs?: number
}

export class SyncBridge {
  private config: SyncBridgeConfig
  private intervalId: number | null = null
  private isSyncing = false

  constructor(config: SyncBridgeConfig) {
    this.config = {
      batchSize: 50,
      syncIntervalMs: 30000, // 30 seconds
      ...config
    }
  }

  start(): void {
    if (this.intervalId) return
    
    // Initial sync
    this.sync()
    
    // Periodic sync
    this.intervalId = window.setInterval(() => {
      this.sync()
    }, this.config.syncIntervalMs)
    
    console.log('[SyncBridge] Started, interval:', this.config.syncIntervalMs, 'ms')
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[SyncBridge] Sync already in progress, skipping')
      return
    }

    this.isSyncing = true

    try {
      // Get pending items from sync_queue
      const { rows } = await this.config.db.query(
        'SELECT id, type, pl, ts FROM sync_queue ORDER BY id ASC LIMIT $1',
        [this.config.batchSize]
      )

      if (!rows || rows.length === 0) {
        console.log('[SyncBridge] No items to sync')
        return
      }

      console.log(`[SyncBridge] Syncing ${rows.length} items...`)

      // Build payload
      const queue: SyncPayload['queue'] = rows.map((r: { id: number; type: string; pl: string; ts: number }) => ({
        id: r.id,
        type: r.type,
        pl: r.pl,
        ts: r.ts
      }))

      // Send to orchestrator
      const result = await this.config.sbtClient.syncToOrchestrator(
        this.config.orchestratorUrl,
        queue
      )

      if (result.success && result.processed) {
        // Remove synced items from queue
        const ids = rows.map((r: { id: number }) => r.id).join(',')
        await this.config.db.query(
          `DELETE FROM sync_queue WHERE id IN (${ids})`
        )
        console.log(`[SyncBridge] Synced ${result.processed} items`)
      } else {
        console.error('[SyncBridge] Sync failed:', result.error)
      }
    } catch (err) {
      console.error('[SyncBridge] Sync error:', err)
    } finally {
      this.isSyncing = false
    }
  }

  async forceSync(): Promise<void> {
    this.stop()
    await this.sync()
    this.start()
  }
}

// Convenience: Create bridge from PGLite db
export async function createSyncBridge(
  db: any,
  userId: string,
  appId: string,
  roles: string[]
): Promise<SyncBridge> {
  const { SBTClient } = await import('./sbt-client')
  
  const sbtClient = new SBTClient({
    identityUrl: 'https://p31-identity-sbt.trimtab-signal.workers.dev',
    appId,
    userId,
    roles
  })

  return new SyncBridge({
    sbtClient,
    orchestratorUrl: 'https://p31-state.trimtab-signal.workers.dev',
    db,
    syncIntervalMs: 30000
  })
}
