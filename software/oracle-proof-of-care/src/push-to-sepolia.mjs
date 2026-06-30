/**
 * push-to-sepolia.mjs
 * Reads the latest oracle snapshot and pushes LOVE earnings to Sepolia.
 *
 * Prerequisites:
 *   npm install viem
 *   export SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_KEY"
 *   export ORACLE_PRIVATE_KEY="0x..."
 *   export GOD_CONSTITUTION_ADDRESS="0x..."
 *
 * Usage: node src/push-to-sepolia.mjs
 */

import { createWalletClient, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const ORACLE_API = process.env.ORACLE_API || 'https://oracle-proof-of-care.trimtab-signal.workers.dev';

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.ORACLE_PRIVATE_KEY;
  const contractAddress = process.env.GOD_CONSTITUTION_ADDRESS;

  if (!rpcUrl) throw new Error('Missing SEPOLIA_RPC_URL');
  if (!privateKey) throw new Error('Missing ORACLE_PRIVATE_KEY');
  if (!contractAddress) throw new Error('Missing GOD_CONSTITUTION_ADDRESS');

  // Fetch latest snapshot from oracle worker
  const res = await fetch(`${ORACLE_API}/oracle/latest`);
  if (!res.ok) throw new Error(`Oracle API returned ${res.status}: ${await res.text()}`);
  const snapshot = await res.json();

  console.log(`Oracle snapshot ${snapshot.snapshotId}`);
  console.log(`  Identities: ${snapshot.totalIdentities}`);
  console.log(`  Avg composite: ${snapshot.averageComposite.toFixed(4)}`);
  console.log(`  Avg confidence: ${snapshot.averageConfidence.toFixed(4)}`);

  if (snapshot.totalIdentities === 0) {
    console.log('No identities to push. Exiting.');
    return;
  }

  // Each identity's LOVE = composite * 100 (scaled to avoid decimals)
  const totalLoveWei = BigInt(Math.floor(snapshot.totalComposite * 100));

  if (totalLoveWei === 0n) {
    console.log('Total LOVE is 0. Nothing to push.');
    return;
  }

  const account = privateKeyToAccount(privateKey);
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  console.log(`\nPushing ${totalLoveWei.toString()} LOVE (wei) to contract ${contractAddress}`);
  console.log(`  From: ${account.address}`);

  // earnLove() — no params, it reads msg.sender's balance from care_state
  // In production, the contract would be called with the composite score
  // For now, we push the total across all identities
  for (const entry of snapshot.entries) {
    const loveAmount = BigInt(Math.floor(entry.composite * 100));
    if (loveAmount === 0n) continue;

    const txHash = await client.writeContract({
      address: contractAddress,
      abi: [{
        name: 'earnLove',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_amount', type: 'uint256' }],
        outputs: [],
      }],
      functionName: 'earnLove',
      args: [loveAmount],
    });

    console.log(`  TX: ${txHash} — earned ${loveAmount.toString()} LOVE for ${entry.publicKeyHex.slice(0, 12)}...`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
