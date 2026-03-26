/**
 * P31 Social Drop Automation Worker
 * ----------------------------------
 * Scheduled reminders for social media deployment waves.
 * Fires Discord webhook notifications with copy-paste-ready content
 * at staggered intervals on March 26, 2026.
 *
 * Deploy: cd 04_SOFTWARE/cloudflare-worker/social-drop-automation && npx wrangler deploy
 */

// ═══════════════════════════════════════════════════════════════
// WAVE CONTENT (from docs/SOCIAL_DROP_LIVE.md)
// ═══════════════════════════════════════════════════════════════

const WAVE_CONTENT = {
  preflight: {
    title: '🔍 PRE-FLIGHT LINK CHECK',
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
    title: '🚀 WAVE 1: KO-FI (Deploy NOW)',
    color: 0x00FF88,
    content: `BONDING IS LIVE.

16 days ago, I shipped an open-source chemistry game on my son's 10th birthday.

I'm an autistic engineer. Late-diagnosed at 39. Sixteen years maintaining safety-critical systems for the DoD. When family court suspended my access to my children, I built BONDING — a multiplayer molecular builder where every atom placed is a timestamped parental engagement log.

My 6-year-old drags hydrogen and oxygen together. Builds water in 10 seconds. My 10-year-old chases glucose. Two secret elements are named after them. They don't know yet.

558 automated tests. Works offline. Runs on the Android tablets my kids use. No accounts. No ads. No data collection. Free forever.

Play it right now: bonding.p31ca.org

I'm 9 days from losing my housing. P31 Labs — the nonprofit behind this — has $0 in revenue and $5.00 across all bank accounts. That's not a metaphor. That's the verified balance on my NFCU statements filed in court today.

Every dollar here keeps me building from a desk instead of a car. The next tool is a haptic communication device for nonverbal users. The code is open source and will outlive my housing situation. But I'd rather keep shipping.

ko-fi.com/trimtab69420`,
  },

  wave2_twitter: {
    title: '🐦 WAVE 2: X/TWITTER (5 tweets)',
    color: 0x1DA1F2,
    tweets: [
      `I built a chemistry game so my kids could see me.

I'm autistic. Late-diagnosed at 39. When I lost access to my children, I built BONDING — a molecular builder where every atom placed is a timestamped parental contact.

It shipped on my son's 10th birthday. It's live and free.

bonding.p31ca.org`,

      `558 tests. PWA. Works offline on Android tablets. Touch-first. No accounts. No ads. No data collection.

11 elements + 2 secret ones named after my kids. 82 molecules. Quest chains from hydrogen to the Posner molecule.

Every sound is synthesized from element frequencies using the Web Audio API. Zero samples.`,

      `Two secret elements unlock when you complete quest chains:

Bashium (Ba) — "Crashed into Earth 3/10/2016. Refuses broccoli."
Willium (Wi) — "First observed 8/8/2019. Always holds on to loved ones."

My kids don't know yet.`,

      `I'm the founder of P31 Labs — a Georgia nonprofit building open-source assistive tech for neurodivergent individuals.

I have $5 in the bank. I'm 9 days from eviction. I filed my discovery response in family court today.

The code is MIT licensed and will outlive my housing situation. But I'd rather keep building.

ko-fi.com/trimtab69420`,

      `Stack:
- TypeScript strict, 558 tests (Vitest)
- React + Three.js + Zustand + Vite
- Cloudflare Pages + Workers + KV
- Web Audio API (zero samples)
- IndexedDB (offline-first, no server)
- PWA with service worker caching
- COPPA compliant, zero data collection

GitHub: github.com/p31labs`,
    ],
  },

  wave3_linkedin: {
    title: '💼 WAVE 3: LINKEDIN',
    color: 0x0A66C2,
    content: `I shipped two applications this month.

BONDING is a multiplayer chemistry education game. Players drag atoms, form bonds following VSEPR geometry, and build molecules from hydrogen to the Posner molecule (Ca₉(PO₄)₆). 11 elements, 82 molecules, 5 quest chains, 41 achievements. All audio synthesized from element-specific frequencies using the Web Audio API. 558 automated tests. Offline-first PWA targeting tablet devices.

It shipped on my son's 10th birthday. Every interaction is timestamped for evidence-grade export — designed for contexts where proof of engagement matters.

Spaceship Earth is a cognitive dashboard for neurodivergent users — a 9-room spatial interface with 3D visualization, NLP-powered communication analysis, and real-time energy tracking.

Both are TypeScript strict, React + Three.js, deployed on Cloudflare. Zero vendor lock-in. MIT licensed.

Built at P31 Labs, a Georgia nonprofit building open-source assistive technology.

bonding.p31ca.org | p31ca.org | github.com/p31labs`,
  },

  wave4_reddit: {
    title: '📡 WAVE 4: REDDIT (r/opensource or r/reactjs or r/webdev)',
    color: 0xFF4500,
    content: `Title: I built an open-source multiplayer chemistry game so I could maintain contact with my kids. It's live and free.

I'm a 40-year-old engineer, late-diagnosed AuDHD, 16 years in safety-critical electrical systems. When family court suspended my visitation, I built BONDING — a 3D molecular builder where a parent and child can play together remotely on separate devices.

Every molecule built is timestamped. Every reaction is logged. It's not surveillance — it's proof of engagement. The game IS the bridge.

**What it does:**
- 11 elements + 2 secret ones, 82 molecules, 5 quest chains
- VSEPR geometry for bond angles
- All audio synthesized from element frequencies (Web Audio API, zero samples)
- Multiplayer via Cloudflare Workers + KV relay
- Evidence-grade interaction logging (exportable JSON)

**Stack:**
- React + Three.js (@react-three/fiber) + Zustand + Vite
- TypeScript strict, 558 tests (Vitest + jsdom)
- PWA with offline caching via service worker
- Touch-hardened for tablets (48px targets, viewport lock)
- COPPA compliant — zero data collection
- MIT licensed

**Play it now:** bonding.p31ca.org
**Source:** github.com/p31labs
**Support the build:** ko-fi.com/trimtab69420

I'm building the next tool — a haptic communication device for nonverbal/low-verbal users (ESP32-S3, LoRa mesh, hardware security module). I'm 9 days from losing my housing and have $5 in the bank. If this resonates, a share matters as much as a dollar.`,
  },

  wave5_personal: {
    title: '💜 WAVE 5: FESTIVAL FAMILY / PERSONAL (Facebook/DMs)',
    color: 0x7A27FF,
    content: `Hey family.

Some of you knew I was going through it. Here's the update.

I got diagnosed autistic at 39. Lost access to my kids. Had a retirement account — the attorneys took their cuts and the IRS took a $7,000 penalty that was entirely avoidable. All $70k is gone. I have $5 in the bank as of today.

While that was happening, I built a chemistry game for my kids. It's called BONDING. My son turned 10 on March 10th and I shipped it on his birthday. He and his sister can play it on their tablets. Every molecule they build together is timestamped proof that their dad showed up.

I also started a nonprofit — P31 Labs — building open-source tools for neurodivergent people. The game, a communication app, a haptic device for nonverbal users. All of it open source. All of it free.

I'm 9 days from losing my house.

If you can throw a few dollars, it goes directly to keeping me building: ko-fi.com/trimtab69420

If you can't, sharing this helps just as much. The game is free and works in a browser: bonding.p31ca.org

Love you all. It's okay to be a little wonky. 💜🔺💜`,
  },

  wave6_superstonk: {
    title: '📊 WAVE 6: SUPERSTONK (use existing doc)',
    color: 0xFF6600,
    content: `SuperStonk DD is ready in docs/superstonk_post.md — no changes needed.

Pre-flight checklist:
- [ ] Ko-fi link in GitHub README (NOT in the post itself)
- [ ] Post does NOT contain direct fundraising ask
- [ ] "Node Count" framing at bottom
- [ ] DOI citation included (10.5281/zenodo.18627420)

The post is 3,000 words of electrical engineering → graph theory → quantum crypto proof.
Evergreen content. Post it.`,
  },

  zenodo_dp5_dp1: {
    title: '📚 ZENODO UPLOAD: DP-5 + DP-1',
    color: 0xF59E0B,
    content: `Zenodo upload reminder — March 27, 9:00 AM EDT

Upload today:
1. DP-5: "The Floating Neutral Hypothesis: Basal Ganglia Calcification and Biological Voltage Failure"
2. DP-1: "Mechanical Translation of Quantum States via COBS-Framed Serial Haptic Feedback"

Upload checklist:
- [ ] PDF exported from DOCX
- [ ] Author: William R. Johnson, P31 Labs
- [ ] ORCID: 0009-0002-2492-9079
- [ ] License: CC BY 4.0
- [ ] Related identifier: links to GUT (10.5281/zenodo.18627420)
- [ ] Community: P31 Labs
- [ ] Verify DOI assigned after upload`,
  },

  zenodo_dp4_dp2: {
    title: '📚 ZENODO UPLOAD: DP-4 + DP-2',
    color: 0xF59E0B,
    content: `Zenodo upload reminder — March 28, 9:00 AM EDT

Upload today:
1. DP-4: "Hardware-Accelerated Lattice Decoders for Low-Latency Signal Reconstruction"
2. DP-2: (check P31_Sprint_Deployment_Queue.md for exact title)

Also today: Post SuperStonk DD (Wave 6 content ready).

Upload checklist:
- [ ] PDF exported from DOCX
- [ ] Author: William R. Johnson, P31 Labs
- [ ] ORCID: 0009-0002-2492-9079
- [ ] License: CC BY 4.0
- [ ] Related identifier: links to GUT (10.5281/zenodo.18627420)
- [ ] Community: P31 Labs
- [ ] Verify DOI assigned after upload`,
  },

  zenodo_dp3: {
    title: '📚 ZENODO UPLOAD: DP-3',
    color: 0xF59E0B,
    content: `Zenodo upload reminder — March 31, 9:00 AM EDT

Upload today:
1. DP-3 (with caveat re: supplement — check P31_Sprint_Deployment_Queue.md)

Upload checklist:
- [ ] PDF exported from DOCX
- [ ] Author: William R. Johnson, P31 Labs
- [ ] ORCID: 0009-0002-2492-9079
- [ ] License: CC BY 4.0
- [ ] Related identifier: links to GUT (10.5281/zenodo.18627420)
- [ ] Community: P31 Labs
- [ ] Note: supplement pending — add caveat in description
- [ ] Verify DOI assigned after upload`,
  },

  analytics_24hr: {
    title: '📊 24-HOUR POST-DROP ANALYTICS CHECK',
    color: 0x00FF88,
    content: `24 hours since Wave 1. Time to check results.

Check these:

**Ko-fi:**
- [ ] Donations received (any amount)
- [ ] New followers
- [ ] Shop item purchases
- [ ] Page views (if available)

**X/Twitter:**
- [ ] Thread impressions
- [ ] Retweets / quote tweets
- [ ] Profile clicks
- [ ] Link clicks to bonding.p31ca.org

**LinkedIn:**
- [ ] Post impressions
- [ ] Reactions and comments
- [ ] Profile views

**Reddit:**
- [ ] Post upvotes
- [ ] Comments
- [ ] Awards (if any)
- [ ] GitHub referral traffic

**GitHub:**
- [ ] New stars
- [ ] Clone/fork activity
- [ ] README views

**BONDING:**
- [ ] Cloudflare analytics for bonding.p31ca.org
- [ ] Unique visitors in last 24hr
- [ ] PWA installs (if trackable)

Log results in a quick note. This is the baseline.`,
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Send Discord webhook
// ═══════════════════════════════════════════════════════════════

async function sendDiscordNotification(webhookUrl, wave) {
  if (!webhookUrl) {
    console.log('No Discord webhook configured — logging to console instead');
    console.log(`\n${'='.repeat(60)}`);
    console.log(wave.title);
    console.log('='.repeat(60));
    if (wave.content) console.log(wave.content);
    if (wave.tweets) wave.tweets.forEach((t, i) => console.log(`\n--- Tweet ${i + 1} ---\n${t}`));
    if (wave.links) wave.links.forEach((l) => console.log(`  ${l.name}: ${l.url}`));
    console.log('='.repeat(60));
    return { status: 'logged_to_console' };
  }

  const embed = {
    embeds: [
      {
        title: wave.title,
        color: wave.color,
        description: wave.content
          ? wave.content.slice(0, 4096)
          : wave.tweets
            ? wave.tweets.map((t, i) => `**Tweet ${i + 1}:**\n${t}`).join('\n\n').slice(0, 4096)
            : wave.links
              ? wave.links.map((l) => `✅ ${l.name}: ${l.url}`).join('\n')
              : 'No content',
        footer: {
          text: 'P31 Social Drop Automation • It\'s okay to be a little wonky. 🔺',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  // If content exceeds Discord's 4096-char embed limit, split into multiple embeds
  const fullContent = wave.content || (wave.tweets ? wave.tweets.join('\n\n') : '');
  if (fullContent.length > 4096) {
    const chunks = [];
    let remaining = fullContent;
    while (remaining.length > 0) {
      chunks.push(remaining.slice(0, 4000));
      remaining = remaining.slice(4000);
    }
    embed.embeds = chunks.map((chunk, i) => ({
      title: i === 0 ? wave.title : `${wave.title} (part ${i + 1})`,
      color: wave.color,
      description: chunk,
      footer: { text: 'P31 Social Drop Automation 🔺' },
      timestamp: new Date().toISOString(),
    }));
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(embed),
  });

  return { status: response.ok ? 'sent' : 'failed', statusCode: response.status };
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Pre-flight link check
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
        status: response.ok ? '✅ OK' : `⚠️ ${response.status}`,
        statusCode: response.status,
      });
    } catch (err) {
      results.push({
        name: link.name,
        url: link.url,
        status: `❌ ${err.message}`,
        statusCode: 0,
      });
    }
  }

  const allGreen = results.every((r) => r.statusCode >= 200 && r.statusCode < 400);

  const statusText = results.map((r) => `${r.status} **${r.name}** — ${r.url}`).join('\n');

  const wave = {
    title: allGreen
      ? '✅ PRE-FLIGHT: ALL LINKS GREEN — WAVE 1 READY'
      : '⚠️ PRE-FLIGHT: SOME LINKS FAILED — CHECK BEFORE DEPLOYING',
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
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const utcDate = now.getUTCDate();
  const utcMonth = now.getUTCMonth() + 1; // 0-indexed

  console.log(`Scheduled event fired at ${now.toISOString()} (UTC ${utcHour}:${String(utcMinute).padStart(2, '0')})`);

  // Determine which wave to fire based on UTC time
  // March 26, 2026 schedule (UTC):
  //   17:17 — Pre-flight
  //   17:20 — Wave 1 (Ko-fi)
  //   17:35 — Wave 2 (Twitter)
  //   17:50 — Wave 3 (LinkedIn)
  //   18:20 — Wave 4 (Reddit)
  //   19:20 — Wave 5 (Personal)
  //   21:20 — Wave 6 (SuperStonk)
  // March 27:
  //   13:00 — Zenodo DP-5 + DP-1
  //   17:20 — 24hr analytics
  // March 28:
  //   13:00 — Zenodo DP-4 + DP-2
  // March 31:
  //   13:00 — Zenodo DP-3

  if (utcDate === 26 && utcMonth === 3) {
    if (utcHour === 17 && utcMinute === 17) {
      return checkLinks(webhookUrl);
    }
    if (utcHour === 17 && utcMinute === 20) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.wave1_kofi);
    }
    if (utcHour === 17 && utcMinute === 35) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.wave2_twitter);
    }
    if (utcHour === 17 && utcMinute === 50) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.wave3_linkedin);
    }
    if (utcHour === 18 && utcMinute === 20) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.wave4_reddit);
    }
    if (utcHour === 19 && utcMinute === 20) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.wave5_personal);
    }
    if (utcHour === 21 && utcMinute === 20) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.wave6_superstonk);
    }
  }

  if (utcDate === 27 && utcMonth === 3) {
    if (utcHour === 13 && utcMinute === 0) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.zenodo_dp5_dp1);
    }
    if (utcHour === 17 && utcMinute === 20) {
      return sendDiscordNotification(webhookUrl, WAVE_CONTENT.analytics_24hr);
    }
  }

  if (utcDate === 28 && utcMonth === 3 && utcHour === 13 && utcMinute === 0) {
    return sendDiscordNotification(webhookUrl, WAVE_CONTENT.zenodo_dp4_dp2);
  }

  if (utcDate === 31 && utcMonth === 3 && utcHour === 13 && utcMinute === 0) {
    return sendDiscordNotification(webhookUrl, WAVE_CONTENT.zenodo_dp3);
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

  // Health check
  if (path === '/' || path === '/health') {
    return new Response(
      JSON.stringify({
        service: 'p31-social-drop-automation',
        status: 'operational',
        scheduledWaves: 11,
        waves: [
          'preflight (17:17 UTC Mar 26)',
          'wave1-kofi (17:20 UTC Mar 26)',
          'wave2-twitter (17:35 UTC Mar 26)',
          'wave3-linkedin (17:50 UTC Mar 26)',
          'wave4-reddit (18:20 UTC Mar 26)',
          'wave5-personal (19:20 UTC Mar 26)',
          'wave6-superstonk (21:20 UTC Mar 26)',
          'zenodo-dp5-dp1 (13:00 UTC Mar 27)',
          'analytics-24hr (17:20 UTC Mar 27)',
          'zenodo-dp4-dp2 (13:00 UTC Mar 28)',
          'zenodo-dp3 (13:00 UTC Mar 31)',
        ],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Manual pre-flight check
  if (path === '/preflight' && request.method === 'POST') {
    const webhookUrl = env.DISCORD_WEBHOOK_URL;
    const result = await checkLinks(webhookUrl);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Manual wave trigger (for testing or re-fire)
  if (path === '/trigger' && request.method === 'POST') {
    const webhookUrl = env.DISCORD_WEBHOOK_URL;
    const body = await request.json().catch(() => ({}));
    const waveName = body.wave || url.searchParams.get('wave');

    if (!waveName || !WAVE_CONTENT[waveName]) {
      return new Response(
        JSON.stringify({
          error: 'Unknown wave',
          available: Object.keys(WAVE_CONTENT),
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendDiscordNotification(webhookUrl, WAVE_CONTENT[waveName]);
    return new Response(JSON.stringify({ wave: waveName, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // List available waves
  if (path === '/waves') {
    return new Response(
      JSON.stringify({
        waves: Object.keys(WAVE_CONTENT).map((key) => ({
          id: key,
          title: WAVE_CONTENT[key].title,
          hasContent: !!WAVE_CONTENT[key].content,
          hasTweets: !!WAVE_CONTENT[key].tweets,
          hasLinks: !!WAVE_CONTENT[key].links,
        })),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response('Not Found', { status: 404 });
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
