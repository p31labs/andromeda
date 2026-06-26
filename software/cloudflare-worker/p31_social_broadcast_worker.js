    // Health check
    if (request.method === "GET" && new URL(request.url).pathname === "/health") {
      return jsonResponse({
        status: "ok",
        service: "p31-social-broadcast",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      });
    }

// ============== NOSTR ==============
async function broadcastToNostr(content, tags = [], config) {
  if (!config.NOSTR_PRIVATE_KEY) {
    return { error: "Nostr not configured" };
  }
  // Simplified - full Nostr signing requires nostr-tools library
  return {
    status: "stub",
    note: "Nostr requires additional library for signing",
  };
}

async function testNostrRelays(config) {
  const results = {};
  for (const relay of config.NOSTR_RELAYS) {
    try {
      const res = await fetch(relay, { method: "GET" });
      results[relay] = res.ok ? "connected" : "error";
    } catch {
      results[relay] = "unreachable";
    }
  }
  return results;
}

// ============== TWITTER/X ==============
async function broadcastToTwitter(content, title, config) {
  if (!config.TWITTER_API_KEY) {
    return { error: "Twitter not configured" };
  }
  // Twitter OAuth 1.0a would go here - requires twitter-api-v2 library
  return {
    status: "configured",
    platform: "twitter",
    note: "OAuth 1.0a posting requires additional library",
  };
}

// ============== SUBSTACK ==============
async function broadcastToSubstack(payload, config) {
  if (!config.SUBSTACK_API_KEY) {
    return { error: "Substack not configured" };
  }
  try {
    const response = await fetch("https://api.substack.com/api/v1/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.SUBSTACK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: payload.title || "P31 Labs Update",
        content: payload.content,
        type: "newsletter",
      }),
    });
    if (response.ok) {
      const data = await response.json();
      return { status: "published", post_id: data.id };
    }
    return { error: await response.text() };
  } catch (error) {
    return { error: error.message };
  }
}

// ============== REDDIT ==============
async function broadcastToReddit(payload, config) {
  if (!config.REDDIT_CLIENT_ID) {
    return { error: "Reddit not configured" };
  }
  return { error: "Reddit needs OAuth2 setup" };
}

// ============== MASTODON ==============
async function broadcastToMastodon(content, config) {
  if (!config.MASTODON_ACCESS_TOKEN) {
    return { error: "Mastodon not configured" };
  }
  try {
    const response = await fetch(
      `${config.MASTODON_INSTANCE}/api/v1/statuses`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.MASTODON_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: content, visibility: "public" }),
      },
    );
    if (response.ok) {
      const data = await response.json();
      return { status: "published", url: data.url };
    }
    return { error: await response.text() };
  } catch (error) {
    return { error: error.message };
  }
}

// ============== BLUESKY ==============
async function broadcastToBluesky(content, config) {
  if (!config.BLUESKY_APP_PASSWORD) {
    return { error: "Bluesky not configured" };
  }
  return { error: "Bluesky needs AT Protocol library" };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
