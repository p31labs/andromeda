import { describe, it, expect, beforeAll } from 'vitest'

describe('TRIPER: Cheomatica Pre-Deploy Suite', () => {
  let initDB: any, seedData: any, addClient: any, saveFormula: any, getClients: any, getClientHistory: any
  
  beforeAll(async () => {
    // Dynamic import to force fresh instance
    const mod = await import('../src/utils/pglite-cheo')
    initDB = mod.initDB
    seedData = mod.seedData
    addClient = mod.addClient
    saveFormula = mod.saveFormula
    getClients = mod.getClients
    getClientHistory = mod.getClientHistory
    await initDB(true)
  })

  it('T: Schema loads without syntax errors', async () => {
    const clients = await getClients()
    expect(Array.isArray(clients)).toBe(true)
  })

  it('T: Can seed default data', async () => {
    await seedData()
    const clients = await getClients()
    expect(clients.length).toBeGreaterThanOrEqual(1)
  })

  it('T: Can add a client', async () => {
    const cid = await addClient('Test Client', '555-9999')
    expect(typeof cid).toBe('number')
    expect(cid).toBeGreaterThan(0)
  })

  it('T: Can save a formula', async () => {
    const clients = await getClients()
    if (clients.length === 0) return
    
    const fid = await saveFormula(clients[0].id, '6N', '20vol', 'Ash brown', 'Processed 30 min')
    expect(typeof fid).toBe('number')
  })

  it('I: Formula links to correct client', async () => {
    const cid = await addClient('Link Test', '555-0000')
    await saveFormula(cid, '7A', '30vol', 'Cool ash', '')
    
    const history = await getClientHistory(cid)
    expect(history.length).toBeGreaterThanOrEqual(1)
    expect(history[0].base).toBe('7A')
  })

  it('P: Timestamps are in seconds', async () => {
    const cid = await addClient('Time Test', '')
    const before = Math.floor(Date.now() / 1000)
    await saveFormula(cid, '5N', '10vol', '', '')
    const after = Math.floor(Date.now() / 1000)
    
    const history = await getClientHistory(cid)
    expect(history[0].ts).toBeGreaterThanOrEqual(before)
    expect(history[0].ts).toBeLessThanOrEqual(after + 5)
  })

  it('R: Handles empty notes gracefully', async () => {
    const cid = await addClient('Empty Notes', '')
    const fid = await saveFormula(cid, '8N', '40vol', '', '')
    expect(fid).toBeGreaterThan(0)
  })
})
