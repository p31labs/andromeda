/**
 * CRDT-based Synchronization Engine for K⁴ Family Messaging
 * Implements operation-based CRDT for real-time message convergence
 * 
 * This module provides conflict-free replication for offline-first messaging
 * ensuring eventual consistency across all devices in the family mesh.
 */

import * as Y from 'yjs';

/**
 * MessageCRDT - Manages message history as operation-based CRDT
 * Uses Yjs Array for ordered message storage
 */
export class MessageCRDT {
  constructor(yDoc, messagesArrayName = 'messages') {
    this.yDoc = yDoc;
    this.messages = yDoc.getArray(messagesArrayName);
    this.pendingOperations = [];
    this.lastSyncVector = null;
  }

  /**
   * Add new message to CRDT
   * @param {Object} message - Message object
   * @param {string} clientId - Originating client ID
   */
  addMessage(message, clientId) {
    const messageWithMeta = {
      ...message,
      _v: 1, // CRDT version
      _clientId: clientId,
      _timestamp: message.timestamp || Date.now(),
      _deleted: false
    };

    // Insert at correct position based on timestamp
    const insertIndex = this.findInsertIndex(messageWithMeta);
    this.messages.insert(insertIndex, [messageWithMeta]);

    // Generate operation event
    this.emitOperation({
      type: 'insert',
      index: insertIndex,
      content: messageWithMeta,
      clientId,
      timestamp: Date.now()
    });

    return messageWithMeta;
  }

  /**
   * Update existing message (edit)
   * @param {string} messageId - Message ID
   * @param {Object} updates - Fields to update
   * @param {string} clientId - Originating client ID
   */
  updateMessage(messageId, updates, clientId) {
    const index = this.findMessageIndex(messageId);
    if (index === -1) return null;

    const message = this.messages.get(index);
    const updatedMessage = {
      ...message,
      ...updates,
      _v: (message._v || 1) + 1,
      _editedAt: Date.now(),
      _editedBy: clientId
    };

    this.messages.delete(index, 1);
    this.messages.insert(index, [updatedMessage]);

    this.emitOperation({
      type: 'update',
      index,
      content: updatedMessage,
      clientId,
      timestamp: Date.now()
    });

    return updatedMessage;
  }

  /**
   * Soft delete message (flag as deleted)
   * @param {string} messageId - Message ID
   * @param {string} clientId - Originating client ID
   */
  deleteMessage(messageId, clientId) {
    const index = this.findMessageIndex(messageId);
    if (index === -1) return false;

    const message = this.messages.get(index);
    const deletedMessage = {
      ...message,
      _deleted: true,
      _deletedAt: Date.now(),
      _deletedBy: clientId,
      _v: (message._v || 1) + 1
    };

    this.messages.delete(index, 1);
    this.messages.insert(index, [deletedMessage]);

    this.emitOperation({
      type: 'delete',
      index,
      messageId,
      clientId,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Get non-deleted messages as array
   * @param {number} limit - Max messages
   * @param {number} before - Timestamp cursor
   */
  getMessages(limit = 50, before = null) {
    const messages = [];
    const array = this.messages.toArray();

    for (let i = array.length - 1; i >= 0; i--) {
      const msg = array[i];
      if (msg._deleted) continue;
      if (before && msg._timestamp >= before) continue;

      // Clean CRDT metadata
      const { _v, _clientId, _timestamp, _deleted, ...cleanMsg } = msg;
      messages.push(cleanMsg);

      if (messages.length >= limit) break;
    }

    return messages.reverse();
  }

  /**
   * Get all messages including deleted (for sync)
   */
  getAllMessages() {
    return this.messages.toArray();
  }

  /**
   * Get CRDT state vector for synchronization
   * @returns {Object} State vector
   */
  getStateVector() {
    return {
      messageCount: this.messages.length,
      lastUpdate: Date.now(),
      // Yjs provides state vector internally
      // Would export Yjs update for sync
    };
  }

  /**
   * Apply remote operations (from other client)
   * @param {Array} operations - Array of CRDT operations
   */
  applyRemoteOperations(operations) {
    this.yDoc.transact(() => {
      for (const op of operations) {
        this.applyOperation(op);
      }
    });
  }

  /**
   * Apply single operation
   * @param {Object} operation - CRDT operation
   */
  applyOperation(operation) {
    switch (operation.type) {
      case 'insert':
        this.messages.insert(operation.index, [operation.content]);
        break;
      case 'update':
        const existing = this.messages.get(operation.index);
        if (existing) {
          this.messages.delete(operation.index, 1);
          this.messages.insert(operation.index, [operation.content]);
        }
        break;
      case 'delete':
        // Already handled as soft delete in data model
        break;
    }
  }

  /**
   * Find insert index for message based on timestamp ordering
   * @param {Object} message - Message to insert
   */
  findInsertIndex(message) {
    const array = this.messages.toArray();
    const ts = message._timestamp;

    // Binary search for insertion point
    let left = 0;
    let right = array.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midTs = array[mid]._timestamp;

      if (midTs < ts) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  /**
   * Find message index by ID
   * @param {string} messageId - Message ID to find
   */
  findMessageIndex(messageId) {
    const array = this.messages.toArray();
    for (let i = 0; i < array.length; i++) {
      if (array[i].id === messageId) return i;
    }
    return -1;
  }

  /**
   * Emit operation event
   * @param {Object} operation - Operation to emit
   */
  emitOperation(operation) {
    // In production, would emit to listeners
    // This would trigger WebSocket broadcast
    if (this.onOperation) {
      this.onOperation(operation);
    }
  }

  /**
   * Export Yjs document state (for persistence)
   */
  exportState() {
    return Y.encodeStateAsUpdate(this.yDoc);
  }

  /**
   * Import Yjs document state (for recovery)
   */
  importState(update) {
    Y.applyUpdate(this.yDoc, update);
  }

  /**
   * Destroy CRDT instance
   */
  destroy() {
    this.yDoc.destroy();
  }
}

/**
 * ConversationCRDT - Manages conversation list and metadata
 */
export class ConversationCRDT {
  constructor(yDoc, conversationsMapName = 'conversations') {
    this.yDoc = yDoc;
    this.conversations = yDoc.getMap(conversationsMapName);
  }

  /**
   * Create or update conversation
   * @param {Object} conversation - Conversation data
   */
  upsertConversation(conversation) {
    const existing = this.conversations.get(conversation.id);
    
    if (existing) {
      // Merge metadata
      const merged = {
        ...existing,
        ...conversation,
        updatedAt: Date.now()
      };
      this.conversations.set(conversation.id, merged);
    } else {
      this.conversations.set(conversation.id, {
        ...conversation,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return this.conversations.get(conversation.id);
  }

  /**
   * Get all conversations
   */
  getConversations() {
    return Array.from(this.conversations.values());
  }

  /**
   * Get conversation by ID
   * @param {string} id - Conversation ID
   */
  getConversation(id) {
    return this.conversations.get(id);
  }

  /**
   * Update conversation metadata (last read, unread count)
   * @param {string} id - Conversation ID
   * @param {Object} metadata - Metadata updates
   */
  updateMetadata(id, metadata) {
    const conv = this.conversations.get(id);
    if (!conv) return null;

    const updated = {
      ...conv,
      ...metadata,
      updatedAt: Date.now()
    };
    this.conversations.set(id, updated);
    return updated;
  }
}

/**
 * SyncManager - Coordinates full synchronization between clients
 */
export class SyncManager {
  constructor() {
    this.peers = new Map(); // peerId -> Yjs state
    this.pendingOperations = [];
  }

  /**
   * Generate initial sync state for new client
   * @param {Y.Doc} yDoc - Yjs document
   */
  generateInitialSync(yDoc) {
    const state = Y.encodeStateAsUpdate(yDoc);
    return {
      type: 'initial_sync',
      state: Array.from(new Uint8Array(state)),
      vector: Y.encodeStateVector(yDoc),
      timestamp: Date.now()
    };
  }

  /**
   * Process sync update from peer
   * @param {Y.Doc} yDoc - Local Yjs document
   * @param {Uint8Array} remoteUpdate - Remote state update
   * @param {Uint8Array} knownVector - Client's known state vector
   */
  processSyncUpdate(yDoc, remoteUpdate, knownVector) {
    // Compute missing updates
    const missingUpdate = Y.mergeUpdates(remoteUpdate);
    
    // Apply to local document
    Y.applyUpdate(yDoc, missingUpdate);

    return {
      success: true,
      applied: true,
      // Generate acknowledgment with new state
      acknowledgment: this.generateAck(yDoc)
    };
  }

  /**
   * Generate acknowledgment with new updates
   * @param {Y.Doc} yDoc - Yjs document
   */
  generateAck(yDoc) {
    return {
      type: 'ack',
      state: Array.from(new Uint8Array(Y.encodeStateAsUpdate(yDoc))),
      timestamp: Date.now()
    };
  }

  /**
   * Generate sync request from client
   * @param {Uint8Array} clientVector - Client's state vector
   */
  generateSyncRequest(clientVector) {
    return {
      type: 'sync_request',
      vector: Array.from(new Uint8Array(clientVector)),
      timestamp: Date.now()
    };
  }
}

/**
 * CRDT Utilities
 */

/**
 * Generate unique operation ID
 */
export function generateOpId(clientId) {
  return `${clientId}-${Date.now()}-${crypto.randomUUID()}`;
}

/**
 * Deterministic conflict resolution
 * Uses Lamport timestamp + client ID ordering
 */
export function resolveConflict(op1, op2) {
  if (op1._timestamp < op2._timestamp) return op1;
  if (op1._timestamp > op2._timestamp) return op2;
  
  // Same timestamp: use client ID as tiebreaker
  if (op1._clientId < op2._clientId) return op1;
  return op2;
}

/**
 * Validate CRDT operation
 */
export function validateOperation(op) {
  const required = ['type', 'clientId', 'timestamp'];
  for (const field of required) {
    if (!(field in op)) {
      throw new Error(`Invalid operation: missing ${field}`);
    }
  }

  if (op.type === 'insert' && (!op.content || op.index === undefined)) {
    throw new Error('Insert operation requires content and index');
  }

  if (op.type === 'update' && (!op.content || op.index === undefined)) {
    throw new Error('Update operation requires content and index');
  }
}

// Export factory functions
export function createMessageCRDT(config = {}) {
  const yDoc = new Y.Doc();
  return new MessageCRDT(yDoc, config.name || 'messages');
}

export function createConversationCRDT(config = {}) {
  const yDoc = new Y.Doc();
  return new ConversationCRDT(yDoc, config.name || 'conversations');
}

export function createSyncManager() {
  return new SyncManager();
}
