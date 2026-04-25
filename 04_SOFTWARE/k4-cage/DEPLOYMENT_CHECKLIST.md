# K⁴ Cage Deployment Checklist

## Pre-Deployment

### ✅ Database Setup
- [ ] Create D1 database: `npx wrangler d1 create p31-telemetry`
- [ ] Note database ID from output
- [ ] Update `wrangler.toml` with database ID
- [ ] Apply schema: `npx wrangler d1 execute p31-telemetry --remote --file=schema.sql`
- [ ] Verify schema applied: `npx wrangler d1 execute p31-telemetry --remote --command="SELECT name FROM sqlite_master WHERE type='table'"`

### ✅ Configuration
- [ ] Update `wrangler.toml` with correct database ID
- [ ] Verify Durable Object bindings:
  - K4_TOPOLOGY
  - FAMILY_MESH_ROOM
  - FAMILY_MESSAGING
- [ ] Verify KV namespace binding: K4_MESH
- [ ] Set environment variables:
  - WORKER_VERSION
  - TOPOLOGY
  - ENVIRONMENT
  - MESH_ROOM_IDS

### ✅ Secrets
- [ ] Set ADMIN_TOKEN: `npx wrangler secret put ADMIN_TOKEN`
- [ ] Set INTERNAL_FANOUT_TOKEN: `npx wrangler secret put INTERNAL_FANOUT_TOKEN`
- [ ] Set STATUS_TOKEN: `npx wrangler secret put STATUS_TOKEN`
- [ ] Verify secrets are set: `npx wrangler secret list`

## Deployment

### ✅ Initial Deploy
- [ ] Run: `npx wrangler deploy`
- [ ] Verify no errors in output
- [ ] Note worker URL from output
- [ ] Check deployment in Cloudflare dashboard

### ✅ Post-Deploy Verification

#### Health Check
```bash
curl https://k4-cage.trimtab-signal.workers.dev/health
```
Expected: `{"worker":true,"ts":"..."}`

#### Deep Health Check
```bash
curl https://k4-cage.trimtab-signal.workers.dev/api/health?deep=true
```
Expected: `{"worker":true,"d1":true,"ts":"..."}`

#### Test Messaging
```bash
# Create conversation
curl -X POST https://k4-cage.trimtab-signal.workers.dev/conversations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "direct",
    "participants": ["will", "sj"],
    "name": "Test Conversation"
  }'

# Send message
curl -X POST https://k4-cage.trimtab-signal.workers.dev/messages \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "<conversation-id>",
    "senderId": "will",
    "content": "Test message from K⁴!"
  }'

# Get messages
curl https://k4-cage.trimtab-signal.workers.dev/messages/<conversation-id>?limit=10
```

#### Test WebSocket
```javascript
// In browser console
const ws = new WebSocket('wss://k4-cage.trimtab-signal.workers.dev/ws/family-mesh?userId=will');

ws.onopen = () => {
  console.log('Connected!');
  ws.send(JSON.stringify({
    type: 'message:send',
    conversationId: '<conversation-id>',
    content: 'WebSocket test'
  }));
};

ws.onmessage = (event) => {
  console.log('Received:', JSON.parse(event.data));
};
```

## Integration Tests

### ✅ K4 Cage Integration
- [ ] Test K4Topology DO: `curl https://k4-cage.trimtab-signal.workers.dev/api/mesh`
- [ ] Test FamilyMeshRoom: WebSocket connection to `/ws/family-mesh`
- [ ] Test FamilyMessagingDO: Send and receive messages

### ✅ K4 Hubs Integration
- [ ] Test message routing through hubs
- [ ] Verify hub-to-cage communication
- [ ] Test presence updates

### ✅ K4 Personal Integration
- [ ] Test personal agent messaging
- [ ] Verify energy/spoon tracking
- [ ] Test bio data ingestion

### ✅ Command Center Integration
- [ ] Verify dashboard displays messages
- [ ] Test real-time updates
- [ ] Check notification system

## Monitoring Setup

### ✅ Analytics
- [ ] Enable Cloudflare Analytics
- [ ] Set up custom metrics
- [ ] Configure alerts for:
  - Error rate > 1%
  - Latency > 500ms
  - Failed deliveries > 0.1%
  - WebSocket disconnects > 10/min

### ✅ Logging
- [ ] Enable worker logs: `npx wrangler tail k4-cage`
- [ ] Set up log aggregation
- [ ] Configure log retention
- [ ] Create alert rules

### ✅ Performance Monitoring
- [ ] Track message throughput
- [ ] Monitor database query times
- [ ] Watch WebSocket connection count
- [ ] Measure end-to-end latency

## Security Verification

### ✅ Authentication
- [ ] Test Cloudflare Access integration
- [ ] Verify JWT token validation
- [ ] Test unauthorized access attempts
- [ ] Verify rate limiting

### ✅ Authorization
- [ ] Test RBAC permissions
- [ ] Verify conversation access controls
- [ ] Test admin endpoints
- [ ] Verify user isolation

### ✅ Data Protection
- [ ] Verify TLS 1.3 is enforced
- [ ] Test SQL injection prevention
- [ ] Verify XSS protection
- [ ] Check CORS configuration

## Load Testing

### ✅ Baseline Tests
- [ ] 100 concurrent users
- [ ] 1000 messages/minute
- [ ] 10 concurrent conversations/user

### ✅ Stress Tests
- [ ] 1000 concurrent users
- [ ] 10000 messages/minute
- [ ] 100 concurrent conversations/user

### ✅ Endurance Tests
- [ ] 24-hour sustained load
- [ ] Memory leak detection
- [ ] Connection stability

## Rollback Plan

### ✅ Preparation
- [ ] Note current worker version
- [ ] Backup D1 database
- [ ] Document current configuration
- [ ] Prepare rollback command

### ✅ Rollback Procedure
```bash
# Rollback to previous version
npx wrangler deploy --compatibility-date 2025-10-01

# Verify rollback
curl https://k4-cage.trimtab-signal.workers.dev/health
```

## Post-Deployment

### ✅ First Hour
- [ ] Monitor error rates
- [ ] Check message delivery
- [ ] Verify WebSocket connections
- [ ] Review logs for issues

### ✅ First Day
- [ ] Analyze performance metrics
- [ ] Check user feedback
- [ ] Monitor resource usage
- [ ] Verify backup procedures

### ✅ First Week
- [ ] Review error trends
- [ ] Optimize performance
- [ ] Update documentation
- [ ] Conduct post-mortem if needed

## Success Criteria

### ✅ Technical
- [ ] 99.9% message delivery rate
- [ ] <100ms average latency
- [ ] <1% error rate
- [ ] 99.9% uptime

### ✅ Functional
- [ ] Messages delivered in real-time
- [ ] Typing indicators work
- [ ] Read receipts accurate
- [ ] Search returns correct results

### ✅ User Experience
- [ ] Interface responsive
- [ ] No lag in typing
- [ ] Notifications timely
- [ ] Mobile-friendly

## Documentation

### ✅ Update
- [ ] README.md
- [ ] API documentation
- [ ] User guide
- [ ] Troubleshooting guide
- [ ] Changelog

## Team Notification

### ✅ Notify
- [ ] Engineering team
- [ ] Product team
- [ ] Operations team
- [ ] Customer support
- [ ] Users (if applicable)

## Final Checklist

- [ ] All tests pass
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team notified
- [ ] Users informed
- [ ] Backup verified
- [ ] Rollback plan ready

---

**Deployment Date**: _____________  
**Deployed By**: _____________  
**Version**: 2.0.0-unified  
**Status**: _____________

**Notes**:  
__________________________________  
__________________________________  
__________________________________