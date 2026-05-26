import { describe, it, expect, beforeAll } from 'vitest'
import { initDB, seedClients, startJob, stopJob, getActiveJob, getClients, getPacingWarning } from '../src/utils/pglite-maid'

describe('TRIPER: Maid Manager Pre-Deploy Suite', () => {
  beforeAll(async () => {
    await initDB(true)
  })

  it('T: Schema loads without syntax errors', async () => {
    const clients = await getClients()
    expect(Array.isArray(clients)).toBe(true)
  })

  it('T: Can seed default clients', async () => {
    await seedClients()
    const clients = await getClients()
    expect(clients.length).toBeGreaterThanOrEqual(2)
  })

  it('T: Can start and stop a job', async () => {
    const clients = await getClients()
    if (clients.length === 0) return
    
    const jid = await startJob(clients[0].id)
    expect(typeof jid).toBe('number')
    
    const active = await getActiveJob()
    expect(active).not.toBeNull()
    expect(active?.id).toBe(jid)
    
    await stopJob(jid)
    const after = await getActiveJob()
    expect(after).toBeNull()
  })

  it('I: Pacing warning triggers after 90 minutes', () => {
    const ts = Math.floor(Date.now() / 1000) - (91 * 60)
    const warning = getPacingWarning(ts)
    expect(warning.show).toBe(true)
  })

  it('I: Pacing warning forces rest after 120 minutes', () => {
    const ts = Math.floor(Date.now() / 1000) - (121 * 60)
    const warning = getPacingWarning(ts)
    expect(warning.show).toBe(true)
    expect(warning.rest).toBeGreaterThan(0)
  })

  it('P: Timestamps are in seconds not milliseconds', async () => {
    const clients = await getClients()
    if (clients.length === 0) return
    
    const ts = Math.floor(Date.now() / 1000)
    const jid = await startJob(clients[0].id)
    const active = await getActiveJob()
    
    expect(active).not.toBeNull()
    expect(active!.start_ts).toBeLessThan(ts + 10)
    expect(active!.start_ts).toBeGreaterThan(ts - 10)
    
    await stopJob(jid)
  })

  it('R: No SQL injection in client names', async () => {
    const db = await initDB()
    const evil = "'; DROP TABLE clients; --"
    await db.query("INSERT INTO clients(nm, addr, est_min) VALUES($1, $2, $3)", [evil, 'Test', 60])
    const clients = await getClients()
    expect(clients.some(c => c.nm.includes('DROP TABLE'))).toBe(true)
  })
})
