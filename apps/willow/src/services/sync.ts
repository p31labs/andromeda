/**
 * P31 Local-First Sync Layer
 * Mesh synchronization for bio-state, family cage, and voice history
 */

import { useState, useEffect } from 'react';
import { useBioStore } from '../stores/bioStore';
import { useCompanionStore } from '../stores/companionStore';

const SYNC_INTERVAL = 5000;
const SIMPLEX_URL = 'https://simplex-worker.trimtab-signal.workers.dev';

interface SyncState {
  lastSync: number;
  pendingUpdates: any[];
  connectionStatus: 'online' | 'offline' | 'syncing';
}

class MeshSync {
  private syncState: SyncState = {
    lastSync: 0,
    pendingUpdates: [],
    connectionStatus: 'offline'
  };

  private eventSource: EventSource | null = null;
  private _sseController: AbortController | null = null;
  private _sseRetryTimer: number | null = null;
  private syncInterval: number | null = null;

  async init() {
    this.loadLocalState();
    this.connectMesh();
    this.startPeriodicSync();
    window.addEventListener('online', () => this.connectMesh());
    window.addEventListener('offline', () => this.disconnectMesh());
  }

  private loadLocalState() {
    try {
      const bioState = localStorage.getItem('p31:passport:state');
      if (bioState) {
        const parsed = JSON.parse(bioState);
        useBioStore.setState({
          calcium: parsed.calcium || 8.4,
          spoons: parsed.spoons || 0.68,
          hrv: parsed.hrv || 62,
          lastUpdate: parsed.lastUpdate || Date.now()
        });
      }
      const companionState = localStorage.getItem('p31:companion:context');
      if (companionState) {
        const parsed = JSON.parse(companionState);
        useCompanionStore.setState({ contextQueue: parsed.contextQueue || [] });
      }
    } catch (e) {
      console.error('[P31 Sync] Load error:', e);
    }
  }

  private saveLocalState() {
    try {
      const bioState = useBioStore.getState();
      localStorage.setItem('p31:passport:state', JSON.stringify({
        calcium: bioState.calcium,
        spoons: bioState.spoons,
        hrv: bioState.hrv,
        lastUpdate: Date.now()
      }));
      const companionState = useCompanionStore.getState();
      localStorage.setItem('p31:companion:context', JSON.stringify({
        contextQueue: companionState.contextQueue,
        lastSync: Date.now()
      }));
    } catch (e) {
      console.error('[P31 Sync] Save error:', e);
    }
  }

  private connectMesh() {
    if (this.eventSource) return;
    try {
      // Use fetch-based SSE so we can send Accept header (EventSource doesn't support custom headers)
      this.syncState.connectionStatus = 'syncing';
      this.startFetchSse();
    } catch (e) {
      console.error('[P31 Sync] Connection error:', e);
      this.syncState.connectionStatus = 'offline';
    }
  }

  private startFetchSse() {
    const controller = new AbortController();
    this._sseController = controller;

    fetch(`${SIMPLEX_URL}/api/state`, {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok || !response.body) {
          throw new Error(`SSE HTTP ${response.status}`);
        }
        this.syncState.connectionStatus = 'online';
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const readChunk = (): Promise<void> =>
          reader.read().then(({ done, value }) => {
            if (done) {
              this.syncState.connectionStatus = 'offline';
              return;
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            let eventType = 'message';
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                try {
                  const payload = JSON.parse(line.slice(6));
                  this.handleMeshUpdate({ type: eventType, ...payload, _source: 'sse' });
                } catch { /* skip malformed */ }
              }
            }
            return readChunk();
          });

        return readChunk();
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('[P31 Sync] SSE error:', err);
        this.syncState.connectionStatus = 'offline';
        // Auto-reconnect after 5s
        this._sseRetryTimer = window.setTimeout(() => this.connectMesh(), 5000);
      });
  }

  private disconnectMesh() {
    this.eventSource?.close();
    this.eventSource = null;
    if (this._sseController) {
      this._sseController.abort();
      this._sseController = null;
    }
    if (this._sseRetryTimer) {
      clearTimeout(this._sseRetryTimer);
      this._sseRetryTimer = null;
    }
    this.syncState.connectionStatus = 'offline';
  }

  private handleMeshUpdate(data: any) {
    if (data._source === 'sse') {
      switch (data.type) {
        case 'heartbeat':
          this.syncState.connectionStatus = 'online';
          break;
        case 'state':
          if (data.biometric && data.biometric.source !== 'phos') {
            useBioStore.setState({
              calcium: data.biometric.calcium,
              spoons: data.biometric.spoons,
              hrv: data.biometric.hrv,
              lastUpdate: data.ts || Date.now()
            });
          }
          this.syncState.connectionStatus = 'online';
          break;
      }
      return;
    }
    switch (data.type) {
      case 'bio-update':
        if (data.source !== 'phos') {
          useBioStore.setState({
            calcium: data.data.calcium,
            spoons: data.data.spoons,
            hrv: data.data.hrv,
            lastUpdate: data.timestamp
          });
        }
        break;
      case 'heartbeat':
        this.syncState.connectionStatus = 'online';
        break;
    }
  }

  async pushBioState(bioState: { calcium: number; spoons: number; hrv: number }) {
    this.saveLocalState();
    if (navigator.onLine) {
      try {
        const response = await fetch(`${SIMPLEX_URL}/api/biometric`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...bioState, timestamp: Date.now(), source: 'phos' })
        });
        if (response.ok) this.syncState.lastSync = Date.now();
      } catch {
        this.syncState.pendingUpdates.push(bioState);
      }
    }
  }

  private startPeriodicSync() {
    this.syncInterval = window.setInterval(() => {
      this.saveLocalState();
      if (navigator.onLine && this.syncState.pendingUpdates.length > 0) {
        this.flushPendingUpdates();
      }
    }, SYNC_INTERVAL);
  }

  private async flushPendingUpdates() {
    while (this.syncState.pendingUpdates.length > 0) {
      const update = this.syncState.pendingUpdates[0];
      try {
        const response = await fetch(`${SIMPLEX_URL}/api/biometric`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        });
        if (response.ok) {
          this.syncState.pendingUpdates.shift();
          this.syncState.lastSync = Date.now();
        } else {
          break;
        }
      } catch {
        break;
      }
    }
  }

  getStatus() {
    return { ...this.syncState, isOnline: navigator.onLine };
  }

  destroy() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.disconnectMesh();
  }
}

let meshSync: MeshSync | null = null;

export function initSync() {
  if (!meshSync) {
    meshSync = new MeshSync();
    meshSync.init();
  }
  return meshSync;
}

export function getSync() {
  return meshSync;
}

export function useMeshSync() {
  const [status, setStatus] = useState({
    connectionStatus: 'offline',
    lastSync: 0,
    isOnline: navigator.onLine
  });
  useEffect(() => {
    const sync = initSync();
    const interval = setInterval(() => setStatus(sync.getStatus()), 1000);
    return () => clearInterval(interval);
  }, []);
  return status;
}
