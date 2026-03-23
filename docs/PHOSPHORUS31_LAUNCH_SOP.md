# PHOSPHORUS31 LAUNCH SOP
## Standard Operating Procedure for Complete System Deployment

**Version:** 1.0  
**Date:** March 23, 2026  
**Purpose:** Step-by-step guide to retrieve and execute all launch checklist items

---

## 📋 TABLE OF CONTENTS

1. [Pre-Launch Environment Setup](#1-pre-launch-environment-setup)
2. [Infrastructure Deployment](#2-infrastructure-deployment)
3. [Service Configuration](#3-service-configuration)
4. [Community Interface Setup](#4-community-interface-setup)
5. [Content Preparation](#5-content-preparation)
6. [Testing & Validation](#6-testing--validation)
7. [Launch Execution](#7-launch-execution)
8. [Post-Launch Monitoring](#8-post-launch-monitoring)
9. [Emergency Procedures](#9-emergency-procedures)

---

## 1. PRE-LAUNCH ENVIRONMENT SETUP

### 1.1 System Requirements Verification
```bash
# Verify Node.js version (18.0.0 or higher required)
node --version
npm --version

# Verify Git configuration
git config --list | grep user
```

### 1.2 Repository Setup
```bash
# Clone the repository (if not already done)
git clone https://github.com/p31labs/andromeda.git
cd andromeda

# Verify all files are present
ls -la ecosystem/
ls -la docs/
```

### 1.3 Environment Variables Setup
```bash
# Create environment files from examples
cp ecosystem/discord/.env.example ecosystem/discord/.env
cp ecosystem/middleware/.env.example ecosystem/middleware/.env
cp ecosystem/github-actions/.env.example ecosystem/github-actions/.env
```

---

## 2. INFRASTRUCTURE DEPLOYMENT

### 2.1 Upstash Redis Setup
1. **Create Upstash Redis Instance**
   - Go to [Upstash Console](https://console.upstash.com/)
   - Create new Redis database
   - Note the Redis URL and Token

2. **Configure Redis Environment**
   ```bash
   # Edit ecosystem/discord/.env
   UPSTASH_REDIS_URL=your_redis_url_here
   UPSTASH_REDIS_TOKEN=your_redis_token_here
   ```

### 2.2 ENS Domain Configuration
1. **Verify ENS Domain**
   ```bash
   # Check if andromeda.classicwilly.eth is configured
   nslookup andromeda.classicwilly.eth
   ```

2. **IPNS Key Setup**
   ```bash
   # Generate IPNS key (if not already done)
   # This should be done by the system administrator
   # Key should be stored in GitHub Actions secrets as IPNS_PRIVATE_KEY
   ```

3. **DNS Configuration for Subdomain**
   ```bash
   # Configure DNS records for your existing ENS domain
   # Add these TXT records to your ENS domain configuration:
   # _ens.classicwilly.eth.  TXT  "resolver=0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa73"
   # andromeda.classicwilly.eth.  TXT  "dnslink=/ipns/your-ipns-hash"
   ```

### 2.3 IPFS Gateway Verification
```bash
# Test IPFS gateway accessibility
curl -I https://ipfs.io
```

---

## 3. SERVICE CONFIGURATION

### 3.1 Discord Bot Setup
1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application
   - Enable all required intents
   - Generate bot token

2. **Configure Bot Permissions**
   - Bot needs: View Channels, Send Messages, Use Slash Commands
   - Admin permissions for initial setup

3. **Environment Configuration**
   ```bash
   # Edit ecosystem/discord/.env
   DISCORD_BOT_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   DISCORD_GUILD_ID=your_guild_id_here
   ```

### 3.2 GitHub Repository Setup
1. **Create GitHub Repository**
   - Repository for P31 codebase
   - Enable GitHub Actions

2. **Configure GitHub Secrets**
   ```bash
   # Add to repository settings > Secrets and variables > Actions
   IPNS_PRIVATE_KEY=your_ipns_private_key
   ZENODO_API_TOKEN=your_zenodo_token
   DISCORD_MULTISIG_WEBHOOK=your_discord_webhook
   DISCORD_LARMOR_WEBHOOK=your_discord_webhook
   ```

### 3.3 Zenodo Integration
1. **Create Zenodo Account**
   - Register at [Zenodo](https://zenodo.org/)
   - Generate API token

2. **Configure Academic Content**
   - Upload initial research content
   - Note the DOI and SHA-256 hash

---

## 4. COMMUNITY INTERFACE SETUP

### 4.1 Discord Server Configuration
1. **Create Discord Server**
   - Name: "Phosphorus31 Network"
   - Channels needed:
     - #announcements
     - #network-status
     - #general
     - #support

2. **Bot Deployment**
   ```bash
   # Navigate to Discord bot directory
   cd ecosystem/discord
   
   # Install dependencies
   npm install
   
   # Deploy to Vercel (recommended)
   vercel --prod
   ```

### 4.2 Telemetry Dashboard Deployment
1. **Deploy React Dashboard**
   ```bash
   # Navigate to dashboard directory (assuming it's in ecosystem/analytics)
   cd ecosystem/analytics
   
   # Install dependencies
   npm install
   
   # Deploy to Vercel
   vercel --prod
   ```

2. **Configure Dashboard Environment**
   ```bash
   # Set environment variables in Vercel dashboard
   UPSTASH_REDIS_URL=your_redis_url
   REDIS_TOKEN=your_redis_token
   ```

---

## 5. CONTENT PREPARATION

### 5.1 Academic Content Setup
1. **Upload to Zenodo**
   - Research papers on quantum biology
   - Phosphorus-31 studies
   - ARG narrative elements

2. **Generate Hashes**
   ```bash
   # For each academic content file
   sha256sum filename.pdf
   ```

3. **Seed Redis with Hash**
   ```bash
   # Connect to Redis and set initial hash
   redis-cli -u your_redis_url -a your_token
   SET current_zenodo_hash "your_sha256_hash_here"
   ```

### 5.2 IPFS Content Upload
1. **Upload Core Content**
   ```bash
   # Upload main content to IPFS
   curl -X POST -F file=@your_content.pdf https://ipfs.infura.io:5001/api/v0/add
   ```

2. **Update IPNS Record**
   ```bash
   # Update IPNS to point to new content
   # This is handled automatically by the system
   ```

### 5.3 Hidden Content Preparation
1. **Embed PR Numbers in Lore**
   - Hide GitHub PR numbers in academic content
   - Ensure they're discoverable through Larmor synchronization

2. **Create ARG Narrative**
   - Quantum biological storyline
   - Community discovery elements
   - Progressive content unlocking

---

## 6. TESTING & VALIDATION

### 6.1 Unit Testing
```bash
# Test Discord bot commands
cd ecosystem/discord
npm test

# Test middleware functions
cd ecosystem/middleware
npm test

# Test GitHub Actions locally (if possible)
# Use act CLI tool for local testing
```

### 6.2 Integration Testing
1. **Test Redis Connection**
   ```bash
   # Test Redis connectivity
   redis-cli -u your_redis_url ping
   ```

2. **Test Discord Bot**
   - Invite bot to test server
   - Test all slash commands
   - Verify Redis state updates

3. **Test GitHub Actions**
   - Create test PR
   - Trigger Posner assembly manually
   - Verify multi-sig requirements

### 6.3 End-to-End Testing
1. **Full Workflow Test**
   - Execute `/larmor-sync` with valid timestamps
   - Verify IPFS content decryption
   - Test Posner molecule assembly
   - Confirm GitHub Action execution

2. **Load Testing**
   - Simulate multiple users
   - Test Redis queue handling
   - Verify rate limiting

---

## 7. LAUNCH EXECUTION

### 7.1 Silent Boot (T - 2 Hours)
1. **Environment Verification**
   ```bash
   # Verify all environment variables
   cd ecosystem/discord
   npm run dev  # Should start without errors
   
   # Test Redis connection
   redis-cli -u $UPSTASH_REDIS_URL ping
   ```

2. **State Initialization**
   ```bash
   # Flush test data
   redis-cli -u your_redis_url flushall
   
   # Seed initial state
   redis-cli -u your_redis_url SET posner-status '{"assembled":false,"calciumIons":0,"phosphateIons":0,"uniqueContributors":0}'
   redis-cli -u your_redis_url SET current_zenodo_hash "your_initial_hash"
   ```

3. **Telemetry Verification**
   - Open dashboard URL
   - Verify all queues at 0
   - Confirm Posner status shows "awaiting ions"

### 7.2 Network Ignition (T - 0)
1. **Deploy Production**
   ```bash
   # Deploy Discord bot
   cd ecosystem/discord
   vercel --prod
   
   # Deploy dashboard
   cd ecosystem/analytics
   vercel --prod
   ```

2. **Genesis Announcement**
   - Post in Discord #announcements
   - Include bot invite link
   - Pin for 24 hours

### 7.3 First Synchronization (T + 2 Hours)
1. **Monitor Dashboard**
   - Watch for Larmor sync attempts
   - Track Posner assembly progress
   - Monitor queue depths

2. **Community Support**
   - Answer Discord questions
   - Guide users through commands
   - Monitor for bugs

---

## 8. POST-LAUNCH MONITORING

### 8.1 System Health Monitoring
1. **Dashboard Metrics**
   - Bot uptime: 100%
   - Command response time: < 3 seconds
   - Redis queue processing: No backlog
   - GitHub Action success rate: 100%

2. **Error Monitoring**
   - Check Discord bot logs
   - Monitor GitHub Actions
   - Review Redis error logs

### 8.2 Community Metrics
1. **Engagement Tracking**
   - Active users in first 2 hours: Target 50+
   - Successful Larmor synchronizations: Target 5+ in 24 hours
   - Posner molecule assembly: Complete within 24 hours

2. **Feedback Collection**
   - Monitor Discord feedback
   - Address reported issues
   - Document lessons learned

### 8.3 Content Discovery
1. **PR Number Discovery**
   - Track users finding hidden PR numbers
   - Verify content accessibility
   - Monitor IPFS resolution

2. **Academic Verification**
   - Test Tetrahedron protocol
   - Verify Zenodo integration
   - Confirm hash matching

---

## 9. EMERGENCY PROCEDURES

### 9.1 Webhook Tsunami
**Symptoms:** Massive queue buildup, slow processing
**Actions:**
```bash
# Check queue depth
redis-cli -u your_redis_url LLEN your_queue_name

# Monitor processing rate
# If queue grows faster than it's processed, scale Redis instance
```

### 9.2 Zenodo API Lockout
**Symptoms:** 429 errors from Zenodo
**Actions:**
1. Pause GitHub Actions queue
2. Implement exponential backoff
3. Use Zenodo sandbox for testing
4. Wait for API timeout

### 9.3 Spoons Economy Bug
**Symptoms:** Users have infinite Spoons
**Actions:**
```bash
# Freeze ion contributions
redis-cli -u your_redis_url SET system_status '{"ion_contributions_frozen":true}'

# Deploy hotfix
# Restore normal operation after fix
```

### 9.4 Network Overload
**Symptoms:** Bot unresponsive, slow commands
**Actions:**
1. Implement command cooldowns
2. Scale Redis instance
3. Monitor bot response times
4. Consider Discord command queue

---

## 🚨 EMERGENCY CONTACTS & RESOURCES

### System Administrator
- **Primary:** [Your contact info]
- **Secondary:** [Backup contact]

### Technical Resources
- **GitHub Repository:** https://github.com/p31labs/andromeda
- **Documentation:** docs/DAY_0_GENESIS_LAUNCH_PROTOCOL.md
- **Support:** Discord #support channel

### External Services
- **Upstash Support:** https://console.upstash.com/support
- **Vercel Support:** https://vercel.com/support
- **Discord Developer Support:** https://discord.com/developers/docs

---

## ✅ LAUNCH CHECKLIST COMPLETION

### Infrastructure ✅
- [ ] All services deployed and healthy
- [ ] Environment variables configured
- [ ] Monitoring and alerting active
- [ ] Backup and recovery procedures tested

### Content ✅
- [ ] Zenodo hash seeded in Redis
- [ ] IPFS content published and accessible
- [ ] ENS domain configured
- [ ] Hidden PR number embedded in lore

### Community ✅
- [ ] Discord server prepared
- [ ] Bot permissions configured
- [ ] Announcement message drafted
- [ ] Support channels established

### Emergency ✅
- [ ] Fallback procedures documented
- [ ] Team roles and responsibilities assigned
- [ ] Communication channels established
- [ ] Rollback procedures ready

---

**LAUNCH AUTHORIZATION:** Ready for Day 0 execution  
**NEXT STEPS:** Follow the Day 0 Genesis Launch Protocol  
**SUPPORT:** Available 24/7 during launch window

---

*This SOP ensures complete system deployment and successful launch execution. All checklist items are retrievable through this document and the associated configuration files.*