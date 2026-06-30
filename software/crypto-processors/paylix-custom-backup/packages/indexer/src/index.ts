import { ethers } from "ethers";
import { Client } from "pg";

// ─── Configuration ─────────────────────────────────────────────────────────

interface ChainConfig {
  chainId: string;
  name: string;
  rpcUrl: string;
  usdcAddress: string;
  usdtAddress: string;
  confirmations: number;
}

// Testnet configurations (from .env PAYLIX_CHAINS)
const CHAINS: ChainConfig[] = [
  {
    chainId: "137",
    name: "polygon-mumbai",
    rpcUrl: process.env.POLYGON_MUMBAI_RPC || "https://rpc-mumbai.maticvigil.com",
    usdcAddress: "0xE00084204086ed7a97B0b2a55038F993Fe5b5765",
    usdtAddress: "0x9A0C56Af34B1A41F2F2d6925d12803bF3F095147",
    confirmations: 12,
  },
  {
    chainId: "80001",
    name: "arbitrum-goerli",
    rpcUrl: process.env.ARBITRUM_GOERLI_RPC || "https://goerli-rollup.arbitrum.io/rpc",
    usdcAddress: "0x750e4C4984a9e0f12978eA6742Bf1E4b0B40f633",
    usdtAddress: "0xD6a49B5dD16CD4B8E15Eb86595E1F34F1582461D",
    confirmations: 12,
  },
  {
    chainId: "84532",
    name: "base-goerli",
    rpcUrl: process.env.BASE_GOERLI_RPC || "https://goerli.base.org",
    usdcAddress: "0xE00084204086ed7a97B0b2a55038F993Fe5b5765",
    usdtAddress: "0x9A0C56Af34B1A41F2F2d6925d12803bF3F095147",
    confirmations: 12,
  },
  {
    chainId: "421614",
    name: "arbitrum-nova",
    rpcUrl: process.env.ARBITRUM_NOVA_RPC || "https://nova.arbitrum.io/rpc",
    usdcAddress: "0x750e4C4984a9e0f12978eA6742Bf1E4b0B40f633",
    usdtAddress: "0xD6a49B5dD16CD4B8E15Eb86595E1F34F1582461D",
    confirmations: 12,
  },
];

// ERC-20 Transfer event ABI
const ERC20_TRANSFER_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const WEBHOOK_URL = process.env.PAYLIX_WEBHOOK_URL || "http://paylix-web:3000/v1/webhook";
const INDEXER_INTERVAL_MS = parseInt(process.env.INDEXER_INTERVAL_MS || "15000");
const WEBHOOK_SECRET = process.env.PAYLIX_WEBHOOK_SECRET || "";
const PAYLIX_WALLET = process.env.PAYLIX_WALLET_ADDRESS || "";

// ─── Database ─────────────────────────────────────────────────────────────

function getDbUrl(): string {
  const host = process.env.POSTGRES_HOST || "postgres";
  const port = process.env.POSTGRES_PORT || 5432;
  const db = process.env.POSTGRES_DB || "paylix";
  const user = process.env.POSTGRES_USER || "paylix";
  const pass = process.env.POSTGRES_PASSWORD || "";
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}

let pgClient: Client | null = null;

function getDbClient(): Client {
  if (!pgClient) {
    pgClient = new Client({ connectionString: getDbUrl() });
  }
  return pgClient;
}

async function initDb(): Promise<void> {
  const client = getDbClient();
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_sessions (
      session_id VARCHAR(66) PRIMARY KEY,
      amount DECIMAL(20,6) NOT NULL,
      currency VARCHAR(10) NOT NULL,
      chain_id VARCHAR(20) NOT NULL,
      redirect_url TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      tx_hash VARCHAR(66),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(66),
      tx_hash VARCHAR(66) UNIQUE,
      from_address VARCHAR(42),
      to_address VARCHAR(42),
      amount DECIMAL(20,6),
      currency VARCHAR(10),
      chain_id VARCHAR(20),
      status VARCHAR(20),
      block_number BIGINT,
      timestamp TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(
    "CREATE INDEX IF NOT EXISTS idx_payment_events_tx ON payment_events(tx_hash)"
  );
  await client.query(
    "CREATE INDEX IF NOT EXISTS idx_payment_events_session ON payment_events(session_id)"
  );
  console.log("[indexer] Database initialized");
}

// ─── Webhook Dispatch ─────────────────────────────────────────────────────

async function dispatchWebhook(event: Record<string, unknown>): Promise<void> {
  if (!WEBHOOK_SECRET) {
    console.warn("[indexer] No webhook secret configured, skipping dispatch");
    return;
  }

  const payload = JSON.stringify(event);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const signature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Paylix-Signature": signature,
      },
      body: payload,
    });
    if (!res.ok) {
      console.error(`[indexer] Webhook dispatch failed: ${res.status}`);
    } else {
      console.log(`[indexer] Webhook dispatched: ${event.session_id || "unknown"}`);
    }
  } catch (error) {
    console.error("[indexer] Webhook dispatch error:", error);
  }
}

// ─── Chain Processing ─────────────────────────────────────────────────────

async function processChain(chain: ChainConfig): Promise<void> {
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const client = getDbClient();

  // Get last processed block for this chain
  const stateResult = await client.query(
    "SELECT last_block FROM chain_state WHERE chain_id = $1",
    [chain.chainId]
  );
  const lastBlock = stateResult.rows[0]?.last_block
    ? BigInt(stateResult.rows[0].last_block)
    : BigInt(await provider.getBlockNumber()) - BigInt(1000);

  const currentBlock = BigInt(await provider.getBlockNumber());
  const fromBlock = lastBlock + BigInt(1);
  const toBlock = currentBlock - BigInt(chain.confirmations);

  if (fromBlock >= toBlock) {
    return;
  }

  console.log(
    `[indexer] ${chain.name}: scanning blocks ${fromBlock} → ${toBlock}`
  );

  // Query USDC and USDT Transfer events
  const usdcContract = new ethers.Contract(chain.usdcAddress, ERC20_TRANSFER_ABI, provider);
  const usdtContract = new ethers.Contract(chain.usdtAddress, ERC20_TRANSFER_ABI, provider);

  const tokenAddresses = [chain.usdcAddress.toLowerCase(), chain.usdtAddress.toLowerCase()];

  try {
    const usdcFilter = usdcContract.filters.Transfer(null, PAYLIX_WALLET.toLowerCase());
    const usdtFilter = usdtContract.filters.Transfer(null, PAYLIX_WALLET.toLowerCase());

    const [usdcTransfers, usdtTransfers] = await Promise.all([
      provider.getLogs({
        ...usdcFilter,
        fromBlock,
        toBlock,
      }),
      provider.getLogs({
        ...usdtFilter,
        fromBlock,
        toBlock,
      }),
    ]);

    const allTransfers = [
      ...usdcTransfers.map((log) => ({ ...log, token: "USDC", address: chain.usdcAddress })),
      ...usdtTransfers.map((log) => ({ ...log, token: "USDT", address: chain.usdtAddress })),
    ];

    for (const log of allTransfers) {
      try {
        const parsed = usdcContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (!parsed) continue;

        const fromAddress = parsed.args.from;
        const toAddress = parsed.args.to;
        const amount = ethers.formatUnits(parsed.args.value, 6);

        // Check for duplicate
        const existing = await client.query(
          "SELECT id FROM payment_events WHERE tx_hash = $1",
          [log.transactionHash]
        );
        if (existing.rows.length > 0) continue;

        // Find matching session
        const sessionResult = await client.query(
          `SELECT session_id, amount FROM payment_sessions
           WHERE chain_id = $1 AND status = 'pending'
           ORDER BY created_at DESC LIMIT 1`,
          [chain.chainId]
        );

        const sessionId = sessionResult.rows[0]?.session_id;

        await client.query(
          `INSERT INTO payment_events (session_id, tx_hash, from_address, to_address, amount, currency, chain_id, status, block_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sessionId,
            log.transactionHash,
            fromAddress,
            toAddress,
            amount,
            log.token,
            chain.chainId,
            "completed",
            Number(log.blockNumber),
          ]
        );

        if (sessionId) {
          await client.query(
            "UPDATE payment_sessions SET status = 'completed', tx_hash = $1, updated_at = NOW() WHERE session_id = $2",
            [log.transactionHash, sessionId]
          );

          await dispatchWebhook({
            status: "completed",
            amount: parseFloat(amount),
            currency: log.token,
            timestamp: new Date().toISOString(),
            session_id: sessionId,
            tx_hash: log.transactionHash,
            chain_id: chain.chainId,
            from_address: fromAddress,
            to_address: toAddress,
          });
        }

        console.log(
          `[indexer] ${chain.name}: payment detected ${amount} ${log.token} tx=${log.transactionHash}`
        );
      } catch (err) {
        console.error(`[indexer] Error processing log:`, err);
      }
    }

    // Update chain state
    await client.query(
      `INSERT INTO chain_state (chain_id, last_block, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (chain_id) DO UPDATE SET last_block = $2, updated_at = NOW()`,
      [chain.chainId, Number(currentBlock)]
    );
  } catch (error) {
    console.error(`[indexer] ${chain.name} processing error:`, error);
  }
}

// ─── Main Loop ───────────────────────────────────────────────────────────

async function main() {
  console.log("[indexer] Starting Paylix blockchain indexer...");
  console.log(`[indexer] Wallet: ${PAYLIX_WALLET || "NOT SET — no payments will be detected"}`);
  console.log(`[indexer] Monitoring ${CHAINS.length} chains`);
  console.log(`[indexer] Poll interval: ${INDEXER_INTERVAL_MS}ms`);

  await initDb();

  setInterval(async () => {
    for (const chain of CHAINS) {
      try {
        await processChain(chain);
      } catch (error) {
        console.error(`[indexer] ${chain.name} error:`, error);
      }
    }
  }, INDEXER_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[indexer] Shutting down...");
    if (pgClient) await pgClient.end();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[indexer] Fatal error:", error);
  process.exit(1);
});
