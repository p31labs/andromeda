# EPCP Interactive Command Center - Definition

## Overview
The EPCP (Ethical People's Command Post) Interactive Command Center is a sovereign command and control interface built as a Cloudflare Worker. It provides real-time telemetry, fleet management, and emergency controls for the P31 mesh network infrastructure.

## Purpose
To provide a decentralized, secure, and interactive dashboard for monitoring and managing the P31 Labs family mesh network (K₄ topology) and associated infrastructure components.

## Key Features

### 1. Real-Time Telemetry Dashboard
- Live worker fleet status with visual indicators
- Ambient grid background (radial gradient pattern)
- Glass-panel UI components with backdrop blur
- Dark theme with P31 corporate color scheme (teal, coral, gold)

### 2. Fleet Management
- Worker topology visualization
- Online/offline/degraded status indicators
- Individual worker controls:
  - Quarantine (isolate problematic workers)
  - Restart (graceful worker restart)
- Detailed worker information panels

### 3. K₄ Mesh Controls
- Direct ping capabilities between mesh vertices (will/sj/wj/christyn)
- Broadcast messaging to all mesh nodes
- Mesh topology visualization

### 4. Social Publishing
- Multi-platform social media broadcasting (Twitter, Bluesky, Mastodon, Discord)
- Content composition interface with platform selection
- Wave-based scheduling (weekly_update, midweek, weekend_recap)
- Document forge for generating .docx files from templates

### 5. GitOps & Deployment
- Git status monitoring
- Deployment request system
- Worker-specific deployment targeting

### 6. Audit & Compliance
- Legal hold indicators
- Audit export functionality (JSON format)
- Date-range filtering for audit exports
- Case information display (Johnson v. Johnson, 2025CV936)

### 7. Emergency Controls (Admin Only)
- Quarantine all non-critical workers
- Rollback to last known good configuration
- Maintenance mode toggle with custom messaging
- Role-based access control enforcement

## Technical Implementation

### Architecture
- **Platform**: Cloudflare Workers
- **Language**: Vanilla JavaScript (ES6)
- **Framework**: None (pure DOM manipulation)
- **Styling**: CSS3 with CSS Variables
- **Data Binding**: Manual DOM updates
- **Event Handling**: Event delegation pattern

### Key Files
- `src/index.js` - Main worker entry point with API routes
- `src/epcp-dashboard.js` - Dashboard HTML generation and client-side logic
- `src/cloud-hub-html.js` - Cloudflare dashboard integration
- `src/migrations.js` - D1 database schema migrations
- `src/cf.js` - Cloudflare API helpers

### Data Sources
- **KV Namespace**: STATUS_KV (worker status storage)
- **D1 Database**: EPCP_DB (audit and event logging)
- **R2 Buckets**: 
  - FORENSICS_HOT/COLD (forensic data storage)
  - ARTIFACTS (generated files)
  - AUDIT_EXPORTS (exported audit reports)
- **External APIs**: 
  - K₄ Cage mesh network
  - P31 Forge document generation
  - Social media platforms (via Forge worker)

### Security Features
- Role-Based Access Control (RBAC)
- Cloudflare Access JWT authentication
- Legacy token fallback authentication
- Content Security Policy (CSP)
- Input validation and sanitization
- API endpoint protection

## API Endpoints

### Public Endpoints
- `GET /api/health` - Worker health check
- `GET /api/status` - Current system status
- `GET /api/admin/mesh/topology` - Mesh network topology
- `GET /api/social/health` - Social broadcast service health

### Protected Endpoints (Require Authentication)
- `POST /api/status` - Update system status (operator+)
- `POST /api/admin/git/status` - Git status (reader+)
- `POST /api/admin/git/deploy` - Request deployment (operator+)
- `POST /api/admin/deploy/callback` - Deployment webhook
- `POST /api/admin/mesh/ping` - Send mesh ping (reader+)
- `POST /api/admin/mesh/presence` - Update mesh presence (reader+)
- `POST /api/admin/mesh/broadcast` - Broadcast message (operator+)
- `POST /api/admin/social/publish` - Publish to social media (operator+)
- `POST /api/admin/social/wave` - Trigger social wave (operator+)
- `POST /api/admin/audit/export` - Export audit data (legal+)
- `POST /api/admin/emergency/*` - Emergency actions (admin+)

## Deployment Information

### Build & Deploy
```bash
# Deploy to production
npx wrangler deploy

# Or using deploy script
./deploy.sh
```

### Configuration
- **Account ID**: ee05f70c889cb6f876b9925257e3a2fa
- **Team Domain**: trimtab-signal
- **Environment**: production
- **Compatibility Date**: 2026-04-13
- **Experimental Autoconfig**: disabled

### Resource Bindings
- **KV Namespaces**: STATUS_KV
- **D1 Databases**: EPCP_DB (epcp-audit)
- **R2 Buckets**: FORENSICS_HOT, FORENSICS_COLD, ARTIFACTS, AUDIT_EXPORTS
- **Cron Triggers**: */5 * * * * (every 5 minutes)

## Visual Design System

### Color Palette
- `--void`: #050508 (background)
- `--surface`: #12141b (panel background)
- `--text`: #d8d6d0 (primary text)
- `--coral`: #E8636F (accent/warning)
- `--teal`: #4db8a8 (accent/success)
- `--gold`: #cda852 (accent/premium)
- `--glass`: rgba(12,14,20,0.65) (panel background)
- `--border`: rgba(255,255,255,0.08) (borders)

### Typography
- **Primary**: Inter (system UI)
- **Monospace**: JetBrains Mono (code/data)

### Components
- Glass panels with backdrop blur
- Ambient radial grid background
- Status indicator dots
- Action buttons with hover states
- Modal dialogs with backdrop
- Toast notifications
- Alert banners
- Tabbed interfaces
- Grid layouts (responsive)

## Usage Instructions

### Accessing the Dashboard
1. Navigate to: https://command-center.trimtab-signal.workers.dev
2. Authenticate via Cloudflare Access or legacy token
3. View real-time telemetry in the dashboard
4. Use interactive controls based on your role

### Role-Based Access
- **none**: No access
- **reader**: View-only access to status and mesh operations
- **operator**: Reader + social publishing, deployment requests, GitOps
- **legal**: Operator + audit export capabilities
- **admin**: All capabilities including emergency controls

### Common Operations
1. **Check Fleet Status**: View worker cards in Node Topology section
2. **Quarantine Worker**: Click [QUARANTINE] button on worker row
3. **Broadcast Message**: Click [BROADCAST] in Mesh Control section
4. **Publish Social Post**: Click [COMPOSE POST] in Social Broadcast section
5. **Request Deploy**: Click [DEPLOY] in Quick Actions section
6. **Export Audit**: Click [EXPORT AUDIT] in Quick Actions section (legal+)
7. **Emergency Actions**: Use controls in Emergency Controls section (admin+)

## Development Notes

### Design Principles
- **Isostatic Rigidity**: Fallback to local caching when constraints fail
- **Zero-Budget**: Uses only free Cloudflare Worker tier resources
- **Edge-Native**: Designed for Cloudflare Workers execution environment
- **Visual Parity**: Matches p31ca.org Sovereign Cockpit aesthetics

### Error Handling
- Graceful degradation when APIs are unavailable
- User-friendly error messages in dashboard
- Console logging for debugging
- Toast notifications for user feedback

### Performance Considerations
- Minimal DOM updates (only changed sections)
- Efficient event delegation
- Optimized CSS with minimal repaints
- Efficient data structures and algorithms

## Future Enhancements
1. WebSocket relay for real-time mesh broadcasting
2. Enhanced visualization with D3.js or Canvas
3. Additional social media platform integrations
4. Advanced analytics and reporting
5. Mobile-responsive improvements
6. Dark/Light theme toggle
7. Keyboard shortcuts for power users
8. Export capabilities (PDF, CSV formats)

## Maintenance
- Health checks every 5 minutes via cron trigger
- Automatic worker status updates
- Database migrations handled automatically
- Secret rotation through Cloudflare dashboard
- Dependency updates via npm

---
*Defined: 2026-04-23T18:56:33-04:00*
*Status: DEPLOYED AND OPERATIONAL*
*Version: Current deployment ID visible in Cloudflare dashboard*