/**
 * P31 Unified Social Worker
 * --------------------------
 * Consolidated social media automation: scheduling, multi-platform posting,
 * Discord notifications, and content wave management.
 *
 * Merges:
 *   - social-drop-automation/worker.js (scheduling + Discord)
 *   - p31_social_broadcast_worker.js (multi-platform posting)
 *
 * Deploy: cd 04_SOFTWARE/cloudflare-worker/social-drop-automation && npx wrangler deploy
 *
 * HTTP Endpoints:
 *   GET  /              → Health check + status
 *   GET  /status        → Platform configuration status
 *   GET  /waves         → List available content waves
 *   POST /broadcast     → Post to all configured platforms
 *   POST /trigger       → Fire a specific wave manually
 *   POST /preflight     → Run link health check
 *
 * Cron Triggers (recurring):
 *   Monday    17:00 UTC → Weekly social wave
 *   Wednesday 17:00 UTC → Mid-week update
 *   Friday    17:00 UTC → Weekend recap
 *   Daily     17:20 UTC → Ko-fi node count digest
 *   1st month 13:00 UTC → Monthly Zenodo reminder
 */

// ═══════════════════════════════════════════════════════════════
// CONTENT WAVES
// ═══════════════════════════════════════════════════════════════

const WAVE_CONTENT = {
  weekly_update: {
    title: 'Weekly P31 Labs Update',
    color: 0x00FF88,
    content: 'P31 Labs weekly update — check GitHub for latest commits and releases.',
    platforms: ['twitter', 'mastodon', 'bluesky'],
  },

  midweek: {
    title: 'Mid-Week P31 Labs',
    color: 0x1DA1F2,
    content: 'Building open-source assistive technology for neurodivergent individuals. Follow along at p31ca.org',
    platforms: ['twitter', 'mastodon'],
  },

  weekend_recap: {
    title: 'Weekend Recap',
    color: 0x7A27FF,
    content: 'Weekend build recap from P31 Labs. Open-source tools, open doors. p31ca.org | github.com/p31labs',
    platforms: ['twitter', 'mastodon', 'bluesky'],
  },

  kofi_digest: {
    title: 'Ko-fi Node Count Digest',
    color: 0x00D4FF,
    content: null, // filled dynamically
    discord_only: true,
  },

  zenodo_reminder: {
    title: 'Monthly Zenodo Upload Reminder',
    color: 0xF59E0B,
    content: 'Time for monthly Zenodo uploads. Check P31_Sprint_Deployment_Queue.md for pending items.',
    discord_only: true,
  },

  // --- Legacy one-shot waves (kept for manual trigger) ---
  preflight: {
    title: 'PRE-FLIGHT LINK CHECK',
    color: 0x00D4FF,
    links: [
      { name: 'BONDING', url: 'https://bonding.p31ca.org' },
      { name: 'P31 Labs', url: 'https://p31ca.org' },
      { name: 'Ko-fi', url: 'https://ko-fi.com/trimtab69420' },
      { name: 'GitHub', url: 'https://github.com/p31labs' },
      { name: 'phosphorus31.org', url: 'https://phosphorus31.org' },
    ],
  },

  wave1_kofi: {
    title: 'WAVE 1: KO-FI',
    color: 0x00FF88,
    content: `BONDING IS LIVE.

16 days ago, I shipped an open-source chemistry game on my son's 10th birthday.

I'm an autistic engineer. Late-diagnosed at 39. Sixteen years maintaining safety-critical systems for the DoD. When family court suspended my access to my children, I built BONDING — a multiplayer molecular builder where every atom placed is a timestamped parental engagement log.

My 6-year-old drags hydrogen and oxygen together. Builds water in 10 seconds. My 10-year-old chases glucose. Two secret elements are named after them. They don't know yet.

424 automated tests across 32 suites. Works offline. Runs on the Android tablets my kids use. No accounts. No ads. No data collection. Free forever.

Play it right now: bonding.p31ca.org

Every dollar here keeps me building from a desk instead of a car. The next tool is a haptic communication device for nonverbal users. The code is open source. But I'd rather keep shipping.

ko-fi.com/trimtab69420`,
    platforms: ['ko-fi'],
  },

  wave2_twitter: {
    title: 'WAVE 2: X/TWITTER (5 tweets)',
    color: 0x1DA1F2,
    tweets: [
      `I built a chemistry game so my kids could see me.

Autistic, diagnosed at 39. When I lost access to my kids, I built BONDING — a molecule builder where every atom is a timestamped parental contact.

Shipped on my son's 10th birthday. Live.

bonding.p31ca.org`,

      `424 tests / 32 suites. PWA. Works offline on tablets. No accounts. No ads. No data collection.

11 elements + 2 secret ones, 82 molecules. Quest chains from hydrogen to the Posner molecule.

Every sound synthesized from element frequencies via Web Audio API. Zero samples.`,

      `Two secret elements appear when you complete quest chains:

Bashium (Ba) — "Crashed into Earth 3/10/2016. Refuses broccoli."
Willium (Wi) — "First observed 8/8/2019. Always holds on to loved ones."

My kids don't know yet.`,

      `I'm the founder of P31 Labs — a Georgia nonprofit building open-source assistive tech for neurodivergent individuals.

The code is MIT licensed and will outlive my housing situation. But I'd rather keep building.

ko-fi.com/trimtab69420`,

      `Stack:
- TypeScript strict, 424 Vitest tests
- React + Three.js + Zustand + Vite
- Cloudflare Pages + Workers + KV
- Web Audio API
- IndexedDB (offline-first)
- PWA, COPPA-aligned

GitHub: github.com/p31labs`,
    ],
    platforms: ['twitter'],
  },

  wave3_linkedin: {
    title: 'WAVE 3: LINKEDIN',
    color: 0x0A66C2,
    content: `I shipped two applications this month.

BONDING is a multiplayer chemistry education game. Players drag atoms, form bonds following VSEPR geometry, and build molecules from hydrogen to the Posner molecule (Ca9(PO4)6). 11 elements, 82 molecules, 5 quest chains, 41 achievements. All audio synthesized from element-specific frequencies using the Web Audio API. 424 automated tests across 32 suites. Offline-first PWA targeting tablet devices.

It shipped on my son's 10th birthday. Every interaction is timestamped for evidence-grade export — designed for contexts where proof of engagement matters.

Both are TypeScript strict, React + Three.js, deployed on Cloudflare. Zero vendor lock-in. MIT licensed.

Built at P31 Labs, a Georgia nonprofit building open-source assistive technology.

bonding.p31ca.org | p31ca.org | github.com/p31labs`,
    platforms: ['linkedin'],
  },
};

// ═══════════════════════════════════════════════════════════════
// PLATFORM POSTERS (Real implementations)
// ═══════════════════════════════════════════════════════════════

/**
 * Twitter/X — OAuth 1.0a signed POST
 * Requires: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET
 */
async function postToTwitter(content, env) {
  const apiKey = env.TWITTER_API_KEY;
  const apiSecret = env.TWITTER_API_SECRET;
  const accessToken = env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    return { platform: 'twitter', status: 'skipped', reason: 'not configured' };
  }

  try {
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    const body = JSON.stringify({ text: content.slice(0, 280) });

    // OAuth 1.0a parameters
    const oauthParams = {
      oauth_consumer_key: apiKey,
      oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: accessToken,
      oauth_version: '1.0',
    };

    // Build signature base string
    const sortedParams = Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
      .join('&');
    const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;

    // Sign with HMAC-SHA1
    const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingKey),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signatureBase)
    );
    const oauthSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    oauthParams.oauth_signature = oauthSignature;

    // Build Authorization header
    const authHeader = 'OAuth ' + Object.keys(oauthParams).sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(', ');

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (response.ok) {
      const data = await response.json();
      return { platform: 'twitter', status: 'posted', id: data.data?.id };
    }
    const errorText = await response.text();
    return { platform: 'twitter', status: 'failed', error: errorText, code: response.status };
  } catch (error) {
    return { platform: 'twitter', status: 'error', error: error.message };
  }
}

/**
 * Reddit — OAuth2 Script App flow
 * Requires: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD
 */
async function postToReddit(payload, env) {
  const clientId = env.REDDIT_CLIENT_ID;
  const clientSecret = env.REDDIT_CLIENT_SECRET;
  const username = env.REDDIT_USERNAME;
  const password = env.REDDIT_PASSWORD;

  if (!clientId || !clientSecret || !username || !password) {
    return { platform: 'reddit', status: 'skipped', reason: 'not configured' };
  }

  try {
    // Step 1: Get access token
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'P31Labs/1.0 (social-worker)',
      },
      body: `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
    });

    if (!tokenResponse.ok) {
      return { platform: 'reddit', status: 'failed', error: 'token auth failed', code: tokenResponse.status };
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    // Step 2: Submit post
    const subreddit = payload.subreddit || 'test';
    const title = payload.title || 'P31 Labs Update';
    const text = payload.content || payload.message || '';

    const submitResponse = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'P31Labs/1.0 (social-worker)',
      },
      body: `sr=${encodeURIComponent(subreddit)}&kind=self&title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&resubmit=true&api_type=json`,
    });

    if (submitResponse.ok) {
      const data = await submitResponse.json();
      if (data.json?.errors?.length > 0) {
        return { platform: 'reddit', status: 'failed', error: data.json.errors };
      }
      return { platform: 'reddit', status: 'posted', url: data.json?.data?.url };
    }
    const errorText = await submitResponse.text();
    return { platform: 'reddit', status: 'failed', error: errorText, code: submitResponse.status };
  } catch (error) {
    return { platform: 'reddit', status: 'error', error: error.message };
  }
}

/**
 * Bluesky — AT Protocol (com.atproto.repo.createRecord)
 * Requires: BLUESKY_HANDLE, BLUESKY_APP_PASSWORD
 */
async function postToBluesky(content, env) {
  const handle = env.BLUESKY_HANDLE;
  const appPassword = env.BLUESKY_APP_PASSWORD;

  if (!handle || !appPassword) {
    return { platform: 'bluesky', status: 'skipped', reason: 'not configured' };
  }

  try {
    // Step 1: Create session
    const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: handle, password: appPassword }),
    });

    if (!sessionResponse.ok) {
      return { platform: 'bluesky', status: 'failed', error: 'session auth failed', code: sessionResponse.status };
    }

    const session = await sessionResponse.json();

    // Step 2: Create record (post)
    const postRecord = {
      $type: 'app.bsky.feed.post',
      text: content.slice(0, 300),
      createdAt: new Date().toISOString(),
    };

    const postResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: postRecord,
      }),
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      return { platform: 'bluesky', status: 'posted', uri: data.uri };
    }
    const errorText = await postResponse.text();
    return { platform: 'bluesky', status: 'failed', error: errorText, code: postResponse.status };
  } catch (error) {
    return { platform: 'bluesky', status: 'error', error: error.message };
  }
}

/**
 * Mastodon — Status API with Bearer token
 * Requires: MASTODON_INSTANCE, MASTODON_ACCESS_TOKEN
 */
async function postToMastodon(content, env) {
  const instance = env.MASTODON_INSTANCE;
  const token = env.MASTODON_ACCESS_TOKEN;

  if (!instance || !token) {
    return { platform: 'mastodon', status: 'skipped', reason: 'not configured' };
  }

  try {
    const response = await fetch(`${instance}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: content.slice(0, 500), visibility: 'public' }),
    });

    if (response.ok) {
      const data = await response.json();
      return { platform: 'mastodon', status: 'posted', url: data.url };
    }
    const errorText = await response.text();
    return { platform: 'mastodon', status: 'failed', error: errorText, code: response.status };
  } catch (error) {
    return { platform: 'mastodon', status: 'error', error: error.message };
  }
}

/**
 * Nostr — Stub (requires nostr-tools for signing)
 */
async function postToNostr(content, env) {
  if (!env.NOSTR_PRIVATE_KEY) {
    return { platform: 'nostr', status: 'skipped', reason: 'not configured' };
  }
  return { platform: 'nostr', status: 'stub', note: 'requires nostr-tools library for event signing' };
}

/**
 * Substack — Newsletter API
 * Requires: SUBSTACK_API_KEY
 */
async function postToSubstack(payload, env) {
  const apiKey = env.SUBSTACK_API_KEY;
  if (!apiKey) {
    return { platform: 'substack', status: 'skipped', reason: 'not configured' };
  }

  try {
    const response = await fetch('https://api.substack.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: payload.title || 'P31 Labs Update',
        content: payload.content || payload.message || '',
        type: 'newsletter',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { platform: 'substack', status: 'published', post_id: data.id };
    }
    return { platform: 'substack', status: 'failed', error: await response.text() };
  } catch (error) {
    return { platform: 'substack', status: 'error', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// DISPATCHER — Routes content to all configured platforms
// ═══════════════════════════════════════════════════════════════

async function broadcastToPlatforms(payload, env) {
  const platforms = payload.platforms || ['twitter', 'mastodon', 'bluesky'];
  const content = payload.content || payload.message || '';
  const results = {};

  const tasks = [];

  if (platforms.includes('twitter')) {
    tasks.push(postToTwitter(content, env).then(r => { results.twitter = r; }));
  }
  if (platforms.includes('reddit')) {
    tasks.push(postToReddit(payload, env).then(r => { results.reddit = r; }));
  }
  if (platforms.includes('bluesky')) {
    tasks.push(postToBluesky(content, env).then(r => { results.bluesky = r; }));
  }
  if (platforms.includes('mastodon')) {
    tasks.push(postToMastodon(content, env).then(r => { results.mastodon = r; }));
  }
  if (platforms.includes('nostr')) {
    tasks.push(postToNostr(content, env).then(r => { results.nostr = r; }));
  }
  if (platforms.includes('substack')) {
    tasks.push(postToSubstack(payload, env).then(r => { results.substack = r; }));
  }

  await Promise.allSettled(tasks);

  return {
    status: 'broadcast_complete',
    platforms: results,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// DISCORD NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

async function sendDiscordNotification(webhookUrl, wave) {
  if (!webhookUrl) {
    console.log('No Discord webhook — logging to console');
    console.log(wave.title);
    if (wave.content) console.log(wave.content);
    return { status: 'logged_to_console' };
  }

  const fullContent = wave.content || (wave.tweets ? wave.tweets.map((t, i) => `Tweet ${i + 1}:\n${t}`).join('\n\n') : '');
  const description = fullContent.slice(0, 4096) || 'No content';

  const embed = {
    embeds: [{
      title: wave.title,
      color: wave.color || 0x00D4FF,
      description,
      footer: { text: 'P31 Social Worker' },
      timestamp: new Date().toISOString(),
    }],
  };

  // Split into multiple embeds if over Discord's 4096-char limit
  if (fullContent.length > 4096) {
    const chunks = [];
    let remaining = fullContent;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, 4000));
      remaining = remaining.slice(4000);
    }
    embed.embeds = chunks.map((chunk, i) => ({
      title: i === 0 ? wave.title : `${wave.title} (part ${i + 1})`,
      color: wave.color || 0x00D4FF,
      description: chunk,
      footer: { text: 'P31 Social Worker' },
      timestamp: new Date().toISOString(),
    }));
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed),
    });
    return { status: response.ok ? 'sent' : 'failed', statusCode: response.status };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// PRE-FLIGHT LINK CHECK
// ═══════════════════════════════════════════════════════════════

async function checkLinks(webhookUrl) {
  const links = WAVE_CONTENT.preflight.links;
  const results = [];

  for (const link of links) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(link.url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);
      results.push({
        name: link.name,
        url: link.url,
        status: response.ok ? 'OK' : `HTTP ${response.status}`,
        statusCode: response.status,
      });
    } catch (err) {
      results.push({
        name: link.name,
        url: link.url,
        status: `ERROR: ${err.message}`,
        statusCode: 0,
      });
    }
  }

  const allGreen = results.every(r => r.statusCode >= 200 && r.statusCode < 400);
  const statusText = results.map(r => `${allGreen ? 'OK' : 'FAIL'} ${r.name} — ${r.url} (${r.status})`).join('\n');

  const wave = {
    title: allGreen ? 'PRE-FLIGHT: ALL LINKS GREEN' : 'PRE-FLIGHT: SOME LINKS FAILED',
    color: allGreen ? 0x00FF88 : 0xFF6600,
    content: statusText,
  };

  await sendDiscordNotification(webhookUrl, wave);
  return { allGreen, results };
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULED EVENT HANDLER (Cron Triggers)
// ═══════════════════════════════════════════════════════════════

async function handleScheduled(event, env) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  const now = new Date(event.scheduledTime);
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 5=Fri
  const utcDate = now.getUTCDate();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // Monday 17:00 UTC — Weekly social wave
  if (dayOfWeek === 1 && utcHour === 17 && utcMinute === 0) {
    const wave = WAVE_CONTENT.weekly_update;
    await sendDiscordNotification(webhookUrl, wave);

    // Also post to configured platforms
    const results = await broadcastToPlatforms(
      { content: wave.content, platforms: wave.platforms },
      env
    );
    console.log('Weekly wave:', JSON.stringify(results));
    return results;
  }

  // Wednesday 17:00 UTC — Mid-week update
  if (dayOfWeek === 3 && utcHour === 17 && utcMinute === 0) {
    const wave = WAVE_CONTENT.midweek;
    await sendDiscordNotification(webhookUrl, wave);
    const results = await broadcastToPlatforms(
      { content: wave.content, platforms: wave.platforms },
      env
    );
    console.log('Mid-week wave:', JSON.stringify(results));
    return results;
  }

  // Friday 17:00 UTC — Weekend recap
  if (dayOfWeek === 5 && utcHour === 17 && utcMinute === 0) {
    const wave = WAVE_CONTENT.weekend_recap;
    await sendDiscordNotification(webhookUrl, wave);
    const results = await broadcastToPlatforms(
      { content: wave.content, platforms: wave.platforms },
      env
    );
    console.log('Weekend wave:', JSON.stringify(results));
    return results;
  }

  // Daily 17:20 UTC — Ko-fi node count digest (Discord only)
  if (utcHour === 17 && utcMinute === 20) {
    const wave = WAVE_CONTENT.kofi_digest;
    await sendDiscordNotification(webhookUrl, {
      ...wave,
      content: 'Daily node count digest — check kofi.p31ca.org for current count.',
    });
    return { status: 'digest_sent' };
  }

  // 1st of month 13:00 UTC — Zenodo upload reminder (Discord only)
  if (utcDate === 1 && utcHour === 13 && utcMinute === 0) {
    await sendDiscordNotification(webhookUrl, WAVE_CONTENT.zenodo_reminder);
    return { status: 'zenodo_reminder_sent' };
  }

  console.log('No matching wave for this scheduled time');
  return { status: 'no_match' };
}

// ═══════════════════════════════════════════════════════════════
// HTTP REQUEST HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Health check
  if ((path === '/' || path === '/health') && request.method === 'GET') {
    return jsonResponse({
      service: 'p31-social-worker',
      status: 'operational',
      version: '2.0.0',
      endpoints: {
        'GET /status': 'Platform configuration status',
        'GET /waves': 'List available content waves',
        'POST /broadcast': 'Post to platforms { content, platforms?, title?, subreddit? }',
        'POST /trigger': 'Fire wave { wave }',
        'POST /preflight': 'Run link health check',
      },
      schedule: {
        weekly: 'Monday 17:00 UTC',
        midweek: 'Wednesday 17:00 UTC',
        weekend: 'Friday 17:00 UTC',
        daily_digest: '17:20 UTC',
        monthly_zenodo: '1st of month 13:00 UTC',
      },
    });
  }

  // Platform status
  if (path === '/status' && request.method === 'GET') {
    return jsonResponse({
      platforms: {
        twitter: !!(env.TWITTER_API_KEY && env.TWITTER_ACCESS_TOKEN),
        reddit: !!(env.REDDIT_CLIENT_ID && env.REDDIT_USERNAME),
        bluesky: !!(env.BLUESKY_HANDLE && env.BLUESKY_APP_PASSWORD),
        mastodon: !!(env.MASTODON_INSTANCE && env.MASTODON_ACCESS_TOKEN),
        nostr: !!env.NOSTR_PRIVATE_KEY,
        substack: !!env.SUBSTACK_API_KEY,
        discord: !!env.DISCORD_WEBHOOK_URL,
      },
    });
  }

  // List waves
  if (path === '/waves' && request.method === 'GET') {
    const waves = Object.keys(WAVE_CONTENT).map(key => ({
      id: key,
      title: WAVE_CONTENT[key].title,
      hasContent: !!WAVE_CONTENT[key].content,
      hasTweets: !!WAVE_CONTENT[key].tweets,
      hasLinks: !!WAVE_CONTENT[key].links,
      platforms: WAVE_CONTENT[key].platforms || [],
      discordOnly: !!WAVE_CONTENT[key].discord_only,
    }));
    return jsonResponse({ waves });
  }

  // Broadcast to platforms
  if (path === '/broadcast' && request.method === 'POST') {
    try {
      const payload = await request.json();
      if (!payload.content && !payload.message) {
        return jsonResponse({ error: 'Missing content/message field' }, 400);
      }
      const results = await broadcastToPlatforms(payload, env);
      return jsonResponse(results);
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // Trigger a wave
  if (path === '/trigger' && request.method === 'POST') {
    try {
      const body = await request.json();
      const waveName = body.wave || url.searchParams.get('wave');

      if (!waveName || !WAVE_CONTENT[waveName]) {
        return jsonResponse({
          error: 'Unknown wave',
          available: Object.keys(WAVE_CONTENT),
        }, 400);
      }

      const wave = WAVE_CONTENT[waveName];

      // Discord notification
      const discordResult = await sendDiscordNotification(env.DISCORD_WEBHOOK_URL, wave);

      // Platform broadcast if wave has platform targets and isn't discord-only
      let platformResult = null;
      if (!wave.discord_only && wave.platforms) {
        const content = wave.content || (wave.tweets ? wave.tweets.join('\n\n') : '');
        platformResult = await broadcastToPlatforms(
          { content, platforms: wave.platforms },
          env
        );
      }

      return jsonResponse({
        wave: waveName,
        discord: discordResult,
        platforms: platformResult,
      });
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // Preflight link check
  if (path === '/preflight' && request.method === 'POST') {
    const result = await checkLinks(env.DISCORD_WEBHOOK_URL);
    return jsonResponse(result);
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  },

  async scheduled(event, env, ctx) {
    return handleScheduled(event, env);
  },
};
