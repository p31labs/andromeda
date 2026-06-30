# P31 Labs Crypto Processors

Enterprise-grade, self-hosted cryptocurrency payment processors for P31 Labs donation system.

## 🚀 Quick Start (Safe Testing Mode)

This configuration is **pre-set for testnets** so you can test safely without risking real funds:

### 1. Clone and setup
```bash
mkdir -p ~/p31-crypto && cd ~/p31-crypto
cp -r /home/p31/andromeda/software/crypto-processors/* .
chmod +x deploy-crypto.sh crypto-ops.sh
```

### 2. Initialize configuration (creates .env with testnet defaults)
```bash
./deploy-crypto.sh init
```

### 3. Start services
```bash
./deploy-crypto.sh start
```

### 4. Complete setup via web interfaces
- **BTCPay Server**: Visit `http://localhost:8080`
  - Complete setup wizard
  - Create a store (e.g., "P31 Labs Donations Testnet")
  - Get Store ID from Store Settings → General → Store ID
  - Generate API key (Server → API Keys → Create new key with "Server Daemon" permission)
  - Set webhook URL to: `https://donate-api.phosphorus31.org/satsale/webhook`
  - Update `.env` with `BTCPAY_STORE_ID` and `BTCPAY_API_KEY`, then restart: `./deploy-crypto.sh restart`
  
- **Paylix**: Visit `http://localhost:3000`
  - Wallet is auto-generated from your mnemonic
  - Fund with testnet USDC/USDT from faucets (see below)
  - No additional configuration needed

### 5. Test the integration
```bash
# Run comprehensive tests
./crypto-ops.sh test

# Or check status:
./crypto-ops.sh status

# View logs:
./crypto-ops.sh logs -f
```

### 6. Get testnet funds
- **Bitcoin Testnet**: https://testnet-faucet.mempool.co/
- **Polygon Mumbai USDC/USDT**: https://faucet.polygon.technology/ (get MATIC, then swap on testnet DEX)
- Other testnet faucets available for configured chains

## 🏗️ Architecture

```
Frontend (phosphorus31.org/donate)
         ↓ (HTTP API)
donate-api (Cloudflare Worker)
         ↓ (HTTP API)
┌─────────────────┐    ┌─────────────────────────────────┐
│  BTCPay Server  │    │        Paylix Stack             │
│ (Bitcoin/LN)    │    │  ┌─────────────┐               │
│                 │    │  │  Web API    │◄─┐             │
└─────────────────┘    │  │ (port 3000) │  │             │
                       │  └─────────────┘  │             │
                       │  │  Indexer    │  │             │
                       │  │ (listens to │  │             │
                       │  │  blockchain)│  │             │
                       │  └─────────────┘  │             │
                       │         ▲         │             │
                       │         │         │             │
                       └─────────┴─────────┴─────────────┘
                                    ↓
                           PostgreSQL (shared)
```

## 🔧 Components

### 1. BTCPay Server (Bitcoin/Lightning Network)
- **Enterprise standard**: Used by BTC Inc, Fortune 500 companies, and nonprofits at scale
- **Current config**: Testnet mode (safe for testing)
- **Features**: 
  - Testnet Bitcoin & Lightning Network
  - Invoice and subscription support
  - Webhooks and APIs
  - UI for store management
- **Image**: `btcpayserver/btcpayserver:1.14.0`
- **Docs**: https://docs.btcpayserver.org

### 2. Paylix Stack (EVM Chains)
- **Complete system**: Web API + Indexer + Database
- **Current config**: Testnet chains (Polygon Mumbai, Arbitrum Goerli, etc.)
- **Features**:
  - USDC/USDT on 7 EVM testnets
  - No private keys stored on server
  - Webhook confirmations
  - Simple REST API (`/paylix/session`, `/paylix/webhook`)
- **Components**:
  - **Web API** (port 3000): HTTP interface for `/paylix/session`, `/paylix/webhook`
  - **Indexer**: Listens to blockchain events and processes payments
  - **PostgreSQL**: Shared database
- **Source**: https://github.com/JanoTheDev/paylix
- **Docs**: https://github.com/JanoTheDev/paylix

### 3. Infrastructure
- **Caddy**: Automatic HTTPS (for production domains)
- **PostgreSQL**: Production-ready database
- **Docker Compose**: Orchestration with health checks

## 📝 Configuration

### Environment Variables (`.env`)

#### BTCPay Server (Testnet by Default)
```
# Domain (for Caddy reverse proxy)
SATSALE_DOMAIN=satsale.p31ca.org

# BTCPay Configuration (Testnet)
BTCPAY_NETWORK=testnet
BTCPAY_BIND=0.0.0.0
BTCPAY_PORT=8080
BTCPAY_API_PORT=8081
BTCPAY_API_KEY=your_api_key_from_ui

# Store Configuration (REQUIRED AFTER SETUP)
BTCPAY_STORE_ID=your_store_id_from_ui
BTCPAY_SERVER_URL=http://btcpay:8080

# Webhook
SATSALE_WEBHOOK_SECRET=your_64_char_hex_secret
```

#### Paylix (Testnet by Default)
```
# Domain
PAYLIX_DOMAIN=paylix.p31ca.org

# Wallet (REQUIRED)
PAYLIX_MNEMONIC="your twelve or twenty four word mnemonic"
# OR
PAYLIX_PRIVATE_KEY=your_64_char_hex_private_key

# Testnet Channels (Pre-configured for testing)
PAYLIX_CHAINS=137,80001,80002,421614,420,84532,4002
# 137=Polygon Mumbai, 80001=Arbitrum Goerli, 80002=Optimism Goerli, etc.

# Currencies
PAYLIX_CURRENCIES=USDC,USDT

# Webhook
PAYLIX_WEBHOOK_SECRET=your_64_char_hex_secret
```

#### Shared
```
# Postgres
POSTGRES_DB=paylix
POSTGRES_USER=paylix
POSTGRES_PASSWORD=your_secure_password

# donate-api (Cloudflare Worker)
DONATE_API_URL=https://donate-api.phosphorus31.org
```

## 🚀 Deployment Options

### For Testing (Recommended First)
```bash
# 1. Initialize with testnet defaults
./deploy-crypto.sh init

# 2. Start services
./deploy-crypto.sh start

# 3. Complete BTCPay setup via http://localhost:8080
# 4. Fund Paylix wallet with testnet tokens from faucets
# 5. Run tests
./crypto-ops.sh test
```

### For Production
```bash
# 1. Initialize
./deploy-crypto.sh init

# 2. Edit .env:
#    - Change BTCPAY_NETWORK=mainnet
#    - Update domains to your real domains
#    - Add real wallet credentials
#    - Set up real DNS pointing to your server

# 3. Start
./deploy-crypto.sh start

# 4. Complete BTCPay setup via your domain
# 5. Fund wallets with real assets
# 6. Set Cloudflare worker secrets
```

## 💰 Getting Testnet Funds

### Bitcoin Testnet (for BTCPay)
- Use a testnet faucet: https://testnet-faucet.mempool.co/
- Or use Electrum testnet wallet

### Polygon Mumbai (for Paylix USDC/USDT)
- Faucet: https://faucet.polygon.technology/
- Add Mumbai network to MetaMask:
  - RPC: https://rpc-mumbai.maticvigil.com
  - Chain ID: 137
  - Symbol: MATIC
  - Explorer: https://mumbai.polygonscan.com/

### Other Testnets
Similar faucets exist for all configured testnet chains.

## 🔄 How to Change Wallet Addresses Later

All sensitive data is in **`.env`** — **no code changes needed**:

| Change Needed | Edit in `.env` | Restart Command |
| :--- | :--- | :--- |
| Bitcoin settings | `BTCPAY_*` variables | `./deploy-crypto.sh restart btcpay` |
| EVM mnemonic | `PAYLIX_MNEMONIC` | `./deploy-crypto.sh restart paylix-web` |
| Webhook secrets | `*_WEBHOOK_SECRET` | Update worker secret via `wrangler` + restart |
| Domain names | `*_DOMAIN` | Update `Caddyfile` + restart Caddy |
| Add testnets | `PAYLIX_CHAINS` | `./deploy-crypto.sh restart paylix-indexer paylix-web` |

## 📊 Monitoring & Maintenance

```bash
# View logs
./deploy-crypto.sh logs -f          # All services
./deploy-crypto.sh logs btcpay      # BTCPay only
./deploy-crypto.sh logs paylix-web  # Paylix web only
./deploy-crypto.sh logs paylix-indexer # Paylix indexer only

# Backup
./deploy-crypto.sh backup           # Saves .env, Caddyfile, and volumes

# Update
./deploy-crypto.sh update           # Pull latest images and restart

# Monitor health
./crypto-ops.sh monitor 5           # Monitor for 5 minutes
```

## 🧪 Testing Your Setup

```bash
# Run comprehensive tests (checks health, API endpoints, webhooks)
./crypto-ops.sh test

# Or deploy and test in one command
./deploy-crypto.sh deploy-and-test

# Manual API tests:
# BTCPay invoice (testnet)
curl -X POST http://localhost:8080/satSale/invoice \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "currency": "BTC"}'  

# Paylix session (Polygon Mumbai USDC)
curl -X POST http://localhost:3000/paylix/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PAYLIX_API_KEY" \
  -d '{"amount": 100, "currency": "usdc", "chain_id": 137}'

# Check events
curl http://localhost:8080/events
```

## ⚙️ Integrating with donate-api Worker

Your existing Cloudflare worker already has all necessary handlers:

- `POST /satSale/invoice` → Proxies to BTCPay Server
- `POST /satsale/webhook` → Receives BTCPay webhooks
- `POST /paylix/session` → Proxies to Paylix web API  
- `POST /paylix/webhook` → Receives Paylix webhooks
- `GET /events` → Shows all donations (PayPal, BTCPay, Paylix)
- `GET /health` → Service health check

**To connect:**
1. Set these secrets in your donate-api worker:
   ```bash
   npx wrangler secret put SATSALE_URL
   # Enter: http://satsale.p31ca.org:8080 (or your domain)
   
   npx wrangler secret put PAYLIX_URL
   # Enter: http://paylix.p31ca.org:3000 (note: port 3000 for Paylix web)
   
   npx wrangler secret put PAYLIX_API_KEY
   # Enter: (from Paylix dashboard - not always required for basic API)
   
   npx wrangler secret put SATSALE_WEBHOOK_SECRET
   # Enter: (from .env)
   
   npx wrangler secret put PAYLIX_WEBHOOK_SECRET
   # Enter: (from .env)
   ```

2. Update your worker if needed to use port 3000 for Paylix (instead of 8080)
   - The worker already has `PAYLIX_URL?` env var - just set it correctly

## 📋 Security Notes

### For Testing (Current Defaults):
- Using testnets = **no real financial risk**
- Still protect your mnemonic (testnet funds have value on testnet)
- `.env` contains secrets - **never commit to git**

### For Production:
1. **Switch to mainnet**:
   - `BTCPAY_NETWORK=mainnet`
   - Update `PAYLIX_CHAINS` to mainnet values (1,137,56,42161,10,8453,250)
2. **Use real domains** with DNS pointing to your server
3. **Enable HTTPS** (Caddy does this automatically for domains)
4. **Use strong, unique secrets**
5. **Consider additional hardening**:
   - Run containers as non-root user
   - Use Docker secrets or HashiCorp Vault for production
   - Add firewall rules (only expose ports 80,443)
   - Set up regular backups

## 📚 Resources

- BTCPay Server: https://btcpayserver.org
- Paylix: https://github.com/JanoTheDev/paylix
- Testnet Faucets:
  - Bitcoin: https://testnet-faucet.mempool.co/
  - Polygon: https://faucet.polygon.technology/
  - Arbitrum: https://faucet.arbitrum.io/
  - Optimism: https://optimism.io/faucet
  - Base: https://base.org/bridge
  - Fantom: https://faucet.fantom.network/
- Cloudflare Worker Docs: https://developers.cloudflare.com/workers/

---
*Safe testing configuration active by default. Switch to mainnet for production use.*
*Last updated: $(date)*