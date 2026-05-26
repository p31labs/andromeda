// P31 Smallball Signal Worker v3.0 - 110% Quantum Upgrade
// Adaptive AI, Time-series Analytics, Cross-game Identity

export interface Env {
  MATCH_STATE: KVNamespace;
  ANALYTICS: KVNamespace;
  PLAYER_CACHE: KVNamespace;
  TENDENCIES: KVNamespace; // NEW: Player tendency tracking
  CROSS_GAME: KVNamespace; // NEW: Unified identity
}

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route handling
    try {
      // === HEALTH & STATUS ===
      if (path === '/api/health') {
        return jsonResponse({
          status: 'ok',
          service: 'p31-smallball-signal',
          version: '3.0.0-quantum',
          tier: 'free',
          features: ['adaptive-ai', 'analytics-v3', 'cross-game'],
          timestamp: Date.now()
        });
      }

      // === CORE GAME API ===
      if (path === '/api/seed' && request.method === 'POST') {
        const { matchId, playerId } = await request.json();
        const seed = generateSeed();

        await env.MATCH_STATE.put(
          `seed:${matchId}`,
          JSON.stringify({ seed, timestamp: Date.now(), playerId }),
          { expirationTtl: 86400 }
        );

        await incrementAnalytics(env.ANALYTICS, 'matches_created');

        return jsonResponse({ seed, timestamp: Date.now(), playerId });
      }

      if (path === '/api/match/submit' && request.method === 'POST') {
        const { matchId, hash, events, franchiseId, playerId } = await request.json();

        await env.MATCH_STATE.put(
          `match:${matchId}`,
          JSON.stringify({ hash, events, franchiseId, playerId, status: 'completed', timestamp: Date.now() }),
          { expirationTtl: 604800 }
        );

        await incrementAnalytics(env.ANALYTICS, 'matches_completed');

        // Update player tendencies if playerId provided
        if (playerId) {
          ctx.waitUntil(updateTendenciesFromMatch(env.TENDENCIES, playerId, events));
        }

        return jsonResponse({ received: true, matchId, playerId });
      }

      if (path === '/api/match/validate' && request.method === 'POST') {
        const { matchId, eventLogHash } = await request.json();
        const stored = await env.MATCH_STATE.get(`match:${matchId}`);

        if (!stored) {
          return jsonResponse({ valid: null, status: 'not_found' }, 404);
        }

        const match = JSON.parse(stored);
        const valid = match.hash === eventLogHash;

        return jsonResponse({
          valid,
          status: valid ? 'validated' : 'hash_mismatch',
          timestamp: Date.now()
        });
      }

      // === ADAPTIVE AI API ===
      if (path === '/api/ai/personality' && request.method === 'POST') {
        const { difficulty = 'balanced' } = await request.json();
        const personalities = ['aggressive', 'defensive', 'balanced', 'analytical', 'chaotic'];
        const selected = personalities.includes(difficulty) ? difficulty : personalities[Math.floor(Math.random() * personalities.length)];

        return jsonResponse({
          personality: selected,
          aiId: generateSeed().toString(36),
          timestamp: Date.now()
        });
      }

      if (path === '/api/ai/decision' && request.method === 'POST') {
        const { context, playerId, personality } = await request.json();

        // Fetch tendencies if playerId provided
        let tendencies = null;
        if (playerId) {
          const stored = await env.TENDENCIES.get(`tendencies:${playerId}`);
          if (stored) tendencies = JSON.parse(stored);
        }

        const decision = generateAdaptiveDecision(context, tendencies, personality);

        return jsonResponse({
          decision,
          adaptive: !!tendencies,
          confidence: tendencies?.confidenceScore || 0,
          timestamp: Date.now()
        });
      }

      if (path.startsWith('/api/ai/tendencies/') && request.method === 'GET') {
        const playerId = path.replace('/api/ai/tendencies/', '');
        if (!playerId || playerId.includes('/')) return jsonResponse({ error: 'Missing playerId' }, 400);

        const stored = await env.TENDENCIES.get(`tendencies:${playerId}`);
        if (!stored) {
          return jsonResponse({
            playerId,
            tendencies: createEmptyTendencies(playerId),
            sampleSize: 0,
            isNew: true
          });
        }

        return jsonResponse(JSON.parse(stored));
      }

      // === ANALYTICS API v3.0 ===
      if (path === '/api/stats') {
        const matchesCreated = await env.ANALYTICS.get('matches_created') || '0';
        const matchesCompleted = await env.ANALYTICS.get('matches_completed') || '0';
        const aiDecisions = await env.ANALYTICS.get('ai_decisions') || '0';

        return jsonResponse({
          matchesCreated: parseInt(matchesCreated),
          matchesCompleted: parseInt(matchesCompleted),
          aiDecisions: parseInt(aiDecisions),
          tier: 'free',
          version: '3.0.0-quantum'
        });
      }

      if (path.startsWith('/api/analytics/player/') && request.method === 'GET') {
        const playerId = path.replace('/api/analytics/player/', '');
        if (!playerId || playerId.includes('/')) return jsonResponse({ error: 'Missing playerId' }, 400);

        const [tendencies, history] = await Promise.all([
          env.TENDENCIES.get(`tendencies:${playerId}`),
          env.ANALYTICS.get(`history:${playerId}`)
        ]);

        return jsonResponse({
          playerId,
          tendencies: tendencies ? JSON.parse(tendencies) : null,
          history: history ? JSON.parse(history) : [],
          heatmapAvailable: !!tendencies
        });
      }

      if (path === '/api/analytics/batch' && request.method === 'POST') {
        const { franchiseId, events } = await request.json();

        // Batch write analytics (free tier: 1k writes/day)
        // Compress multiple events into single KV write
        const batchKey = `batch:${franchiseId}:${Date.now()}`;
        await env.ANALYTICS.put(batchKey, JSON.stringify({ franchiseId, events, timestamp: Date.now() }), {
          expirationTtl: 2592000 // 30 days
        });

        return jsonResponse({ received: events.length, batchKey, status: 'queued' });
      }

      if (path === '/api/leaderboard') {
        // Get cross-game leaderboard
        const leaderboardData = await env.CROSS_GAME.get('leaderboard:global');
        const leaderboard = leaderboardData ? JSON.parse(leaderboardData) : [];

        return jsonResponse({
          leaderboard: leaderboard.slice(0, 50),
          totalPlayers: leaderboard.length,
          updatedAt: Date.now()
        });
      }

      // === CROSS-GAME IDENTITY API ===
      if (path.startsWith('/api/identity/') && request.method === 'GET') {
        const playerId = path.replace('/api/identity/', '');
        if (!playerId || playerId.includes('/')) return jsonResponse({ error: 'Missing playerId' }, 400);

        const identity = await env.CROSS_GAME.get(`identity:${playerId}`);
        if (!identity) {
          return jsonResponse({
            playerId,
            displayName: `Player_${playerId.slice(0, 8)}`,
            isNew: true,
            level: 1,
            totalXp: 0
          });
        }

        return jsonResponse(JSON.parse(identity));
      }

      if (path.startsWith('/api/identity/') && request.method === 'POST' && !path.endsWith('/xp')) {
        const playerId = path.replace('/api/identity/', '');
        if (!playerId || playerId.includes('/')) return jsonResponse({ error: 'Missing playerId' }, 400);

        const updates = await request.json();
        const existing = await env.CROSS_GAME.get(`identity:${playerId}`);
        const identity = existing ? JSON.parse(existing) : createNewIdentity(playerId);

        Object.assign(identity, updates, { lastActive: Date.now() });

        await env.CROSS_GAME.put(`identity:${playerId}`, JSON.stringify(identity));

        return jsonResponse({ updated: true, playerId, identity });
      }

      if (path.includes('/identity/') && path.endsWith('/xp') && request.method === 'POST') {
        const playerId = path.replace('/api/identity/', '').replace('/xp', '');
        if (!playerId) return jsonResponse({ error: 'Missing playerId' }, 400);

        const { xp, source } = await request.json();
        const identity = await addXp(env.CROSS_GAME, playerId, xp, source);

        return jsonResponse({
          playerId,
          xpAdded: xp,
          totalXp: identity.totalXp,
          level: identity.level,
          newAchievements: identity.newAchievements || []
        });
      }

      // === WEBSOCKET SIGNALING ===
      if (path === '/api/signal') {
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader !== 'websocket') {
          return new Response('Expected websocket', { status: 400 });
        }

        const [client, server] = Object.values(new WebSocketPair());
        server.accept();

        server.addEventListener('message', async (event) => {
          const data = JSON.parse(event.data);

          if (data.type === 'SYNC_REQUEST') {
            server.send(JSON.stringify({
              type: 'SYNC_RESPONSE',
              mutations: [],
              matches: [],
              serverTime: Date.now()
            }));
          }

          if (data.type === 'ICE_CANDIDATE') {
            // Relay ICE candidate to peer
            server.send(JSON.stringify({
              type: 'ICE_RELAY',
              candidate: data.candidate,
              from: data.from
            }));
          }
        });

        return new Response(null, {
          status: 101,
          webSocket: client,
          headers: corsHeaders
        });
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return jsonResponse({ error: error.message, stack: error.stack }, 500);
    }
  },

  // === CRON: Daily regeneration + Analytics rollup ===
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron triggered: Daily 110% regeneration');

    // Reset daily analytics counter
    await env.ANALYTICS.put('daily_regeneration', JSON.stringify({
      timestamp: Date.now(),
      action: 'spoon_regeneration',
      version: '3.0.0-quantum'
    }));

    // Update global leaderboard
    ctx.waitUntil(updateGlobalLeaderboard(env.CROSS_GAME));

    console.log('Daily regeneration complete');
  }
};

// === HELPER FUNCTIONS ===

function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

async function incrementAnalytics(analytics: KVNamespace, key: string): Promise<void> {
  const current = await analytics.get(key) || '0';
  await analytics.put(key, (parseInt(current) + 1).toString());
}

// === ADAPTIVE AI FUNCTIONS ===

function generateAdaptiveDecision(context: any, tendencies: any, personality: string): any {
  const personalities: Record<string, number> = {
    aggressive: 0.25,
    defensive: -0.2,
    balanced: 0,
    analytical: -0.1,
    chaotic: 0.1
  };

  const bias = personalities[personality] || 0;

  // Base probabilities
  let probs = {
    fastball: 0.5,
    curveball: 0.2,
    slider: 0.2,
    changeup: 0.1
  };

  // Apply game context
  if (context.scoreDiff > 0) {
    probs.fastball += 0.1;
  } else if (context.scoreDiff < 0) {
    probs.curveball += 0.1;
    probs.slider += 0.05;
  }

  if (context.runners > 0) {
    probs.fastball += 0.1;
  }

  // Apply personality
  probs.fastball *= (1 + bias);

  // Apply tendencies if available
  if (tendencies && tendencies.confidenceScore > 0.3) {
    // Exploit weak zones
    const weakPitch = findWeakPitch(tendencies);
    if (weakPitch) {
      probs[weakPitch.toLowerCase() as keyof typeof probs] *= 1.2;
    }
  }

  // Normalize
  const total = probs.fastball + probs.curveball + probs.slider + probs.changeup;
  probs.fastball /= total;
  probs.curveball /= total;
  probs.slider /= total;
  probs.changeup /= total;

  const pitchTypes = ['FASTBALL', 'CURVEBALL', 'SLIDER', 'CHANGEUP'];
  const roll = Math.random();
  let selected = 'FASTBALL';
  if (roll < probs.fastball) selected = 'FASTBALL';
  else if (roll < probs.fastball + probs.curveball) selected = 'CURVEBALL';
  else if (roll < probs.fastball + probs.curveball + probs.slider) selected = 'SLIDER';
  else selected = 'CHANGEUP';

  return {
    pitchType: selected,
    location: ['inside', 'outside', 'high', 'low', 'center'][Math.floor(Math.random() * 5)],
    aggression: Math.min(1, Math.max(0, 0.5 + bias)),
    reasoning: `Personality: ${personality} | Confidence: ${tendencies ? (tendencies.confidenceScore * 100).toFixed(0) : 0}%`
  };
}

function findWeakPitch(tendencies: any): string | null {
  const qualities: Record<string, number[]> = tendencies.contactQualityByPitch || {};
  let weakest = null;
  let lowestAvg = 1;

  for (const [pitch, samples] of Object.entries(qualities)) {
    if (samples.length > 3) {
      const avg = samples.reduce((a: number, b: number) => a + b, 0) / samples.length;
      if (avg < lowestAvg) {
        lowestAvg = avg;
        weakest = pitch;
      }
    }
  }

  return weakest;
}

async function updateTendenciesFromMatch(tendenciesKv: KVNamespace, playerId: string, events: any[]): Promise<void> {
  const key = `tendencies:${playerId}`;
  const existing = await tendenciesKv.get(key);
  const tendencies = existing ? JSON.parse(existing) : createEmptyTendencies(playerId);

  // Update from events
  for (const event of events) {
    if (event.type === 'PITCH' && event.pitchType) {
      tendencies.pitchSelection[event.pitchType] = (tendencies.pitchSelection[event.pitchType] || 0) + 1;
    }
    if (event.type === 'CONTACT' && event.quality !== undefined) {
      const pitch = event.pitchType || 'UNKNOWN';
      if (!tendencies.contactQualityByPitch[pitch]) tendencies.contactQualityByPitch[pitch] = [];
      tendencies.contactQualityByPitch[pitch].push(event.quality);
      // Keep last 20
      if (tendencies.contactQualityByPitch[pitch].length > 20) {
        tendencies.contactQualityByPitch[pitch].shift();
      }
    }
  }

  tendencies.sampleSize += events.length;
  tendencies.confidenceScore = Math.min(0.95, tendencies.sampleSize / 50);
  tendencies.lastUpdated = Date.now();

  await tendenciesKv.put(key, JSON.stringify(tendencies), { expirationTtl: 2592000 }); // 30 days
}

function createEmptyTendencies(playerId: string): any {
  return {
    playerId,
    pitchSelection: {},
    locationPreference: {},
    aggressionHistory: [],
    swingRateByCount: {},
    contactQualityByPitch: {},
    chaseRate: 0.5,
    patienceIndex: 0.5,
    sampleSize: 0,
    confidenceScore: 0,
    lastUpdated: Date.now()
  };
}

// === CROSS-GAME IDENTITY FUNCTIONS ===

function createNewIdentity(playerId: string): any {
  return {
    playerId,
    displayName: `Player_${playerId.slice(0, 8)}`,
    avatarHash: generateAvatarHash(playerId),
    totalXp: 0,
    level: 1,
    achievements: [],
    gameStats: { smallball: null, gridiron: null },
    createdAt: Date.now(),
    lastActive: Date.now(),
    gamesPlayed: 0,
    totalPlayTime: 0
  };
}

function generateAvatarHash(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

async function addXp(crossGameKv: KVNamespace, playerId: string, xp: number, source: string): Promise<any> {
  const key = `identity:${playerId}`;
  const existing = await crossGameKv.get(key);
  const identity = existing ? JSON.parse(existing) : createNewIdentity(playerId);

  identity.totalXp += xp;
  identity.level = calculateLevel(identity.totalXp);
  identity.lastActive = Date.now();

  // Check for new achievements (simplified)
  const newAchievements = [];
  if (identity.totalXp >= 1000 && !identity.achievements.find((a: any) => a.id === 'first_win')) {
    newAchievements.push({ id: 'first_win', name: 'First Victory', unlockedAt: Date.now() });
    identity.achievements.push(...newAchievements);
  }

  await crossGameKv.put(key, JSON.stringify(identity));

  identity.newAchievements = newAchievements;
  return identity;
}

function calculateLevel(totalXp: number): number {
  let level = 1;
  let xpForNext = 1000;
  while (totalXp >= xpForNext) {
    level++;
    xpForNext = 1000 * level * (level + 1) / 2;
  }
  return level;
}

async function updateGlobalLeaderboard(crossGameKv: KVNamespace): Promise<void> {
  // List all identities (limited by KV list, but OK for smaller scale)
  const list = await crossGameKv.list({ prefix: 'identity:', limit: 1000 });

  const players = [];
  for (const key of list.keys) {
    const data = await crossGameKv.get(key.name);
    if (data) players.push(JSON.parse(data));
  }

  const leaderboard = players
    .map((p: any) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      avatarHash: p.avatarHash,
      totalXp: p.totalXp,
      level: calculateLevel(p.totalXp),
      achievements: p.achievements.length
    }))
    .sort((a: any, b: any) => b.totalXp - a.totalXp)
    .slice(0, 100);

  await crossGameKv.put('leaderboard:global', JSON.stringify(leaderboard));
}
