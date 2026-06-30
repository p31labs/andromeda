import { NextResponse } from "next/server";
import { SessionCreateSchema } from "@paylix/shared";

export const runtime = "nodejs";

function getDbUrl() {
  const host = process.env.POSTGRES_HOST || "postgres";
  const port = process.env.POSTGRES_PORT || 5432;
  const db = process.env.POSTGRES_DB || "paylix";
  const user = process.env.POSTGRES_USER || "paylix";
  const pass = process.env.POSTGRES_PASSWORD || "";
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}

async function storeSession(session: Record<string, unknown>) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: getDbUrl() });
  try {
    await client.connect();
    await client.query(
      `INSERT INTO payment_sessions (session_id, amount, currency, chain_id, redirect_url, status, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (session_id) DO UPDATE SET amount = EXCLUDED.amount`,
      [
        session.session_id,
        session.amount,
        session.currency,
        session.chain_id,
        session.redirect_url,
        "pending",
        JSON.stringify(session.metadata || {}),
      ]
    );
  } finally {
    await client.end();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SessionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const chainId =
      typeof input.chain_id === "number" ? String(input.chain_id) : input.chain_id;
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, "")}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const session = {
      session_id: sessionId,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      chain_id: chainId,
      redirect_url: input.redirect_url || "https://phosphorus31.org/donate?success=1",
      expires_at: expiresAt,
      metadata: input.metadata || { source: "donate-api", nonprofit: "P31 Labs" },
    };

    await storeSession(session);

    return NextResponse.json({
      session_id: session.session_id,
      redirect_url: `https://paylix.p31ca.org/checkout/${sessionId}`,
      amount: session.amount,
      currency: session.currency,
      chain_id: session.chain_id,
      expires_at: session.expires_at,
    });
  } catch (error) {
    console.error("Paylix session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
