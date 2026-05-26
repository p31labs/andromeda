// P31 Gridiron Signal Worker v3.0 - 110% Quantum Upgrade
// Adaptive AI, Time-series Analytics, Cross-game Identity

export interface Env {
  MATCH_STATE: KVNamespace;
  ANALYTICS: KVNamespace;
  GAMEPLAN_CACHE: KVNamespace;
  TENDENCIES: KVNamespace; // NEW: Player tendency tracking
  CROSS_GAME: KVNamespace; // NEW: Unified identity
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // === HEALTH & STATUS ===
      if (path === '/api/health') {
        return jsonResponse({
          status: 'ok',
          service: 'p31-gridiron-signal',
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

        await incrementAnalytics(env.ANALYTICS, 'games_created');

        return jsonResponse({ seed, timestamp: Date.now(), playerId });
      }

      if (path === '/api/drive/submit' && request.method === 'POST') {
        const { driveId, plays, score, franchiseId, playerId } = await request.json();

        await env.MATCH_STATE.put(
          `drive:${driveId}`,
          JSON.stringify({ plays, score, franchiseId, playerId, timestamp: Date.now() }),
          { expirationTtl: 604800 }
        );

        await incrementAnalytics(env.ANALYTICS, 'drives_completed');

        // Update player tendencies if playerId provided
        if (playerId) {
          ctx.waitUntil(updateTendenciesFromDrive(env.TENDENCIES, playerId, plays));
        }

        return jsonResponse({ saved: true, driveId, playerId });
      }

      if (path === '/api/gameplan/save' && request.method === 'POST') {
        const { franchiseId, gameplan, playerId } = await request.json();

        await env.GAMEPLAN_CACHE.put(
          `gameplan:${franchiseId}`,
          JSON.stringify({ ...gameplan, playerId, updatedAt: Date.now() }),
          { expirationTtl: 2592000 }
        );

        return jsonResponse({ saved: true });
      }

      if (path === '/api/gameplan/load' && request.method === 'GET') {
        const franchiseId = url.searchParams.get('franchiseId');
        if (!franchiseId) {
          return jsonResponse({ error: 'Missing franchiseId' }, 400);
        }

        const gameplan = await env.GAMEPLAN_CACHE.get(`gameplan:${franchiseId}`);
        if (!gameplan) {
          return jsonResponse({ gameplan: null, status: 'default' });
        }

        return jsonResponse({ gameplan: JSON.parse(gameplan) });
      }

      // === ADAPTIVE AI API ===
      if (path === '/api/ai/defense' && request.method === 'POST') {
        const { situation, playerId, personality } = await request.json();

        // Fetch tendencies if playerId provided
        let tendencies = null;
        if (playerId) {
          const stored = await env.TENDENCIES.get(`tendencies:${playerId}`);
          if (stored) tendencies = JSON.parse(stored);
        }

        const defense = generateAdaptiveDefense(situation, tendencies, personality);

        return jsonResponse({
          defense,
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
        const gamesCreated = await env.ANALYTICS.get('games_created') || '0';
        const drivesCompleted = await env.ANALYTICS.get('drives_completed') || '0';
        const aiDecisions = await env.ANALYTICS.get('ai_decisions') || '0';

        return jsonResponse({
          gamesCreated: parseInt(gamesCreated),
          drivesCompleted: parseInt(drivesCompleted),
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

        const batchKey = `batch:${franchiseId}:${Date.now()}`;
        await env.ANALYTICS.put(batchKey, JSON.stringify({ franchiseId, events, timestamp: Date.now() }), {
          expirationTtl: 2592000
        });

        return jsonResponse({ received: events.length, batchKey, status: 'queued' });
      }

      if (path === '/api/leaderboard') {
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

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (error) {
      return jsonResponse({ error: error.message, stack: error.stack }, 500);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Cron: Daily 110% turf regeneration');

    await env.ANALYTICS.put('daily_regeneration', JSON.stringify({
      timestamp: Date.now(),
      action: 'turf_regeneration',
      version: '3.0.0-quantum'
    }));

    ctx.waitUntil(updateGlobalLeaderboard(env.CROSS_GAME));
  }
};

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

function generateAdaptiveDefense(situation: any, tendencies: any, personality: string): any {
  const formations = ['4-3', '3-4', 'Nickel', 'Dime', 'Goal Line'];
  const coverages = ['Cover 1', 'Cover 2', 'Cover 3', 'Cover 4', 'Man'];
  const blitzTypes = ['None', 'Edge', 'A-Gap', 'Double A', 'Corner'];

  // Base selection
  let formation = formations[Math.floor(Math.random() * formations.length)];
  let coverage = coverages[Math.floor(Math.random() * coverages.length)];
  let blitz = blitzTypes[0]; // Default no blitz

  // Adapt to situation
  if (situation.down === 3 && situation.distance > 5) {
    formation = 'Dime';
    coverage = 'Cover 4';
  }

  if (situation.redZone) {
    formation = 'Goal Line';
    coverage = 'Cover 1';
  }

  // Apply personality
  if (personality === 'aggressive' && Math.random() > 0.5) {
    blitz = blitzTypes[Math.floor(Math.random() * (blitzTypes.length - 1)) + 1];
  }

  // Exploit tendencies if available
  if (tendencies && tendencies.confidenceScore > 0.3) {
    const runPassRatio = tendencies.runPassRatio || 0.5;
    if (runPassRatio > 0.6) {
      // Player runs a lot - stack the box
      formation = '4-3';
      coverage = 'Cover 1';
    }
  }

  return {
    formation,
    coverage,
    blitz,
    aggression: personality === 'aggressive' ? 0.8 : personality === 'defensive' ? 0.3 : 0.5,
    reasoning: `Situation: ${situation.down || 1}&${situation.distance || 10} | Personality: ${personality} | Confidence: ${tendencies ? (tendencies.confidenceScore * 100).toFixed(0) : 0}%`
  };
}

async function updateTendenciesFromDrive(tendenciesKv: KVNamespace, playerId: string, plays: any[]): Promise<void> {
  const key = `tendencies:${playerId}`;
  const existing = await tendenciesKv.get(key);
  const tendencies = existing ? JSON.parse(existing) : createEmptyTendencies(playerId);

  let runs = 0;
  let passes = 0;

  for (const play of plays) {
    if (play.type === 'run') runs++;
    if (play.type === 'pass') passes++;

    if (play.playType) {
      tendencies.playSelection[play.playType] = (tendencies.playSelection[play.playType] || 0) + 1;
    }
  }

  tendencies.runPassRatio = runs / (runs + passes || 1);
  tendencies.sampleSize += plays.length;
  tendencies.confidenceScore = Math.min(0.95, tendencies.sampleSize / 50);
  tendencies.lastUpdated = Date.now();

  await tendenciesKv.put(key, JSON.stringify(tendencies), { expirationTtl: 2592000 });
}

function createEmptyTendencies(playerId: string): any {
  return {
    playerId,
    playSelection: {},
    runPassRatio: 0.5,
    redZoneBehavior: { pass: 0, run: 0 },
    thirdDownConversion: { attempts: 0, success: 0 },
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
