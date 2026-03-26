import type { D1Database, DurableObjectNamespace, PubSub } from './types';

/**
 * P31 L.O.V.E. Token Ledger
 * 
 * Distributed ledger for the LOVE (Ledger of Ontological Volume and Entropy) currency
 * using D1 for persistence and Durable Objects for atomic transactions.
 * 
 * LOVE tokens are soulbound - non-transferable, earned through care/creation/consistency
 * 
 * @version 1.0.0
 * @date March 24, 2026
 */

export interface Env {
  LOVE_D1: D1Database;
  LOVE_TRANSACTION: DurableObjectNamespace;
  LOVE_PUB_SUB: PubSub;
}

export interface User {
  id: string;
  wallet_address: string | null;
  created_at: number;
  updated_at: number;
  total_love_earned: number;
  total_spoons_spent: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'earn' | 'spend' | 'bonus';
  amount: number;
  description: string;
  metadata: Record<string, unknown>;
  created_at: number;
}

export interface Balance {
  user_id: string;
  balance: number;
  updated_at: number;
}

export interface TransactionRequest {
  userId: string;
  type: 'earn' | 'spend' | 'bonus';
  amount: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// D1 SQL Schema (for reference - run these to create tables)
/*
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  total_love_earned INTEGER DEFAULT 0,
  total_spoons_spent INTEGER DEFAULT 0
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

CREATE TABLE balances (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
*/

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Route: GET /api/love/balance/{userId}
    if (pathParts[0] === 'api' && pathParts[1] === 'love' && pathParts[2] === 'balance') {
      const userId = pathParts[3];
      if (request.method === 'GET') {
        return this.getBalance(userId, env);
      }
    }

    // Route: GET /api/love/transactions/{userId}
    if (pathParts[0] === 'api' && pathParts[1] === 'love' && pathParts[2] === 'transactions') {
      const userId = pathParts[3];
      if (request.method === 'GET') {
        return this.getTransactions(userId, env);
      }
    }

    // Route: POST /api/love/earn
    if (pathParts[0] === 'api' && pathParts[1] === 'love' && pathParts[2] === 'earn') {
      if (request.method === 'POST') {
        return this.handleTransaction(request, env, 'earn');
      }
    }

    // Route: POST /api/love/spend
    if (pathParts[0] === 'api' && pathParts[1] === 'love' && pathParts[2] === 'spend') {
      if (request.method === 'POST') {
        return this.handleTransaction(request, env, 'spend');
      }
    }

    // Route: GET /api/love/leaderboard
    if (pathParts[0] === 'api' && pathParts[1] === 'love' && pathParts[2] === 'leaderboard') {
      if (request.method === 'GET') {
        return this.getLeaderboard(env);
      }
    }

    // Route: POST /api/love/register
    if (pathParts[0] === 'api' && pathParts[1] === 'love' && pathParts[2] === 'register') {
      if (request.method === 'POST') {
        return this.registerUser(request, env);
      }
    }

    return new Response('Not found', { status: 404 });
  },

  async getBalance(userId: string, env: Env): Promise<Response> {
    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    const result = await env.LOVE_D1.prepare(`
      SELECT balance, updated_at FROM balances WHERE user_id = ?
    `).bind(userId).first<Balance>();

    if (!result) {
      return new Response(JSON.stringify({
        userId,
        balance: 0,
        updatedAt: null,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      userId,
      balance: result.balance,
      updatedAt: result.updated_at,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async getTransactions(userId: string, env: Env): Promise<Response> {
    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    const limit = 50;
    const result = await env.LOVE_D1.prepare(`
      SELECT * FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(userId, limit).all<Transaction>();

    return new Response(JSON.stringify({
      userId,
      transactions: result.results || [],
      count: result.results?.length || 0,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async handleTransaction(request: Request, env: Env, type: 'earn' | 'spend' | 'bonus'): Promise<Response> {
    const body = await request.json() as TransactionRequest;

    if (!body.userId || !body.amount || body.amount <= 0) {
      return new Response('Invalid transaction', { status: 400 });
    }

    // For spend transactions, check balance first
    if (type === 'spend') {
      const balance = await env.LOVE_D1.prepare(`
        SELECT balance FROM balances WHERE user_id = ?
      `).bind(body.userId).first<{ balance: number }>();

      if (!balance || balance.balance < body.amount) {
        return new Response(JSON.stringify({
          error: 'Insufficient balance',
          currentBalance: balance?.balance || 0,
          requestedAmount: body.amount,
        }), { status: 400 });
      }
    }

    const transactionId = crypto.randomUUID();
    const timestamp = Date.now();

    // Insert transaction
    await env.LOVE_D1.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, description, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionId,
      body.userId,
      type,
      body.amount,
      body.description || '',
      JSON.stringify(body.metadata || {}),
      timestamp
    ).run();

    // Update balance
    const balanceChange = type === 'spend' ? -body.amount : body.amount;
    await env.LOVE_D1.prepare(`
      INSERT INTO balances (user_id, balance, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        balance = balance + ?,
        updated_at = ?
    `).bind(
      body.userId,
      balanceChange,
      timestamp,
      balanceChange,
      timestamp
    ).run();

    // Update user totals
    if (type === 'earn' || type === 'bonus') {
      await env.LOVE_D1.prepare(`
        UPDATE users SET total_love_earned = total_love_earned + ? WHERE id = ?
      `).bind(body.amount, body.userId).run();
    } else if (type === 'spend') {
      await env.LOVE_D1.prepare(`
        UPDATE users SET total_spoons_spent = total_spoons_spent + ? WHERE id = ?
      `).bind(body.amount, body.userId).run();
    }

    // Get new balance
    const newBalance = await env.LOVE_D1.prepare(`
      SELECT balance FROM balances WHERE user_id = ?
    `).bind(body.userId).first<{ balance: number }>();

    // Broadcast via Pub/Sub
    try {
      await env.LOVE_PUB_SUB.publish(
        `love:${body.userId}`,
        JSON.stringify({
          type: 'balance_update',
          userId: body.userId,
          amount: body.amount,
          newBalance: newBalance?.balance || 0,
          transactionId,
        })
      );

      // Also broadcast to global channel
      await env.LOVE_PUB_SUB.publish(
        'love:global',
        JSON.stringify({
          type: 'transaction',
          userId: body.userId,
          transactionType: type,
          amount: body.amount,
          description: body.description,
        })
      );
    } catch (e) {
      // Pub/Sub may not be configured, continue without broadcasting
      console.log('Pub/Sub not configured, skipping broadcast');
    }

    return new Response(JSON.stringify({
      success: true,
      transactionId,
      userId: body.userId,
      type,
      amount: body.amount,
      newBalance: newBalance?.balance || 0,
      timestamp,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async getLeaderboard(env: Env): Promise<Response> {
    const result = await env.LOVE_D1.prepare(`
      SELECT u.id, u.total_love_earned, b.balance
      FROM users u
      LEFT JOIN balances b ON u.id = b.user_id
      ORDER BY b.balance DESC
      LIMIT 20
    `).all<{ id: string; total_love_earned: number; balance: number }>();

    return new Response(JSON.stringify({
      leaderboard: result.results || [],
      count: result.results?.length || 0,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async registerUser(request: Request, env: Env): Promise<Response> {
    const body = await request.json() as { userId: string; walletAddress?: string };

    if (!body.userId) {
      return new Response('Missing userId', { status: 400 });
    }

    const timestamp = Date.now();

    // Create user
    await env.LOVE_D1.prepare(`
      INSERT INTO users (id, wallet_address, created_at, updated_at, total_love_earned, total_spoons_spent)
      VALUES (?, ?, ?, ?, 0, 0)
      ON CONFLICT(id) DO NOTHING
    `).bind(
      body.userId,
      body.walletAddress || null,
      timestamp,
      timestamp
    ).run();

    // Initialize balance
    await env.LOVE_D1.prepare(`
      INSERT INTO balances (user_id, balance, updated_at)
      VALUES (?, 0, ?)
      ON CONFLICT(user_id) DO NOTHING
    `).bind(body.userId, timestamp).run();

    return new Response(JSON.stringify({
      success: true,
      userId: body.userId,
      walletAddress: body.walletAddress || null,
      createdAt: timestamp,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

// Durable Object for atomic transactions (future enhancement)
export class LoveTransactionDO {
  async fetch(request: Request): Promise<Response> {
    // This would handle more complex atomic transactions
    // For now, the worker handles transactions directly
    return new Response('Not implemented', { status: 501 });
  }
}
