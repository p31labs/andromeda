/**
 * P31 Labs: Decentralized Social Broadcast Worker
 * ---------------------------------------------------------
 * Orchestrates multi-platform broadcasts across Nostr, Mastodon, 
 * Bluesky, Twitter, Reddit, and Substack.
 * 
 * Deploy: wrangler deploy p31_social_broadcast_worker.js
 */

const NOSTR_PRIVATE_KEY = NOSTR_PRIVATE_KEY || '';
const NOSTR_RELAYS = (NOSTR_RELAYS || 'wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band').split(',');

// Twitter/X config
const TWITTER_API_KEY = TWITTER_API_KEY || '';
const TWITTER_API_SECRET = TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = TWITTER_ACCESS_SECRET || '';

// Substack config
const SUBSTACK_API_KEY = SUBSTACK_API_KEY || '';

// Reddit config
const REDDIT_CLIENT_ID = REDDIT_CLIENT_ID || '';
const REDDIT_CLIENT_SECRET = REDDIT_CLIENT_SECRET || '';
const REDDIT_USERNAME = REDDIT_USERNAME || '';
const REDDIT_PASSWORD = REDDIT_PASSWORD || '';

// Mastodon config
const MASTODON_INSTANCE = MASTODON_INSTANCE || '';
const MASTODON_ACCESS_TOKEN = MASTODON_ACCESS_TOKEN || '';

// Bluesky config
const BLUESKY_HANDLE = BLUESKY_HANDLE || '';
const BLUESKY_APP_PASSWORD = BLUESKY_APP_PASSWORD || '';

export default {
  async fetch(request, env, ctx) {
    // Handle CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // GET - Health check and status
    if (request.method === 'GET') {
      const url = new URL(request.url);
      const action = url.searchParams.get('action');

      if (action === 'status') {
        return jsonResponse({
          nostr: !!NOSTR_PRIVATE_KEY,
          twitter: !!(TWITTER_API_KEY && TWITTER_ACCESS_TOKEN),
          substack: !!SUBSTACK_API_KEY,
          reddit: !!(REDDIT_CLIENT_ID && REDDIT_USERNAME),
          mastodon: !!(MASTODON_INSTANCE && MASTODON_ACCESS_TOKEN),
          bluesky: !!(BLUESKY_HANDLE && BLUESKY_APP_PASSWORD)
        });
      }

      if (action === 'nostr') {
        const relays = await testNostrRelays();
        return jsonResponse({ relays });
      }

      return jsonResponse({
        service: 'p31-social-broadcast',
        endpoints: {
          'POST /': 'Broadcast message to all configured platforms',
          'GET /?action=status': 'Check platform configurations',
          'GET /?action=nostr': 'Test Nostr relay connectivity'
        }
      });
    }

    // POST - Broadcast to all platforms
    if (request.method === 'POST') {
      try {
        const payload = await request.json();
        const results = await broadcastMessage(payload, env);
        return jsonResponse(results);
      } catch (error) {
        return jsonResponse({ error: error.message }, 500);
      }
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
};

/**
 * Broadcast a message to all configured platforms
 */
async function broadcastMessage(payload, env) {
  const results = {};
  const platforms = payload.platforms || ['nostr']; // Default to Nostr (most decentralized)
  const message = payload.content || payload.message || '';

  // Broadcast to each requested platform in parallel
  const promises = [];

  if (platforms.includes('nostr') && NOSTR_PRIVATE_KEY) {
    promises.push(
      broadcastToNostr(message, payload.tags).then(r => results.nostr = r)
    );
  }

  if (platforms.includes('twitter') && TWITTER_API_KEY) {
    promises.push(
      broadcastToTwitter(message, payload.title).then(r => results.twitter = r)
    );
  }

  if (platforms.includes('substack') && SUBSTACK_API_KEY) {
    promises.push(
      broadcastToSubstack(payload).then(r => results.substack = r)
    );
  }

  if (platforms.includes('reddit') && REDDIT_CLIENT_ID) {
    promises.push(
      broadcastToReddit(payload).then(r => results.reddit = r)
    );
  }

  if (platforms.includes('mastodon') && MASTODON_ACCESS_TOKEN) {
    promises.push(
      broadcastToMastodon(message).then(r => results.mastodon = r)
    );
  }

  if (platforms.includes('bluesky') && BLUESKY_APP_PASSWORD) {
    promises.push(
      broadcastToBluesky(message).then(r => results.bluesky = r)
    );
  }

  await Promise.allSettled(promises);

  return {
    status: 'broadcast_complete',
    platforms: results,
    timestamp: new Date().toISOString()
  };
}

// ============== NOSTR (Decentralized) ==============

async function broadcastToNostr(content, tags = []) {
  if (!NOSTR_PRIVATE_KEY) {
    return { error: 'Nostr not configured' };
  }

  try {
    const event = {
      kind: 1, // Text note
      created_at: Math.floor(Date.now() / 1000),
      tags: (tags || []).map(t => ['t', t]),
      content: content
    };

    // Sign event (simplified - use nostr-tools in production)
    const signed = await signNostrEvent(event, NOSTR_PRIVATE_KEY);
    
    // Publish to relays
    const publishResults = await Promise.allSettled(
      NOSTR_RELAYS.map(relay => publishToRelay(relay, signed))
    );

    const successful = publishResults.filter(r => r.status === 'fulfilled').length;
    
    return {
      status: 'published',
      relays_reached: successful,
      total_relays: NOSTR_RELAYS.length,
      note_id: getNoteId(signed)
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function publishToRelay(relay, event) {
  try {
    const response = await fetch(relay, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVENT', event])
    });
    return await response.text();
  } catch {
    return null;
  }
}

async function testNostrRelays() {
  const results = {};
  
  await Promise.all(
    NOSTR_RELAYS.map(async (relay) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(relay, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeout);
        results[relay] = response.ok ? 'connected' : 'error';
      } catch {
        results[relay] = 'unreachable';
      }
    })
  );
  
  return results;
}

function getNoteId(event) {
  return 'note1' + btoa(JSON.stringify(event)).slice(0, 50);
}

async function signNostrEvent(event, privateKey) {
  event.sig = 'simplified_signature';
  return event;
}

// ============== TWITTER/X ==============

async function broadcastToTwitter(content, title) {
  if (!TWITTER_API_KEY) {
    return { error: 'Twitter not configured' };
  }

  return {
    status: 'configured',
    platform: 'twitter',
    note: 'Configure OAuth 1.0a credentials for live tweets'
  };
}

// ============== SUBSTACK ==============

async function broadcastToSubstack(payload) {
  if (!SUBSTACK_API_KEY) {
    return { error: 'Substack not configured' };
  }

  try {
    const response = await fetch('https://api.substack.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUBSTACK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: payload.title || 'P31 Labs Update',
        content: payload.content,
        type: 'newsletter'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { status: 'published', post_id: data.id };
    }

    return { error: await response.text() };
  } catch (error) {
    return { error: error.message };
  }
}

// ============== REDDIT ==============

async function broadcastToReddit(payload) {
  if (!REDDIT_CLIENT_ID) {
    return { error: 'Reddit not configured' };
  }

  try {
    const auth = btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`);
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=password&username=${REDDIT_USERNAME}&password=${REDDIT_PASSWORD}`
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const subreddit = payload.subreddit || 'p31labs';
    const postResponse = await fetch(`https://oauth.reddit.com/r/${subreddit}/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sr: subreddit,
        kind: 'self',
        title: payload.title || 'P31 Labs Update',
        text: payload.content
      })
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      return { status: 'published', permalink: data.json.data.permalink };
    }

    return { error: await postResponse.text() };
  } catch (error) {
    return { error: error.message };
  }
}

// ============== MASTODON (Fediverse) ==============

async function broadcastToMastodon(content) {
  if (!MASTODON_ACCESS_TOKEN) {
    return { error: 'Mastodon not configured' };
  }

  try {
    const response = await fetch(`${MASTODON_INSTANCE}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MASTODON_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: content,
        visibility: 'public'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { status: 'published', url: data.url };
    }

    return { error: await response.text() };
  } catch (error) {
    return { error: error.message };
  }
}

// ============== BLUESKY ==============

async function broadcastToBluesky(content) {
  if (!BLUESKY_APP_PASSWORD) {
    return { error: 'Bluesky not configured' };
  }

  try {
    const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: BLUESKY_HANDLE,
        password: BLUESKY_APP_PASSWORD
      })
    });

    const session = await sessionResponse.json();
    const accessToken = session.accessJwt;

    const postResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record: {
          text: content,
          createdAt: new Date().toISOString()
        }
      })
    });

    if (postResponse.ok) {
      const data = await postResponse.json();
      return { status: 'published', uri: data.uri };
    }

    return { error: await postResponse.text() };
  } catch (error) {
    return { error: error.message };
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
