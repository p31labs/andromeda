import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import { useSovereignStore } from '../../sovereign/useSovereignStore';

/**
 * P31 LABS: Kenosis Mesh (Delta Topology CRDT Engine)
 * Replaces centralized database polling with local P2P WebRTC syncing and 
 * IndexedDB offline persistence.
 */

class KenosisMesh {
  public doc: Y.Doc;
  private provider: WebrtcProvider | null = null;
  private persistence: IndexeddbPersistence | null = null;
  
  public stateMap: Y.Map<any>;
  public telemetryArray: Y.Array<any>;

  constructor() {
    this.doc = new Y.Doc();
    
    this.stateMap = this.doc.getMap('spaceship-earth-state');
    this.telemetryArray = this.doc.getArray('genesis-telemetry');
  }

  public ignite(roomName: string = 'p31-local-mesh') {
    if (this.provider) return;

    console.log(`[KenosisMesh] Igniting Delta Topology in room: ${roomName}`);

    this.persistence = new IndexeddbPersistence(roomName, this.doc);
    
    this.persistence.on('synced', () => {
      console.log('[KenosisMesh] Local IndexedDB state hydrated.');
      this.syncToZustand();
    });

    this.provider = new WebrtcProvider(roomName, this.doc, {
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com'
      ]
    });

    this.provider.on('synced', (state: unknown) => {
      console.log('[KenosisMesh] WebRTC Peer synchronization complete.', state);
    });

    this.stateMap.observeDeep(() => {
      this.syncToZustand();
    });
  }

  private syncToZustand() {
    const remoteSpoons = this.stateMap.get('spoons');
    const remoteGenesisStatus = this.stateMap.get('genesisSyncStatus');
    
    if (remoteSpoons !== undefined) {
      useSovereignStore.setState({ spoons: remoteSpoons });
    }
    
    if (remoteGenesisStatus) {
      useSovereignStore.setState({ genesisSyncStatus: remoteGenesisStatus });
    }
  }

  public broadcastState(key: string, value: unknown) {
    this.stateMap.set(key, value);
  }

  public halt() {
    if (this.provider) {
      this.provider.disconnect();
      this.provider = null;
    }
    console.log('[KenosisMesh] Mesh connection severed.');
  }
}

export const mesh = new KenosisMesh();