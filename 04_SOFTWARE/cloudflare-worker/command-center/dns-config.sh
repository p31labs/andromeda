#!/bin/bash
# DNS Configuration for god.p31ca.org
# Execute in Cloudflare dashboard or via API

echo "=== DNS RECORDS ==="
echo "Type: A"
echo "Name: god.p31ca.org"
echo "Target: 192.0.2.1 (Cloudflare Anycast)"
echo "Proxy: 🟠 (orange cloud - MUST be proxied)"
echo ""
echo "Type: AAAA"
echo "Name: god.p31ca.org"
echo "Target: 2001:db8::1"
echo "Proxy: 🟠"
echo ""
echo "=== ZERO TRUST APPLICATION ==="
echo "Application Name: G.O.D. Dashboard Mesh"
echo "Domain: god.p31ca.org"
echo "Type: self_hosted"
echo "Session Duration: 24h"
echo "CORS: enabled for https://god.p31ca.org"
