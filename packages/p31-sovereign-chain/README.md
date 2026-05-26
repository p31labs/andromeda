# P31 sovereign chain — transparency anchor

On-chain **append-only commitments** for P31 public JSON manifests (`p31-contract-registry.json`, future registry fingerprints).

## SMART suite (five contracts)

| Letter | Contract | Purpose |
|--------|----------|---------|
| **S** | `P31TransparencyAnchor` | Permissionless `anchor(digest, uri)`; `getAnchor(id)`. |
| **M** | `P31ManifestRegistry` | `publish(manifestId, digest, uri)`; `head(manifestId)`. |
| **A** | `P31AccessAllowlist` | Owner `setAllowed(capability, who, bool)`; `isAllowed`. |
| **R** | `P31ContentRoot` | Owner `setRoot(key, cid)`; content-addressed hub snapshots. |
| **T** | `P31TreasuryConfig` | Owner `configure(safe, usdc, chainId)`; `lock()`. |

ABIs ship in **`contracts/p31-smart-evm.json`** and roll into **`p31-contract-registry.json`** for the hub contract builder.

## Build

```bash
cd packages/p31-sovereign-chain
forge install foundry-rs/forge-std@v1.9.4 --no-commit
forge build
forge test
```

`lib/`, `cache/`, and `out/` are gitignored; CI runs `forge install` then `forge build && forge test`.

## Deploy

1. Pick network (see root **`p31-chain-anchor.json`**).
2. `forge create src/P31TransparencyAnchor.sol:P31TransparencyAnchor --rpc-url $RPC --private-key $KEY`
3. Record `registryAddress` + `deployTxHash` in **`p31-chain-anchor.json`**, open PR.
4. After deploy, call `anchor(digest, uri)` with the **sha256** hex of the manifest bytes you publish (tooling TBD; use `sha256sum` locally and normalize to `bytes32`).

## Manifest

Root **`p31-chain-anchor.json`** (`p31.chainAnchor/0.1.0`) lists target networks and public URLs to anchor.
