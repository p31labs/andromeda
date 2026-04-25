// CRDT-Powered Mesh State Reconciliation
// Implements Conflict-Free Replicated Data Types with Vector Clocks

export class CRDTSync {
  constructor(db, kv) {
    this.db = db; // D1 database
    this.kv = kv; // KV namespace for local state
    this.vectorClock = {}; // { nodeId: counter }
    this.localState = {}; // Local CRDT state
    this.nodeId = this.generateNodeId();
  }
  
  generateNodeId() {
    // Generate a simple node ID (in production, use UUID or stable identifier)
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Append-Only Log: Store operations as discrete events
  async appendOperation(operation) {
    const op = {
      id: this.generateOpId(),
      type: operation.type, // 'update_pod', 'ping', 'presence', etc.
      payload: operation.payload,
      vectorClock: { ...this.vectorClock },
      timestamp: Date.now(),
      nodeId: this.nodeId
    };
    
    // Increment our vector clock
    this.vectorClock[this.nodeId] = (this.vectorClock[this.nodeId] || 0) + 1;
    op.vectorClock = { ...this.vectorClock };
    
    // Store locally (IndexedDB via KV)
    await this.kv.put(`crdt_op:${op.id}`, JSON.stringify(op));
    
    // Append to D1 append-only log
    if (this.db) {
      await this.db.prepare(`
        INSERT INTO crdt_log (op_id, node_id, op_type, payload, vector_clock, ts)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        op.id,
        op.nodeId,
        op.type,
        JSON.stringify(op.payload),
        JSON.stringify(op.vectorClock),
        op.timestamp
      ).run();
    }
    
    return op;
  }
  
  generateOpId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Tombstone: Soft-delete marker for causal consistency
  async createTombstone(entityId) {
    const tombstone = {
      entityId,
      deleted: true,
      deletedAt: Date.now(),
      deletedBy: this.nodeId,
      vectorClock: { ...this.vectorClock }
    };
    
    await this.kv.put(`tombstone:${entityId}`, JSON.stringify(tombstone));
    
    if (this.db) {
      await this.db.prepare(`
        INSERT INTO crdt_tombstones (entity_id, deleted_by, vector_clock, ts)
        VALUES (?, ?, ?, ?)
      `).bind(
        entityId,
        this.nodeId,
        JSON.stringify(tombstone.vectorClock),
        tombstone.deletedAt
      ).run();
    }
  }
  
  // Causal Consistency: Check if an operation causally precedes another
  causallyPrecedes(clockA, clockB) {
    let allLessOrEqual = true;
    let atLeastOneLess = false;
    
    const allKeys = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);
    
    for (const key of allKeys) {
      const a = clockA[key] || 0;
      const b = clockB[key] || 0;
      
      if (a > b) return false; // A has seen something B hasn't
      if (a < b) atLeastOneLess = true;
    }
    
    return allLessOrEqual && atLeastOneLess;
  }
  
  // Merge: Reconcile state from remote node
  async mergeRemoteState(remoteOps) {
    for (const remoteOp of remoteOps) {
      // Check if we've already seen this operation
      const existing = await this.kv.get(`crdt_op:${remoteOp.id}`);
      if (existing) continue; // Already applied
      
      // Check for conflicts using vector clocks
      const localClock = this.vectorClock;
      const remoteClock = remoteOp.vectorClock;
      
      // If remote causally precedes local, skip (we're ahead)
      if (this.causallyPrecedes(remoteClock, localClock)) {
        continue;
      }
      
      // Apply the operation
      await this.applyOperation(remoteOp);
      
      // Store the operation
      await this.kv.put(`crdt_op:${remoteOp.id}`, JSON.stringify(remoteOp));
      
      // Update our vector clock to merge
      this.mergeVectorClocks(remoteClock);
    }
  }
  
  mergeVectorClocks(remote) {
    const allKeys = new Set([...Object.keys(this.vectorClock), ...Object.keys(remote)]);
    for (const key of allKeys) {
      this.vectorClock[key] = Math.max(this.vectorClock[key] || 0, remote[key] || 0);
    }
  }
  
  async applyOperation(op) {
    // Apply the operation to local state
    switch (op.type) {
      case 'update_pod':
        this.localState[`pod:${op.payload.pod}`] = op.payload;
        break;
      case 'ping':
        this.localState[`ping:${op.payload.from}:${op.payload.to}`] = op.payload;
        break;
      case 'presence':
        this.localState[`presence:${op.payload.vertex}`] = op.payload;
        break;
    }
  }
  
  // Get incremental delta for sync
  async getDelta(lastSyncVector) {
    const ops = [];
    
    // In production, query D1 for ops after last sync
    if (this.db) {
      const results = await this.db.prepare(`
        SELECT * FROM crdt_log 
        WHERE ts > ? 
        ORDER BY ts ASC
      `).bind(lastSyncVector?.timestamp || 0).all();
      
      return results.results || [];
    }
    
    return ops;
  }
}

// Background Sync API integration (for PWA)
export function setupBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(registration => {
      // Register sync event
      registration.sync.register('crdt-sync').then(() => {
        console.log('Background sync registered');
      }).catch(err => {
        console.error('Background sync registration failed:', err);
      });
    });
  }
}

// Service Worker handler for CRDT sync
export const CRDTSyncHandler = async (event) => {
  if (event.tag === 'crdt-sync') {
    event.waitUntil(syncCRDT());
  }
};

async function syncCRDT() {
  // Flush local mutation queue to server
  const localOps = await getAllLocalOps(); // From IndexedDB
  
  try {
    const response = await fetch('https://command-center.trimtab-signal.workers.dev/api/crdt/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ops: localOps })
    });
    
    if (response.ok) {
      const { mergedOps } = await response.json();
      // Apply merged ops to local state
      await applyRemoteOps(mergedOps);
    }
  } catch (err) {
    console.error('CRDT sync failed:', err);
  }
}
