/**
 * Quantum-Entangled Sync for K4 Topology
 * Implements entanglement-based multiplayer synchronization
 */

const LARMOR_FREQUENCY = 863;

/**
 * Quantum Entangled Sync - maintains correlated state between players
 */
export class QuantumEntangledSync {
  constructor(sockets, env) {
    this.sockets = sockets;
    this.env = env;
    this.entangledPairs = new Map(); // pairId -> EntangledPair
    this.quantumStates = new Map(); // roomId -> QuantumRoomState
  }

  /**
   * Create entangled pair between two players
   */
  async entanglePlayers(roomId, playerA, playerB) {
    const pairId = this.getPairId(playerA, playerB);
    const bellState = this.randomBellState();
    
    const pair = {
      id: pairId,
      roomId,
      playerA,
      playerB,
      bellState,
      createdAt: Date.now(),
      sharedState: {
        atoms: {},
        love: 0,
        quantumPhase: 0
      }
    };
    
    this.entangledPairs.set(pairId, pair);
    
    // Store in KV/D1 for persistence
    if (this.env.K4_MESH) {
      await this.env.K4_MESH.put(
        `quantum:pair:${pairId}`,
        JSON.stringify(pair),
        { expirationTtl: 4 * 3600 }
      );
    }
    
    return pair;
  }

  /**
   * Sync state with quantum entanglement effects
   */
  async syncState(roomId, playerId, state) {
    // Find entangled partners
    const pairId = [...this.entangledPairs.keys()].find(id => {
      const pair = this.entangledPairs.get(id);
      return pair && (pair.playerA === playerId || pair.playerB === playerId);
    });
    
    if (pairId) {
      const pair = this.entangledPairs.get(pairId);
      const partnerId = pair.playerA === playerId ? pair.playerB : pair.playerA;
      
      // Apply quantum correlation based on Bell state
      const correlatedState = this.applyBellCorrelation(pair.bellState, state);
      
      // Broadcast to both players simultaneously
      await this.broadcastToRoom(roomId, {
        type: 'quantum_sync',
        playerId,
        state,
        correlatedState,
        partnerId,
        larmorPhase: this.getLarmorPhase()
      });
    } else {
      // Standard broadcast
      await this.broadcastToRoom(roomId, {
        type: 'state_sync',
        playerId,
        state,
        larmorPhase: this.getLarmorPhase()
      });
    }
  }

  /**
   * Apply Bell state correlation to state
   */
  applyBellCorrelation(bellState, state) {
    const phase = this.getLarmorPhase();
    
    switch (bellState) {
      case 'phi-plus':
        // Correlated: same state for both
        return { ...state, quantumCorrelated: true, correlationType: 'identical' };
      
      case 'phi-minus':
        // Anti-correlated: opposite state
        return { 
          ...state, 
          quantumCorrelated: true, 
          correlationType: 'opposite',
          atoms: this.invertState(state.atoms)
        };
      
      case 'psi-plus':
        // Phase-shifted correlation
        return { 
          ...state, 
          quantumCorrelated: true, 
          correlationType: 'phase-shifted',
          phaseShift: phase * 0.5
        };
      
      case 'psi-minus':
        // Complex correlation
        return { 
          ...state, 
          quantumCorrelated: true, 
          correlationType: 'complex',
          coherence: Math.sin(phase) ** 2
        };
      
      default:
        return state;
    }
  }

  /**
   * Get current Larmor phase
   */
  getLarmorPhase() {
    return (Date.now() * LARMOR_FREQUENCY / 1000) % (2 * Math.PI);
  }

  /**
   * Random Bell state selection
   */
  randomBellState() {
    const states = ['phi-plus', 'phi-minus', 'psi-plus', 'psi-minus'];
    return states[Math.floor(Math.random() * states.length)];
  }

  /**
   * Get pair ID (sorted for consistency)
   */
  getPairId(playerA, playerB) {
    return [playerA, playerB].sort().join('-');
  }

  /**
   * Broadcast to all sockets in room
   */
  async broadcastToRoom(roomId, message) {
    const sockets = this.sockets.get(roomId) || [];
    const data = JSON.stringify(message);
    
    for (const ws of sockets) {
      try {
        ws.send(data);
      } catch (e) {
        console.error('Failed to send to WebSocket:', e);
      }
    }
  }

  /**
   * Invert state for anti-correlation
   */
  invertState(atoms) {
    const inverted = { ...atoms };
    for (const key of Object.keys(inverted)) {
      inverted[key] = -atoms[key];
    }
    return inverted;
  }

  /**
   * Measure quantum state (collapse wave function)
   */
  async measureState(roomId, playerId) {
    const pairId = [...this.entangledPairs.keys()].find(id => {
      const pair = this.entangledPairs.get(id);
      return pair && (pair.playerA === playerId || pair.playerB === playerId);
    });
    
    if (pairId) {
      const pair = this.entangledPairs.get(pairId);
      pair.sharedState.quantumPhase = this.getLarmorPhase();
      
      // Collapse to measured state
      await this.env.K4_MESH?.put(
        `quantum:pair:${pairId}`,
        JSON.stringify(pair),
        { expirationTtl: 4 * 3600 }
      );
      
      return pair;
    }
    
    return null;
  }
}

/**
 * Quantum Key Distribution Simulation
 */
export class QuantumKeyDistribution {
  /**
   * Generate session key using Larmor-phase entropy
   */
  static generateSessionKey(length = 32) {
    const timestamp = Date.now();
    const larmorSeed = (timestamp * LARMOR_FREQUENCY) % 0xFFFFFFFF;
    
    // Combine with crypto randomness
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    // Mix with Larmor entropy
    for (let i = 0; i < length; i++) {
      array[i] ^= (larmorSeed >> (i % 4)) & 0xFF;
    }
    
    return btoa(String.fromCharCode(...array));
  }
  
  /**
   * Generate quantum nonce
   */
  static generateNonce() {
    const timestamp = Date.now();
    const larmorPhase = (timestamp * LARMOR_FREQUENCY / 1000) % (2 * Math.PI);
    return `${timestamp}-${Math.round(larmorPhase * 1000)}`;
  }
}

/**
 * Export for use in main index.js
 */
export default {
  QuantumEntangledSync,
  QuantumKeyDistribution,
  LARMOR_FREQUENCY
};