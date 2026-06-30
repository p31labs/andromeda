import { NextResponse } from "next/server";
import { WebhookEventSchema } from "@paylix/shared";

export const runtime = "nodejs";

async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return signature === expected;
}

function getDbUrl() {
  const host = process.env.POSTGRES_HOST || "postgres";
  const port = process.env.POSTGRES_PORT || 5432;
  const db = process.env.POSTGRES_DB || "paylix";
  const user = process.env.POSTGRES_USER || "paylix";
  const pass = process.env.POSTGRES_PASSWORD || "";
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}

async function updateSessionStatus(
  sessionId: string | undefined,
  status: string,
  txHash?: string
) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: getDbUrl() });
  try {
    await client.connect();
    const query = sessionId
      ? `UPDATE payment_sessions SET status = $1, tx_hash = $2, updated_at = NOW() WHERE session_id = $3`
      : `UPDATE payment_sessions SET status = $1, tx_hash = $2, updated_at = NOW() WHERE session_id = (SELECT session_id FROM payment_sessions ORDER BY created_at DESC LIMIT 1)`;
    await client.query(query, [status, txHash || null, sessionId]);
  } finally {
    await client.end();
  }
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.PAYLIX_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 501 }
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get("X-Paylix-Signature");

    if (!(await verifySignature(rawBody, signature, webhookSecret))) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const event = WebhookEventSchema.parse(JSON.parse(rawBody));

    if (!["completed", "paid"].includes(event.status)) {
      return NextResponse.json({ received: true, status: "ignored" });
    }

    const amount =
      typeof event.amount === "number"
        ? event.amount
        : parseFloat(event.amount);

    const timestamp = event.timestamp
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString();

    await updateSessionStatus(event.session_id, event.status, event.tx_hash);

    return NextResponse.json({
      received: true,
      status: event.status,
      amount,
      currency: event.currency.toUpperCase(),
      timestamp,
      session_id: event.session_id,
      tx_hash: event.tx_hash,
    });
  } catch (error) {
    console.error("Paylix webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "paylix-webhook" });
}
