#!/usr/bin/env node
/**
 * Load test for BONDING multiplayer relay
 * Prerequisites: npm install -g k6
 * Run: k6 run scripts/load-test-bonding.k6.js --vus 20 --duration 5m
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,               // Virtual users
  duration: '5m',        // 5 minute test
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms
    http_req_failed: ['rate<0.1'],                    // <10% failure rate
  },
};

const BASE_URL = 'https://p31-bonding-relay.trimtab-signal.workers.dev';

export default function () {
  const roomId = `test-room-${Math.floor(__VU / 5)}`;
  const userId = `user-${__VU}-${Math.floor(__ITER / 10)}`;

  // Ping room (heartbeat)
  const pingResp = http.post(`${BASE_URL}/api/ping/${roomId}`, JSON.stringify({
    userId: userId,
    action: 'heartbeat',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Ping' }
  });

  check(pingResp, {
    'ping status is 200': (r) => r.status === 200,
    'ping response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Get room state
  const stateResp = http.get(`${BASE_URL}/api/room/${roomId}`, {
    tags: { name: 'GetState' }
  });

  check(stateResp, {
    'getstate status is 200': (r) => r.status === 200,
    'getstate response has users': (r) => JSON.parse(r.body)?.users?.length >= 0,
  });

  sleep(2);
}
