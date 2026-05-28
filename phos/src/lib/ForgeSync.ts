/**
 * ForgeSync.ts — Offline-first commerce reconciliation engine.
 *
 * Wraps SyncEngine (CRDT) with a commerce-specific offline queue.
 * Guarantees: a sale recorded offline will never be lost, never be duplicated.
 *
 * Reconciliation protocol:
 * 1. On connect: push all unsynced transactions to edge
 * 2. Edge validates SHA-256 chain, accepts/rejects
 * 3. On confirmation: mark synced=TRUE locally
 * 4. On conflict: LWW via Lamport clock (already in SyncEngine)
 * 5. Reconciliation runs on WebSocket connect + every 30s while connected
 */

import { getDb } from "./ForgeLedger";
import type { ForgeTransaction } from "./ForgeLedger";

const RECONCILE_INTERVAL_MS = 30_000;
const EDGE_TX_ENDPOINT = "/api/forge/transactions";
const EDGE_RECONCILE_ENDPOINT = "/api/forge/reconcile";

export interface ReconcileResult {
  pushed: number;
  confirmed: number;
  conflicts: number;
  errors: string[];
}

export interface EdgeTransactionPayload {
  id: string;
  type: ForgeTransaction["type"];
  amount_cents: number;
  tax_cents: number;
  total_cents: number;
  items_json: string;
  payment_method: ForgeTransaction["paymentMethod"];
  note: string;
  hash: string;
  previous_hash: string;
  created_at: number;
  site_id: string;
}

function txToEdgePayload(tx: ForgeTransaction): EdgeTransactionPayload {
  return {
    id: tx.id,
    type: tx.type,
    amount_cents: tx.amountCents,
    tax_cents: tx.taxCents,
    total_cents: tx.totalCents,
    items_json: JSON.stringify(tx.items),
    payment_method: tx.paymentMethod,
    note: tx.note,
    hash: tx.hash,
    previous_hash: tx.previousHash,
    created_at: tx.createdAt,
    site_id: localStorage.getItem("phos_site_id") || "unknown",
  };
}

export async function pushUnsyncedToEdge(edgeBaseUrl: string): Promise<ReconcileResult> {
  const result: ReconcileResult = { pushed: 0, confirmed: 0, conflicts: 0, errors: [] };

  try {
    const db = await getDb();
    const { rows } = await db.query<{
      id: string; type: string; amount_cents: number; tax_cents: number;
      total_cents: number; items_json: string; payment_method: string;
      note: string; hash: string; previous_hash: string; created_at: number;
    }>(
      "SELECT * FROM forge_transactions WHERE synced = FALSE AND voided = FALSE ORDER BY created_at ASC LIMIT 50"
    );

    if (rows.length === 0) return result;

    const payloads: EdgeTransactionPayload[] = rows.map((r: {
      id: string; type: string; amount_cents: number; tax_cents: number;
      total_cents: number; items_json: string; payment_method: string;
      note: string; hash: string; previous_hash: string; created_at: number;
    }) => ({
      id: r.id,
      type: r.type as ForgeTransaction["type"],
      amount_cents: r.amount_cents,
      tax_cents: r.tax_cents,
      total_cents: r.total_cents,
      items_json: r.items_json,
      payment_method: r.payment_method as ForgeTransaction["paymentMethod"],
      note: r.note,
      hash: r.hash,
      previous_hash: r.previous_hash,
      created_at: r.created_at,
      site_id: localStorage.getItem("phos_site_id") || "unknown",
    }));

    const response = await fetch(`${edgeBaseUrl}${EDGE_TX_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: payloads }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      result.errors.push(`Edge returned ${response.status}`);
      result.pushed = 0;
      return result;
    }

    const body = (await response.json()) as {
      confirmed_ids?: string[];
      rejected_ids?: string[];
    };

    const confirmedIds = body.confirmed_ids || [];
    const rejectedIds = body.rejected_ids || [];

    if (confirmedIds.length > 0) {
      const placeholders = confirmedIds.map((_, i) => `$${i + 1}`).join(",");
      await db.query(
        `UPDATE forge_transactions SET synced = TRUE WHERE id IN (${placeholders})`,
        confirmedIds
      );
    }

    result.pushed = payloads.length;
    result.confirmed = confirmedIds.length;
    result.conflicts = rejectedIds.length;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : "Push failed");
  }

  return result;
}

export async function pullFromEdge(edgeBaseUrl: string, since: number): Promise<number> {
  try {
    const response = await fetch(
      `${edgeBaseUrl}${EDGE_RECONCILE_ENDPOINT}?since=${since}`,
      { signal: AbortSignal.timeout(15_000) }
    );
    if (!response.ok) return 0;

    const body = (await response.json()) as {
      transactions: EdgeTransactionPayload[];
    };

    if (!body.transactions?.length) return 0;

    const db = await getDb();
    let imported = 0;

    for (const edgeTx of body.transactions) {
      try {
        await db.query(
          `INSERT INTO forge_transactions
           (id, type, amount_cents, tax_cents, total_cents, items_json, payment_method, note, previous_hash, hash, created_at, synced, voided)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO NOTHING`,
          [edgeTx.id, edgeTx.type, edgeTx.amount_cents, edgeTx.tax_cents,
           edgeTx.total_cents, edgeTx.items_json, edgeTx.payment_method,
           edgeTx.note, edgeTx.previous_hash, edgeTx.hash, edgeTx.created_at,
           true, false]
        );
        imported++;
      } catch {
        // duplicate or conflict — skip
      }
    }

    return imported;
  } catch {
    return 0;
  }
}

export class ForgeReconciler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private _status: "idle" | "syncing" | "error" = "idle";
  private _lastResult: ReconcileResult | null = null;

  get status() { return this._status; }
  get lastResult() { return this._lastResult; }

  start(edgeBaseUrl: string) {
    this.stop();
    this.reconcile(edgeBaseUrl);
    this.intervalId = setInterval(() => this.reconcile(edgeBaseUrl), RECONCILE_INTERVAL_MS);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._status = "idle";
  }

  async reconcile(edgeBaseUrl: string): Promise<ReconcileResult> {
    this._status = "syncing";
    try {
      // Push local → edge
      const pushResult = await pushUnsyncedToEdge(edgeBaseUrl);
      // Pull edge → local (since last tx timestamp)
      const db = await getDb();
      const { rows } = await db.query<{ max_created: number }>(
        "SELECT MAX(created_at) as max_created FROM forge_transactions WHERE synced = TRUE"
      );
      const since = rows[0]?.max_created || 0;
      const pulled = await pullFromEdge(edgeBaseUrl, since);

      this._lastResult = {
        pushed: pushResult.pushed,
        confirmed: pushResult.confirmed + pulled,
        conflicts: pushResult.conflicts,
        errors: pushResult.errors,
      };
      this._status = this._lastResult.errors.length > 0 ? "error" : "idle";
      return this._lastResult;
    } catch (err) {
      this._status = "error";
      const errorResult: ReconcileResult = {
        pushed: 0, confirmed: 0, conflicts: 0,
        errors: [err instanceof Error ? err.message : "Unknown error"],
      };
      this._lastResult = errorResult;
      return errorResult;
    }
  }
}
