// P31 Sync Edge — Bridges local PGLite with Cloudflare D1
// Local-First architecture: incremental cursor-based sync
// Routes: POST /api/sync/push   — push local mutations
//         GET  /api/sync/pull   — pull cloud state (new device restore)
//         GET  /api/sync/health  — health check (public)
//         GET  /api/sync/status  — D1 aggregate metrics (public)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const isPublic = url.pathname === '/api/sync/health' || url.pathname === '/api/sync/status';

    if (!isPublic) {
      const auth = request.headers.get('Authorization');
      const expectedKey = env.SYNC_API_KEY || 'p31-sync-dev-key';
      if (auth !== `Bearer ${expectedKey}`) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/sync/push') {
      return handlePush(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/api/sync/pull') {
      return handlePull(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/api/sync/health') {
      // Public — no auth required for health check
      return json({ status: 'ok', timestamp: Date.now() });
    }

    if (request.method === 'GET' && url.pathname === '/api/sync/status') {
      // Public — aggregate D1 metrics for command center
      return handleStatus(env);
    }

    return json({ error: 'Not found' }, 404);
  },
};

async function handlePush(request, env) {
  try {
    const payload = await request.json();
    const { franchiseId, tables } = payload;

    if (!franchiseId || !tables) {
      return json({ error: 'Missing franchiseId or tables' }, 400);
    }

    const db = env.p31_smallball_sync;

    // Upsert players
    if (tables.players?.length) {
      for (const p of tables.players) {
        await db.prepare(
          `INSERT INTO players (id, franchise_id, first_name, last_name, jersey_number, base_stats, skin_tone_hex, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT (id) DO UPDATE SET
             base_stats = excluded.base_stats,
             jersey_number = excluded.jersey_number,
             synced_at = datetime('now')`
        ).bind(p.id, p.franchise_id, p.first_name, p.last_name, p.jersey_number, JSON.stringify(p.base_stats), p.skin_tone_hex).run();
      }
    }

    // Upsert training facilities
    if (tables.training_facilities?.length) {
      for (const f of tables.training_facilities) {
        await db.prepare(
          `INSERT INTO training_facilities (id, franchise_id, facility_type, level, pack_tier, synced_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT (id) DO UPDATE SET
             level = excluded.level,
             pack_tier = excluded.pack_tier,
             synced_at = datetime('now')`
        ).bind(f.id, f.franchise_id, f.facility_type, f.level, f.pack_tier).run();
      }
    }

    // Append-only: training events (skip duplicates by id)
    if (tables.training_events?.length) {
      for (const e of tables.training_events) {
        await db.prepare(
          `INSERT OR IGNORE INTO training_events (id, event_type, player_id, franchise_id, station, energy_spent, xp_gained, facility_level, was_manual, minigame_score, performed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(e.id, e.event_type, e.player_id, e.franchise_id, e.station, e.energy_spent, JSON.stringify(e.xp_gained), e.facility_level, e.was_manual, e.minigame_score, e.performed_at).run();
      }
    }

    // Append-only: stat mutations (skip duplicates by id)
    if (tables.stat_mutations?.length) {
      for (const m of tables.stat_mutations) {
        await db.prepare(
          `INSERT OR IGNORE INTO player_stat_mutations (id, player_id, mutation_type, stat_key, delta, applied_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(m.id, m.player_id, m.mutation_type, m.stat_key, m.delta, m.applied_at).run();
      }
    }

    // Upsert player energy
    if (tables.player_energy?.length) {
      for (const e of tables.player_energy) {
        await db.prepare(
          `INSERT INTO player_energy (player_id, current_energy, max_energy, last_regen_timestamp, synced_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT (player_id) DO UPDATE SET
             current_energy = excluded.current_energy,
             last_regen_timestamp = excluded.last_regen_timestamp,
             synced_at = datetime('now')`
        ).bind(e.player_id, e.current_energy, e.max_energy, e.last_regen_timestamp).run();
      }
    }

    // Upsert scheduled training
    if (tables.scheduled_training?.length) {
      for (const s of tables.scheduled_training) {
        await db.prepare(
          `INSERT INTO scheduled_training (id, player_id, franchise_id, station, focus_attribute, auto_enabled, last_executed_at, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT (id) DO UPDATE SET
             auto_enabled = excluded.auto_enabled,
             last_executed_at = excluded.last_executed_at,
             synced_at = datetime('now')`
        ).bind(s.id, s.player_id, s.franchise_id, s.station, s.focus_attribute, s.auto_enabled, s.last_executed_at).run();
      }
    }

    // Update cursor
    await db.prepare(
      `INSERT INTO sync_cursors (franchise_id, last_synced_at)
       VALUES (?, datetime('now'))
       ON CONFLICT (franchise_id) DO UPDATE SET last_synced_at = datetime('now')`
    ).bind(franchiseId).run();

    return json({ success: true, syncedAt: Date.now() });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

async function handleStatus(env) {
  try {
    const db = env.p31_smallball_sync;
    const start = Date.now();

    const [franchiseCount, playerCount, scheduleCount, mutationCount, eventCount] = await Promise.all([
      db.prepare('SELECT COUNT(DISTINCT franchise_id) as count FROM players').first(),
      db.prepare('SELECT COUNT(*) as count FROM players').first(),
      db.prepare('SELECT COUNT(*) as count FROM scheduled_training WHERE auto_enabled = 1').first(),
      db.prepare('SELECT COUNT(*) as count FROM player_stat_mutations').first(),
      db.prepare('SELECT COUNT(*) as count FROM training_events').first(),
    ]);

    // Latest sync cursor timestamp
    const latestCursor = await db.prepare(
      'SELECT last_synced_at FROM sync_cursors ORDER BY last_synced_at DESC LIMIT 1'
    ).first();

    return json({
      status: 'ok',
      timestamp: Date.now(),
      latency_ms: Date.now() - start,
      metrics: {
        total_franchises: franchiseCount?.count || 0,
        total_players: playerCount?.count || 0,
        active_schedules: scheduleCount?.count || 0,
        total_mutations: mutationCount?.count || 0,
        training_events: eventCount?.count || 0,
        tables_populated: 7,
      },
      last_sync_at: latestCursor?.last_synced_at || null,
    });
  } catch (err) {
    return json({ status: 'error', error: err.message }, 500);
  }
}

async function handlePull(request, env) {
  try {
    const franchiseId = new URL(request.url).searchParams.get('franchiseId');
    if (!franchiseId) {
      return json({ error: 'Missing franchiseId' }, 400);
    }

    const db = env.p31_smallball_sync;

    const [players, facilities, energy, schedules, cursor] = await Promise.all([
      db.prepare('SELECT * FROM players WHERE franchise_id = ?').bind(franchiseId).all(),
      db.prepare('SELECT * FROM training_facilities WHERE franchise_id = ?').bind(franchiseId).all(),
      db.prepare(
        `SELECT pe.* FROM player_energy pe
         JOIN players p ON pe.player_id = p.id
         WHERE p.franchise_id = ?`
      ).bind(franchiseId).all(),
      db.prepare('SELECT * FROM scheduled_training WHERE franchise_id = ?').bind(franchiseId).all(),
      db.prepare('SELECT last_synced_at FROM sync_cursors WHERE franchise_id = ?').bind(franchiseId).all(),
    ]);

    return json({
      franchiseId,
      tables: {
        players: players.results || [],
        training_facilities: facilities.results || [],
        player_energy: energy.results || [],
        scheduled_training: schedules.results || [],
        lastSyncedAt: cursor.results?.[0]?.last_synced_at || null,
      },
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
