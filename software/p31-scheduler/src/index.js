/**
 * p31-scheduler — consolidated cron dispatcher
 * Free-plan workaround: single `0 * * * *` entry dispatches all periodic tasks
 * by checking the current hour. Uses ~HTTP triggers to keep microservices decoupled.
 */
const ORACLE_URL = 'https://oracle-proof-of-care.trimtab-signal.workers.dev';
const FORGE_URL = 'https://p31-forge.trimtab-signal.workers.dev';

function log(env, msg) {
  if (env.ENVIRONMENT !== 'production') console.log(msg);
}

async function triggerOracleSnapshot(env) {
  log(env, `[scheduler] oracle snapshot at ${new Date().toISOString()}`);
  try {
    const res = await fetch(`${ORACLE_URL}/oracle/snapshot`, {
      method: 'POST',
      headers: { Authorization: 'Bearer oracle-internal' },
    });
    if (!res.ok) {
      log(env, `[scheduler] oracle snapshot failed: ${res.status} ${await res.text()}`);
    } else {
      const data = await res.json();
      log(env, `[scheduler] oracle snapshot OK: ${data.totalIdentities} identities, avg ${data.averageComposite?.toFixed(3)}`);
    }
  } catch (e) {
    log(env, `[scheduler] oracle snapshot error: ${e.message}`);
  }
}

async function triggerForgeDaily(env) {
  log(env, `[scheduler] forge grants scan at ${new Date().toISOString()}`);
  try {
    const res = await fetch(`${FORGE_URL}/scan-grants`, {
      method: 'POST',
      headers: { 'X-Forge-Key': env.FORGE_API_KEY || '' },
    });
    if (!res.ok) {
      log(env, `[scheduler] forge grants scan failed: ${res.status}`);
    } else {
      log(env, `[scheduler] forge grants scan OK`);
    }
  } catch (e) {
    log(env, `[scheduler] forge grants scan error: ${e.message}`);
  }
}

async function triggerForgeHourly(env) {
  log(env, `[scheduler] forge substack scan at ${new Date().toISOString()}`);
  try {
    const res = await fetch(`${FORGE_URL}/scan-substack`, {
      method: 'POST',
      headers: { 'X-Forge-Key': env.FORGE_API_KEY || '' },
    });
    if (!res.ok) {
      log(env, `[scheduler] forge substack scan failed: ${res.status}`);
    } else {
      log(env, `[scheduler] forge substack scan OK`);
    }
  } catch (e) {
    log(env, `[scheduler] forge substack scan error: ${e.message}`);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    return new Response(JSON.stringify({
      ok: true,
      service: 'p31-scheduler',
      version: env.SCHEDULER_VERSION || '0.1.0',
    }), { headers: { 'Content-Type': 'application/json' } });
  },

  async scheduled(event, env) {
    const now = new Date(event.scheduledTime);
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    log(env, `[scheduler] dispatch @ ${now.toISOString()} (hour=${hour})`);

    // Oracle snapshot: every 6 hours at 0, 6, 12, 18 UTC
    if (hour % 6 === 0 && minute < 5) {
      await triggerOracleSnapshot(env);
    }

    // Forge daily grants scan: 09:00 UTC
    if (hour === 9 && minute < 5) {
      await triggerForgeDaily(env);
    }

    // Forge hourly substack scan: always runs
    await triggerForgeHourly(env);
  },
};
