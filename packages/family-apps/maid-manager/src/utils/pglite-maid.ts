import { PGlite } from '@electric-sql/pglite'
import maidSchema from '../db/001_maid_schema.sql?raw'

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
      useMemory ? {} : { dataDir: 'opfs-ahp:///maid-manager-db', relaxedDurability: true }
    )
    await db.exec(maidSchema)
    return db
  } catch (err) {
    console.warn('[P31 DB] Failed to initialize with OPFS, falling back to memory:', err)
    db = await PGlite.create({})
    await db.exec(maidSchema)
    return db
  }
}

export async function seedClients(): Promise<void> {
  const db = await initDB()
  const exists = await db.query('SELECT COUNT(*) as cnt FROM clients')
  if (exists.rows[0].cnt === 0) {
    const ts = Math.floor(Date.now() / 1000)
    await db.query('INSERT INTO clients(nm, addr, est_min) VALUES($1, $2, $3)', ['Johnson Residence', '123 Main St', 120])
    await db.query('INSERT INTO clients(nm, addr, est_min) VALUES($1, $2, $3)', ['Smith Condo', '456 Oak Ave, Apt 3B', 90])
    await db.query('INSERT INTO sync_queue(pl) VALUES($1)', [JSON.stringify({ type: 'seed', ts })])
  }
}

export async function startJob(cid: number): Promise<number> {
  const db = await initDB()
  const ts = Math.floor(Date.now() / 1000)
  const result = await db.query('INSERT INTO jobs(cid, stat, start_ts) VALUES($1, $2, $3) RETURNING id', [cid, 'act', ts])
  await db.query('INSERT INTO sync_queue(pl) VALUES($1)', [JSON.stringify({ type: 'start', cid, ts })])
  return result.rows[0].id as number
}

export async function stopJob(jid: number): Promise<void> {
  const db = await initDB()
  const ts = Math.floor(Date.now() / 1000)
  await db.query('UPDATE jobs SET stat = $1, end_ts = $2 WHERE id = $3', ['done', ts, jid])
  await db.query('INSERT INTO sync_queue(pl) VALUES($1)', [JSON.stringify({ type: 'stop', jid, ts })])
}

export async function getActiveJob(): Promise<{ id: number; cid: number; start_ts: number; nm: string; addr: string; est_min: number } | null> {
  const db = await initDB()
  const result = await db.query(`
    SELECT j.id, j.cid, j.start_ts, c.nm, c.addr, c.est_min 
    FROM jobs j 
    JOIN clients c ON j.cid = c.id 
    WHERE j.stat = 'act' 
    LIMIT 1
  `)
  if (result.rows.length === 0) return null
  return result.rows[0] as { id: number; cid: number; start_ts: number; nm: string; addr: string; est_min: number }
}

export async function getClients(): Promise<{ id: number; nm: string; addr: string; est_min: number }[]> {
  const db = await initDB()
  const result = await db.query('SELECT id, nm, addr, est_min FROM clients ORDER BY nm')
  return result.rows as { id: number; nm: string; addr: string; est_min: number }[]
}

export async function getTodayJobs(): Promise<{ id: number; nm: string; stat: string; duration: number }[]> {
  const db = await initDB()
  const ts = Math.floor(Date.now() / 1000)
  const dayAgo = ts - 86400
  const result = await db.query(`
    SELECT j.id, c.nm, j.stat, COALESCE(j.end_ts - j.start_ts, 0) as duration
    FROM jobs j
    JOIN clients c ON j.cid = c.id
    WHERE j.start_ts > $1
    ORDER BY j.start_ts DESC
  `, [dayAgo])
  return result.rows as { id: number; nm: string; stat: string; duration: number }[]
}

export function getPacingWarning(start_ts: number): { show: boolean; msg: string; rest: number } {
  const ts = Math.floor(Date.now() / 1000)
  const elapsedMin = Math.floor((ts - start_ts) / 60)
  const estMin = 120
  
  if (elapsedMin > estMin) {
    const restMin = 15
    return { show: true, msg: `Active ${elapsedMin} min. Take ${restMin} min rest.`, rest: restMin }
  }
  if (elapsedMin > estMin * 0.75) {
    return { show: true, msg: `${elapsedMin} min active. Approaching limit.`, rest: 0 }
  }
  return { show: false, msg: '', rest: 0 }
}
