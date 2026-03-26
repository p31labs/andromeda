/**
 * P31 Ko-fi Webhook Worker
 * Listens for Ko-fi webhooks and tracks node count for the Delta mesh
 * Includes Discord webhook integration for automated donation notifications
 * 
 * Deploy: wrangler deploy p31_kofi_webhook_worker.js
 * Environment: KOFI_SECRET, NODE_COUNT_KV, DISCORD_WEBHOOK_URL
 */

const KOFI_SECRET = KOFI_SECRET || '';
const NODE_COUNT_KV = NODE_COUNT_KV || null;
const DISCORD_WEBHOOK_URL = DISCORD_WEBHOOK_URL || '';

// Node milestones from Cognitive Passport
const NODE_MILESTONES = [4, 39, 69, 150, 420, 863, 1776];

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-kofi-webhook-secret',
        },
      });
    }

  // GET endpoint for node count and milestone status
  if (request.method === 'GET') {
    const nodeCount = await getNodeCount(env);
    const nextMilestone = getNextMilestone(nodeCount);
    const rewards = getAvailableRewards(nodeCount);
    
    return jsonResponse({
      node_count: nodeCount,
      next_milestone: nextMilestone,
      rewards: rewards,
      milestone_meaning: getMilestoneMeaning(nodeCount),
      progress: getProgressToNext(nodeCount)
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Verify webhook secret
    const webhookSecret = request.headers.get('x-kofi-webhook-secret');
    if (KOFI_SECRET && webhookSecret !== KOFI_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Parse Ko-fi webhook payload
    const payload = await request.json();
    const event = parseWebhookEvent(payload);

    if (!event) {
      return jsonResponse({ 
        node_count: await getNodeCount(env),
        status: 'ignored',
        message: 'Non-donation event'
      });
    }

    // Process the donation/purchase
    const result = await processEvent(event, env, ctx);

    return jsonResponse({
      node_count: await getNodeCount(env),
      status: 'processed',
      event_type: event.type,
      amount: event.amount,
      message: result.message,
      milestone_reached: result.milestone
    });

  } catch (error) {
    return jsonResponse({ 
      error: 'Internal server error',
      details: error.message 
    }, 500);
  }
},

  // Scheduled: Update node count from Ko-fi API daily
  async scheduled(event, env, ctx) {
    console.log('Running daily node count sync...');
    // This would fetch from Ko-fi API to get accurate totals
    // For now, KV-based counting handles real-time updates
  }
};

function parseWebhookEvent(payload) {
  // Ko-fi webhook types: Donation, Subscription, ShopOrder
  const type = payload.type;
  
  if (!type || type === 'Payment Process' || type === 'Verification') {
    return null;
  }

  return {
    type: type,
    amount: parseFloat(payload.amount) || 0,
    currency: payload.currency || 'USD',
    email: payload.email || '',
    name: payload.from_name || 'Anonymous',
    message: payload.message || '',
    order_id: payload.order_id || payload.kofi_transaction_id || '',
    timestamp: payload.timestamp || new Date().toISOString()
  };
}

async function processEvent(event, env, ctx) {
  let nodeCount = await getNodeCount(env);
  const previousCount = nodeCount;
  
  // Increment node count (each supporter = 1 node)
  nodeCount++;
  
  // Save to KV
  await saveNodeCount(env, nodeCount);
  
  // Log the support
  await logSupport(env, event);

  // Check for milestone
  let milestone = null;
  if (NODE_MILESTONES.includes(nodeCount) && nodeCount > previousCount) {
    milestone = {
      reached: nodeCount,
      milestone: getMilestoneMeaning(nodeCount)
    };
    console.log(`🎉 Node milestone reached: ${nodeCount}`);
  }

  // Send Discord notification
  if (DISCORD_WEBHOOK_URL) {
    await sendDiscordNotification(event, nodeCount, milestone);
  }

  return {
    message: `Thank you, ${event.name}! Node ${nodeCount} in the Delta mesh.`,
    milestone: milestone
  };
}

async function sendDiscordNotification(event, nodeCount, milestone) {
  const embed = {
    embeds: [{
      title: milestone 
        ? `🎉 MILESTONE: Node ${nodeCount}!`
        : '💚 New Node Added to Delta Mesh',
      description: `**${event.name}** just supported P31 Labs!`,
      color: milestone ? 0xF59E0B : 0x00FF88, // Amber for milestone, Green for normal
      fields: [
        { name: 'Amount', value: `${event.amount} ${event.currency}`, inline: true },
        { name: 'Total Nodes', value: `${nodeCount}`, inline: true },
        { name: 'Message', value: event.message || '_No message_', inline: false }
      ],
      footer: { text: 'P31 Labs | The Delta is rigid. The mesh holds. 🔺' },
      timestamp: new Date().toISOString()
    }]
  };

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
  } catch (error) {
    console.error('Discord notification failed:', error);
  }
}

async function getNodeCount(env) {
  if (!env.NODE_COUNT_KV) {
    // Fallback: use in-memory for local dev
    return global.nodeCount || 0;
  }
  
  const count = await env.NODE_COUNT_KV.get('node_count');
  return parseInt(count) || 0;
}

async function saveNodeCount(env, count) {
  if (!env.NODE_COUNT_KV) {
    global.nodeCount = count;
    return;
  }
  
  await env.NODE_COUNT_KV.put('node_count', count.toString());
}

async function logSupport(env, event) {
  const log = {
    timestamp: event.timestamp,
    type: event.type,
    amount: event.amount,
    name: event.name,
    message: event.message
  };
  
  if (!env.NODE_COUNT_KV) {
    global.supportLog = global.supportLog || [];
    global.supportLog.push(log);
    return;
  }

  const timestamp = Date.now();
  await env.NODE_COUNT_KV.put(`support_${timestamp}`, JSON.stringify(log));
}

function getMilestoneMeaning(n) {
  const meanings = {
    4: 'First tetrahedron — Maxwell rigidity achieved',
    39: 'Posner number — Calcium cage protecting Phosphorus',
    69: 'Nice',
    150: "Dunbar's number — meaningful social connections",
    420: 'Tetrahedral angle in degrees × 7',
    863: 'Larmor frequency — ³¹P resonance in Earth field',
    1776: 'Abdication of the Crown — systems change'
  };
  return meanings[n] || `Node ${n} in the Delta mesh`;
}

function getNextMilestone(count) {
  for (const milestone of NODE_MILESTONES) {
    if (milestone > count) {
      return {
        target: milestone,
        remaining: milestone - count,
        meaning: getMilestoneMeaning(milestone)
      };
    }
  }
  return null;
}

function getAvailableRewards(count) {
  const rewards = [];
  
  if (count >= 4) {
    rewards.push({
      id: 'first-tetrahedron',
      name: 'First Tetrahedron Badge',
      unlocked: true,
      description: 'Maxwell rigidity achieved — the minimum stable structure'
    });
  }
  if (count >= 39) {
    rewards.push({
      id: 'posner-cage',
      name: 'Posner Cage Badge',
      unlocked: true,
      description: 'Vote on next feature priority'
    });
  }
  if (count >= 69) {
    rewards.push({
      id: 'nice',
      name: 'Nice Badge',
      unlocked: true,
      description: 'Discord access'
    });
  }
  if (count >= 150) {
    rewards.push({
      id: 'dunbar',
      name: 'Dunbar Badge',
      unlocked: true,
      description: 'Monthly community call invitation'
    });
  }
  if (count >= 420) {
    rewards.push({
      id: 'tetrahedron',
      name: 'Tetrahedron Badge',
      unlocked: true,
      description: 'Name in Spaceship Earth credits'
    });
  }
  if (count >= 863) {
    rewards.push({
      id: 'larmor',
      name: 'Larmor Badge',
      unlocked: true,
      description: 'Limited edition Node One prototype vote'
    });
  }
  if (count >= 1776) {
    rewards.push({
      id: 'abdication',
      name: 'Abdication Badge',
      unlocked: true,
      description: 'Founding member status for P31 Labs'
    });
  }
  
  // Add locked rewards
  const next = getNextMilestone(count);
  if (next) {
    const lockedNames = {
      4: 'First Tetrahedron Badge',
      39: 'Posner Cage Badge',
      69: 'Nice Badge',
      150: 'Dunbar Badge',
      420: 'Tetrahedron Badge',
      863: 'Larmor Badge',
      1776: 'Abdication Badge'
    };
    rewards.push({
      id: `locked-${next.target}`,
      name: lockedNames[next.target] || `Milestone ${next.target}`,
      unlocked: false,
      target: next.target,
      remaining: next.remaining,
      description: getMilestoneMeaning(next.target)
    });
  }
  
  return rewards;
}

function getProgressToNext(count) {
  const next = getNextMilestone(count);
  if (!next) return 100;
  
  const prev = NODE_MILESTONES.filter(m => m < next.target).pop() || 0;
  const range = next.target - prev;
  const progress = count - prev;
  return Math.round((progress / range) * 100);
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
