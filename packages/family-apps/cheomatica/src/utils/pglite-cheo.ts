import { PGlite } from '@electric-sql/pglite'
import schema from '../db/001_cheomatica_schema.sql?raw'

let db: PGlite | null = null

function isOPFSAvailable(): boolean {
  try {
    return typeof navigator !== 'undefined' &&
           'storage' in navigator &&
           'getDirectory' in navigator.storage
  } catch {
    return false
  }
}

export async function initDB(memory = false): Promise<PGlite> {
  if (db) return db

  const useMemory = memory || !isOPFSAvailable()

  try {
    db = await PGlite.create(
      useMemory ? {} : { dataDir: 'opfs-ahp:///cheomatica-db', relaxedDurability: true }
    )
    await db.exec(schema)
    return db
  } catch (err) {
    console.warn('[P31 DB] Failed to initialize with OPFS, falling back to memory:', err)
    db = await PGlite.create({})
    await db.exec(schema)
    return db
  }
}

export async function seedData(): Promise<void> {
  const db = await initDB()
  const exists = await db.query('SELECT COUNT(*) as cnt FROM clients')
  if (exists.rows[0].cnt === 0) {
    const ts = Math.floor(Date.now() / 1000)
    await db.query('INSERT INTO clients(nm, phone) VALUES($1, $2)', ['Sample Client', '555-0100'])
    await db.query('INSERT INTO sync_queue(pl) VALUES($1)', [JSON.stringify({ type: 'seed', ts })])
  }
}

export async function addClient(nm: string, phone = '', notes = ''): Promise<number> {
  const db = await initDB()
  const ts = Math.floor(Date.now() / 1000)
  const result = await db.query(
    'INSERT INTO clients(nm, phone, notes) VALUES($1, $2, $3) RETURNING id',
    [nm, phone, notes]
  )
  const cid = result.rows[0].id as number
  await db.query('INSERT INTO sync_queue(pl) VALUES($1)', [JSON.stringify({ type: 'add_client', cid, nm, ts })])
  return cid
}

export async function saveFormula(cid: number, base: string, dev: string, tgt: string, notes = ''): Promise<number> {
  const db = await initDB()
  const ts = Math.floor(Date.now() / 1000)
  const result = await db.query(
    'INSERT INTO formulas(cid, base, dev, tgt, notes, ts) VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
    [cid, base, dev, tgt, notes, ts]
  )
  const fid = result.rows[0].id as number
  await db.query('INSERT INTO sync_queue(pl) VALUES($1)', [JSON.stringify({ type: 'save_formula', fid, cid, base, dev, ts })])
  return fid
}

export async function getClients(): Promise<Array<{ id: number; nm: string; phone: string; notes: string }>> {
  const db = await initDB()
  const result = await db.query('SELECT id, nm, phone, notes FROM clients ORDER BY nm')
  return result.rows as Array<{ id: number; nm: string; phone: string; notes: string }>
}

export async function getClientHistory(cid: number): Promise<Array<{ id: number; base: string; dev: string; tgt: string; notes: string; ts: number }>> {
  const db = await initDB()
  const result = await db.query(
    'SELECT id, base, dev, tgt, notes, ts FROM formulas WHERE cid = $1 ORDER BY ts DESC',
    [cid]
  )
  return result.rows as Array<{ id: number; base: string; dev: string; tgt: string; notes: string; ts: number }>
}

export async function getSyncQueue(): Promise<Array<{ id: number; type: string; pl: string; ts: number }>> {
  const db = await initDB()
  const result = await db.query('SELECT id, type, pl, ts FROM sync_queue ORDER BY id ASC')
  return result.rows as Array<{ id: number; type: string; pl: string; ts: number }>
}

export { db }
