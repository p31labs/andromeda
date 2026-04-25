/**
 * Family Registry Durable Object
 * Manages family members, relationships, and device registration
 * Acts as Authentication Service for MLS (Messaging Layer Security)
 * 
 * P31 Labs, Inc. | EIN 42-1888158
 */

import { DurableObject } from 'cloudflare:workers';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

function err(message, status = 400) {
  return json({ error: message, timestamp: new Date().toISOString() }, status);
}

/**
 * FamilyRegistryDO - Control plane for family mesh management
 * 
 * Responsibilities:
 * - Family member registration and verification
 * - Relationship mapping and graph management
 * - Device management and authentication
 * - MLS KeyPackage distribution
 * - Access control and authorization
 * - Presence coordination
 */
export class FamilyRegistryDO extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  /**
   * Handle HTTP requests
   * @param {Request} request
   */
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // Family member endpoints
      if (path === '/family/members' && method === 'POST') {
        return await this.handleRegisterMember(request);
      }

      if (path === '/family/members' && method === 'GET') {
        return await this.handleListMembers(request);
      }

      if (path.match(/^\/family\/members\/([^/]+)$/) && method === 'GET') {
        const memberId = path.split('/')[3];
        return await this.handleGetMember(memberId);
      }

      if (path.match(/^\/family\/members\/([^/]+)$/) && method === 'PUT') {
        const memberId = path.split('/')[3];
        return await this.handleUpdateMember(memberId, request);
      }

      if (path.match(/^\/family\/members\/([^/]+)$/) && method === 'DELETE') {
        const memberId = path.split('/')[3];
        return await this.handleDeleteMember(memberId);
      }

      // Relationship endpoints
      if (path === '/family/relationships' && method === 'POST') {
        return await this.handleCreateRelationship(request);
      }

      if (path === '/family/relationships' && method === 'GET') {
        return await this.handleListRelationships(request);
      }

      if (path.match(/^\/family\/relationships\/([^/]+)$/) && method === 'DELETE') {
        const relId = path.split('/')[3];
        return await this.handleDeleteRelationship(relId);
      }

      // Device management
      if (path === '/family/devices' && method === 'POST') {
        return await this.handleRegisterDevice(request);
      }

      if (path === '/family/devices' && method === 'GET') {
        return await this.handleListDevices(request);
      }

      // MLS KeyPackage endpoints
      if (path.match(/^\/family\/members\/([^/]+)\/keypackage$/) && method === 'POST') {
        const memberId = path.split('/')[3];
        return await this.handleUploadKeyPackage(memberId, request);
      }

      if (path.match(/^\/family\/groups\/([^/]+)\/keypackages$/) && method === 'GET') {
        const groupId = path.split('/')[3];
        return await this.handleGetGroupKeyPackages(groupId);
      }

      // Access control
      if (path === '/family/permissions' && method === 'POST') {
        return await this.handleSetPermissions(request);
      }

      if (path.match(/^\/family\/permissions\/([^/]+)$/) && method === 'GET') {
        const userId = path.split('/')[3];
        return await this.handleGetPermissions(userId);
      }

      // Presence coordination
      if (path === '/family/presence' && method === 'POST') {
        return await this.handleUpdatePresence(request);
      }

      if (path === '/family/presence' && method === 'GET') {
        return await this.handleGetPresence(request);
      }

      // Health check
      if (path === '/health') {
        return json({ status: 'ok', service: 'family-registry' });
      }

      return err('Not found', 404);
    } catch (e) {
      console.error('Error in FamilyRegistryDO:', e);
      return err(`Internal error: ${e.message}`, 500);
    }
  }

  /**
   * Handle member registration
   * @param {Request} request
   */
  async handleRegisterMember(request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.userId || !body.name) {
      return err('Missing required fields: userId, name');
    }

    const memberId = crypto.randomUUID();
    const timestamp = Date.now();

    const member = {
      id: memberId,
      userId: body.userId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      relationship: body.relationship || 'member',
      avatar: body.avatar || null,
      status: 'active',
      verified: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: body.metadata || {},
      devices: [],
      keyPackages: []
    };

    // Store in D1 if available
    if (this.env.DB) {
      await this.env.DB.prepare(
        `INSERT INTO family_members 
         (id, user_id, name, email, phone, relationship, avatar, status, verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        member.id,
        member.userId,
        member.name,
        member.email,
        member.phone,
        member.relationship,
        member.avatar,
        member.status,
        member.verified ? 1 : 0,
        member.createdAt,
        member.updatedAt
      ).run();
    } else {
      // KV fallback
      const key = `family:member:${memberId}`;
      await this.ctx.storage.put(key, JSON.stringify(member));
    }

    // Initialize default relationships
    await this.initializeDefaultRelations(memberId, body.userId);

    return json({
      success: true,
      member: { ...member, devices: [], keyPackages: [] }
    }, 201);
  }

  /**
   * Get member by ID
   * @param {string} memberId
   */
  async handleGetMember(memberId) {
    let member;

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT * FROM family_members WHERE id = ?`
      ).bind(memberId).first();

      if (!result) return err('Member not found', 404);

      member = {
        ...result,
        verified: Boolean(result.verified),
        devices: [],
        keyPackages: []
      };
    } else {
      const key = `family:member:${memberId}`;
      const raw = await this.ctx.storage.get(key);
      if (!raw) return err('Member not found', 404);

      member = JSON.parse(raw);
    }

    // Fetch devices and key packages
    member.devices = await this.getDevicesForMember(memberId);
    member.keyPackages = await this.getKeyPackagesForMember(memberId);

    return json({ member });
  }

  /**
   * List all family members
   * @param {Request} request
   */
  async handleListMembers(request) {
    let members = [];

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT id, user_id, name, email, relationship, status, created_at 
         FROM family_members 
         ORDER BY created_at DESC`
      ).all();

      members = result.results || [];
    } else {
      // KV fallback - list all keys with prefix
      const prefix = 'family:member:';
      const list = await this.ctx.storage.list({ prefix });
      for (const [key, value] of list) {
        const member = JSON.parse(value);
        members.push({
          id: member.id,
          userId: member.userId,
          name: member.name,
          email: member.email,
          relationship: member.relationship,
          status: member.status
        });
      }
    }

    return json({
      members,
      count: members.length
    });
  }

  /**
   * Update member
   * @param {string} memberId
   * @param {Request} request
   */
  async handleUpdateMember(memberId, request) {
    const body = await request.json().catch(() => null);

    if (!body) return err('Invalid JSON');

    const timestamp = Date.now();
    const updates = [];
    const values = [];

    // Build dynamic update
    const allowedFields = ['name', 'email', 'phone', 'relationship', 'avatar', 'status'];
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    });

    if (updates.length === 0) {
      return err('No fields to update');
    }

    updates.push('updated_at = ?');
    values.push(timestamp);
    values.push(memberId);

    if (this.env.DB) {
      await this.env.DB.prepare(
        `UPDATE family_members SET ${updates.join(', ')} WHERE id = ?`
      ).bind(...values).run();
    } else {
      const key = `family:member:${memberId}`;
      const raw = await this.ctx.storage.get(key);
      if (!raw) return err('Member not found', 404);

      const member = JSON.parse(raw);
      Object.assign(member, body);
      member.updatedAt = timestamp;
      await this.ctx.storage.put(key, JSON.stringify(member));
    }

    return json({ success: true, memberId, updates: body });
  }

  /**
   * Delete member
   * @param {string} memberId
   */
  async handleDeleteMember(memberId) {
    // Delete member and related data
    if (this.env.DB) {
      await this.env.DB.prepare(`DELETE FROM family_members WHERE id = ?`).bind(memberId).run();
      await this.env.DB.prepare(`DELETE FROM family_relationships WHERE member1_id = ? OR member2_id = ?`).bind(memberId, memberId).run();
      await this.ctx.storage.delete(`family:member:${memberId}`);
    } else {
      await this.ctx.storage.delete(`family:member:${memberId}`);
      // Delete relationships
      const prefix = `family:rel:${memberId}:`;
      const list = await this.ctx.storage.list({ prefix });
      for (const [key] of list) {
        await this.ctx.storage.delete(key);
      }
    }

    return json({ success: true, deleted: memberId });
  }

  /**
   * Create relationship between members
   * @param {Request} request
   */
  async handleCreateRelationship(request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.member1Id || !body.member2Id || !body.relationshipType) {
      return err('Missing required fields: member1Id, member2Id, relationshipType');
    }

    const relId = crypto.randomUUID();
    const timestamp = Date.now();

    const rel = {
      id: relId,
      member1Id: body.member1Id,
      member2Id: body.member2Id,
      relationshipType: body.relationshipType,
      metadata: body.metadata || {},
      createdAt: timestamp
    };

    if (this.env.DB) {
      await this.env.DB.prepare(
        `INSERT INTO family_relationships (id, member1_id, member2_id, relationship_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        rel.id,
        rel.member1Id,
        rel.member2Id,
        rel.relationshipType,
        JSON.stringify(rel.metadata),
        rel.createdAt
      ).run();
    } else {
      const key = `family:rel:${relId}`;
      await this.ctx.storage.put(key, JSON.stringify(rel));

      // Index for reverse lookup
      const idxKey1 = `family:idx:member:${body.member1Id}`;
      const idxKey2 = `family:idx:member:${body.member2Id}`;
      // Store in index (simplified)
    }

    return json({ success: true, relationship: rel }, 201);
  }

  /**
   * List relationships
   * @param {Request} request
   */
  async handleListRelationships(request) {
    const memberId = new URL(request.url).searchParams.get('memberId');

    let relationships = [];

    if (this.env.DB) {
      let query = `SELECT * FROM family_relationships`;
      const params = [];

      if (memberId) {
        query += ` WHERE member1_id = ? OR member2_id = ?`;
        params.push(memberId, memberId);
      }

      const result = await this.env.DB.prepare(query).bind(...params).all();
      relationships = result.results || [];
    } else {
      // Simplified - list all
      const prefix = 'family:rel:';
      const list = await this.ctx.storage.list({ prefix });
      for (const [key, value] of list) {
        relationships.push(JSON.parse(value));
      }
    }

    return json({ relationships, count: relationships.length });
  }

  /**
   * Delete relationship
   * @param {string} relId
   */
  async handleDeleteRelationship(relId) {
    if (this.env.DB) {
      await this.env.DB.prepare(`DELETE FROM family_relationships WHERE id = ?`).bind(relId).run();
    } else {
      await this.ctx.storage.delete(`family:rel:${relId}`);
    }

    return json({ success: true, deleted: relId });
  }

  /**
   * Register device for member
   * @param {Request} request
   */
  async handleRegisterDevice(request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.memberId || !body.deviceId || !body.deviceType) {
      return err('Missing required fields: memberId, deviceId, deviceType');
    }

    const deviceId = crypto.randomUUID();
    const timestamp = Date.now();

    const device = {
      id: deviceId,
      memberId: body.memberId,
      deviceId: body.deviceId,
      deviceType: body.deviceType,
      platform: body.platform || 'unknown',
      pushToken: body.pushToken || null,
      lastSeen: timestamp,
      createdAt: timestamp,
      metadata: body.metadata || {}
    };

    if (this.env.DB) {
      await this.env.DB.prepare(
        `INSERT INTO devices (id, member_id, device_id, device_type, platform, push_token, last_seen, created_at, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        device.id,
        device.memberId,
        device.deviceId,
        device.deviceType,
        device.platform,
        device.pushToken,
        device.lastSeen,
        device.createdAt,
        JSON.stringify(device.metadata)
      ).run();
    } else {
      const key = `family:device:${deviceId}`;
      await this.ctx.storage.put(key, JSON.stringify(device));

      // Add to member's device list
      const memberKey = `family:member:${body.memberId}`;
      const raw = await this.ctx.storage.get(memberKey);
      if (raw) {
        const member = JSON.parse(raw);
        member.devices = member.devices || [];
        member.devices.push(deviceId);
        await this.ctx.storage.put(memberKey, JSON.stringify(member));
      }
    }

    return json({ success: true, device }, 201);
  }

  /**
   * List devices for member
   * @param {Request} request
   */
  async handleListDevices(request) {
    const memberId = new URL(request.url).searchParams.get('memberId');

    if (!memberId) {
      return err('Missing memberId');
    }

    let devices = [];

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT * FROM devices WHERE member_id = ? ORDER BY last_seen DESC`
      ).bind(memberId).all();

      devices = result.results || [];
    } else {
      // Get member's device list
      const memberKey = `family:member:${memberId}`;
      const raw = await this.ctx.storage.get(memberKey);
      if (raw) {
        const member = JSON.parse(raw);
        const deviceIds = member.devices || [];
        for (const devId of deviceIds) {
          const devKey = `family:device:${devId}`;
          const devRaw = await this.ctx.storage.get(devKey);
          if (devRaw) devices.push(JSON.parse(devRaw));
        }
      }
    }

    return json({ devices, count: devices.length });
  }

  /**
   * Upload MLS KeyPackage for member
   * @param {string} memberId
   * @param {Request} request
   */
  async handleUploadKeyPackage(memberId, request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.keyPackage) {
      return err('Missing keyPackage');
    }

    const timestamp = Date.now();
    const keyPackage = {
      memberId,
      keyPackage: body.keyPackage,
      createdAt: timestamp,
      expiresAt: timestamp + (365 * 24 * 60 * 60 * 1000) // 1 year
    };

    if (this.env.DB) {
      await this.env.DB.prepare(
        `INSERT INTO key_packages (member_id, key_package, created_at, expires_at)
         VALUES (?, ?, ?, ?)`
      ).bind(memberId, JSON.stringify(body.keyPackage), timestamp, keyPackage.expiresAt).run();
    } else {
      const key = `family:keypkg:${memberId}:${crypto.randomUUID()}`;
      await this.ctx.storage.put(key, JSON.stringify(keyPackage));
    }

    return json({ success: true, keyPackage });
  }

  /**
   * Get MLS KeyPackages for group
   * @param {string} groupId
   */
  async handleGetGroupKeyPackages(groupId) {
    // Get all active members of group and their key packages
    const members = await this.getGroupMembers(groupId);
    const keyPackages = [];

    for (const member of members) {
      const packages = await this.getKeyPackagesForMember(member.id);
      if (packages.length > 0) {
        keyPackages.push({
          memberId: member.id,
          userId: member.userId,
          keyPackage: packages[0] // Latest valid key package
        });
      }
    }

    return json({ keyPackages, count: keyPackages.length });
  }

  /**
   * Set permissions for member
   * @param {Request} request
   */
  async handleSetPermissions(request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.userId || !body.permissions) {
      return err('Missing required fields: userId, permissions');
    }

    const timestamp = Date.now();

    if (this.env.DB) {
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO permissions (user_id, permissions, updated_at)
         VALUES (?, ?, ?)`
      ).bind(body.userId, JSON.stringify(body.permissions), timestamp).run();
    } else {
      const key = `family:perm:${body.userId}`;
      await this.ctx.storage.put(key, JSON.stringify({
        userId: body.userId,
        permissions: body.permissions,
        updatedAt: timestamp
      }));
    }

    return json({ success: true, userId: body.userId, permissions: body.permissions });
  }

  /**
   * Get permissions for user
   * @param {string} userId
   */
  async handleGetPermissions(userId) {
    let perm;

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT * FROM permissions WHERE user_id = ?`
      ).bind(userId).first();
      perm = result;
    } else {
      const key = `family:perm:${userId}`;
      const raw = await this.ctx.storage.get(key);
      perm = raw ? JSON.parse(raw) : null;
    }

    if (!perm) {
      return json({ userId, permissions: ['reader'] });
    }

    return json({ userId, permissions: perm.permissions });
  }

  /**
   * Update presence
   * @param {Request} request
   */
  async handleUpdatePresence(request) {
    const body = await request.json().catch(() => null);

    if (!body || !body.userId || !body.status) {
      return err('Missing required fields: userId, status');
    }

    const timestamp = Date.now();
    const presence = {
      userId: body.userId,
      status: body.status, // online, offline, away, busy
      deviceId: body.deviceId || null,
      lastSeen: timestamp,
      metadata: body.metadata || {}
    };

    // Store in KV for fast access
    await this.ctx.storage.put(`family:presence:${body.userId}`, JSON.stringify(presence));

    // Broadcast via mesh
    if (this.env.K4_CAGE) {
      try {
        await this.env.K4_CAGE.fetch(new Request(
          `https://k4-cage.internal/api/presence/${body.userId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: body.status, metadata: presence.metadata })
          }
        ));
      } catch (e) {
        console.error('Failed to broadcast presence:', e);
      }
    }

    return json({ success: true, presence });
  }

  /**
   * Get presence for users
   * @param {Request} request
   */
  async handleGetPresence(request) {
    const userIds = new URL(request.url).searchParams.get('userIds');

    let presenceMap = {};

    if (userIds) {
      const ids = userIds.split(',');
      for (const id of ids) {
        const raw = await this.ctx.storage.get(`family:presence:${id}`);
        presenceMap[id] = raw ? JSON.parse(raw) : { userId: id, status: 'offline' };
      }
    } else {
      // List all presence keys (KV only)
      const prefix = 'family:presence:';
      const list = await this.ctx.storage.list({ prefix });
      for (const [key, value] of list) {
        const userId = key.replace(prefix, '');
        presenceMap[userId] = JSON.parse(value);
      }
    }

    return json({ presence: presenceMap, count: Object.keys(presenceMap).length });
  }

  /**
   * Initialize default relationships for new member
   * @param {string} memberId
   * @param {string} userId
   */
  async initializeDefaultRelations(memberId, userId) {
    // Map userId to member relationships based on family vertex
    const familyVertices = ['will', 'sj', 'wj', 'christyn'];
    
    if (!familyVertices.includes(userId)) {
      return; // Not a core family member
    }

    // Create relationships with all other core family members
    for (const vertex of familyVertices) {
      if (vertex === userId) continue;

      // Find or create member for this vertex
      // In a full implementation, would look up member by userId
    }
  }

  /**
   * Get devices for member
   * @param {string} memberId
   */
  async getDevicesForMember(memberId) {
    const devices = [];

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT * FROM devices WHERE member_id = ?`
      ).bind(memberId).all();
      return result.results || [];
    }

    // KV fallback
    const memberKey = `family:member:${memberId}`;
    const raw = await this.ctx.storage.get(memberKey);
    if (raw) {
      const member = JSON.parse(raw);
      const deviceIds = member.devices || [];
      for (const devId of deviceIds) {
        const devKey = `family:device:${devId}`;
        const devRaw = await this.ctx.storage.get(devKey);
        if (devRaw) devices.push(JSON.parse(devRaw));
      }
    }

    return devices;
  }

  /**
   * Get key packages for member
   * @param {string} memberId
   */
  async getKeyPackagesForMember(memberId) {
    const packages = [];

    if (this.env.DB) {
      const result = await this.env.DB.prepare(
        `SELECT * FROM key_packages 
         WHERE member_id = ? AND expires_at > ?
         ORDER BY created_at DESC LIMIT 5`
      ).bind(memberId, Date.now()).all();

      return result.results || [];
    }

    // KV fallback
    const prefix = `family:keypkg:${memberId}:`;
    const list = await this.ctx.storage.list({ prefix });
    const now = Date.now();

    for (const [key, value] of list) {
      const pkg = JSON.parse(value);
      if (pkg.expiresAt > now) {
        packages.push(pkg);
      }
    }

    return packages.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get group members
   * @param {string} groupId
   */
  async getGroupMembers(groupId) {
    // In full implementation, would query conversation participants
    // and resolve to family members
    return [];
  }

  /**
   * Periodic maintenance tasks
   */
  async alarm() {
    // Cleanup expired presence
    const now = Date.now();
    const prefix = 'family:presence:';
    const list = await this.ctx.storage.list({ prefix });

    for (const [key, value] of list) {
      const presence = JSON.parse(value);
      if (now - presence.lastSeen > 300000) { // 5 minutes
        presence.status = 'offline';
        await this.ctx.storage.put(key, JSON.stringify(presence));
      }
    }

    // Cleanup expired key packages
    if (this.env.DB) {
      await this.env.DB.prepare(
        `DELETE FROM key_packages WHERE expires_at < ?`
      ).bind(now).run();
    }

    // Schedule next alarm
    await this.ctx.storage.setAlarm(Date.now() + 60000); // Every minute
  }
}
