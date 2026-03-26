import { Client, GatewayIntentBits, Application, Guild, Role, PermissionFlagsBits } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * P31 Server Setup - Full Automation
 * 
 * Flow:
 * 1. Generate OAuth2 invite URL for the bot
 * 2. User clicks invite to add bot to their server
 * 3. Bot detects new server and creates all channels/roles
 * 
 * Run: npx ts-node src/setup-server.ts
 */

const COLORS = {
  phosphorGreen: 0x00FF88,
  quantumCyan: 0x00D4FF,
  quantumViolet: 0x7A27FF,
  calciumAmber: 0xF59E0B,
  dangerRed: 0xEF4444
};

const SERVER_STRUCTURE = {
  categories: [
    {
      name: '🔺 P31 Labs',
      channels: [
        { name: 'announcements', type: 'text', topic: 'Official P31 Labs news, releases, milestones' },
        { name: 'roadmap', type: 'text', topic: 'Development priorities, upcoming features' },
        { name: 'introductions', type: 'text', topic: 'New member intros' },
        { name: 'faq', type: 'text', topic: 'Frequently asked questions' }
      ]
    },
    {
      name: '🎮 BONDING',
      channels: [
        { name: 'game-discussion', type: 'text', topic: 'General BONDING chat, strategies' },
        { name: 'quest-help', type: 'text', topic: 'Quest chain assistance, tips' },
        { name: 'multiplayer-matchmaking', type: 'text', topic: 'Find players for multiplayer' },
        { name: 'bugs-feedback', type: 'text', topic: 'Report issues, suggest features' },
        { name: '🎮 BONDING Room 1', type: 'voice', topic: 'Multiplayer sessions' },
        { name: '🎮 BONDING Room 2', type: 'voice', topic: 'Community play' }
      ]
    },
    {
      name: '💚 Support',
      channels: [
        { name: 'technical-support', type: 'text', topic: 'Node One, firmware, hardware help' },
        { name: 'accessibility-questions', type: 'text', topic: 'P31 accessibility features' },
        { name: 'general-help', type: 'text', topic: 'General troubleshooting' }
      ]
    },
    {
      name: '🔧 Node One',
      channels: [
        { name: 'build-guides', type: 'text', topic: 'Step-by-step Node One builds' },
        { name: 'firmware-discussion', type: 'text', topic: 'ESP32 firmware, updates' },
        { name: 'hardware-mods', type: 'text', topic: 'Custom modifications, improvements' },
        { name: '🔧 Lab Bench', type: 'voice', topic: 'Build sessions, Q&A' }
      ]
    },
    {
      name: '🌐 General',
      channels: [
        { name: 'chat', type: 'text', topic: 'General chat' },
        { name: 'off-topic', type: 'text', topic: 'Random discussions' },
        { name: 'resources', type: 'text', topic: 'Links to docs, tools, guides' },
        { name: '🔴 Community Voice', type: 'voice', topic: 'General voice chat' }
      ]
    }
  ],
  roles: [
    { name: 'Admin', color: COLORS.dangerRed, permissions: PermissionFlagsBits.Administrator },
    { name: 'Moderator', color: COLORS.quantumCyan, permissions: PermissionFlagsBits.ModerateMembers },
    { name: 'Contributor', color: COLORS.phosphorGreen, permissions: PermissionFlagsBits.ManageMessages },
    { name: 'BONDING Pro', color: COLORS.calciumAmber, permissions: PermissionFlagsBits.ManageChannels },
    { name: 'Node One Builder', color: COLORS.quantumViolet, permissions: PermissionFlagsBits.MoveMembers }
  ]
};

let client: Client;
let application: Application | null = null;

async function generateInviteLink(client: Client): Promise<string> {
  application = await client.application!.fetch();
  if (!application) {
    console.error('❌ Could not fetch application');
    return '';
  }
  
  // Generate invite with admin permissions
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${application.id}&permissions=8&scope=bot`;
  
  console.log('\n📎 INVITE LINK (click to add bot to your server):');
  console.log('   ' + inviteUrl);
  console.log('\n⚠️  IMPORTANT:');
  console.log('   1. Click the link above');
  console.log('   2. Select "P31 Labs Community" (or create new)');
  console.log('   3. Authorize the bot');
  console.log('   4. Return here and wait...');
  console.log('\n⏳ Waiting for bot to be added to server (30 seconds)...');
  
  return inviteUrl;
}

async function setupGuild(guild: Guild): Promise<void> {
  console.log(`\n🔧 Setting up server: ${guild.name} (${guild.id})`);
  
  // Check if already set up
  const existingChannel = guild.channels.cache.find(c => c.name === 'announcements');
  if (existingChannel) {
    console.log('  ⚠️ Server already appears to be set up!');
    return;
  }

  // Create roles first
  console.log('  📝 Creating roles...');
  for (const roleData of SERVER_STRUCTURE.roles) {
    await guild.roles.create({
      name: roleData.name,
      color: roleData.color,
      permissions: roleData.permissions,
      reason: 'P31 Server Setup'
    });
    console.log(`    ✅ ${roleData.name}`);
  }

  // Create categories and channels
  for (const categoryData of SERVER_STRUCTURE.categories) {
    const category = await guild.channels.create({
      name: categoryData.name,
      type: 4,
      permissionOverwrites: [],
      reason: 'P31 Server Setup'
    });
    console.log(`  📁 ${categoryData.name}`);

    for (const channelData of categoryData.channels) {
      if (channelData.type === 'text') {
        await guild.channels.create({
          name: channelData.name,
          type: 0,
          topic: channelData.topic,
          parent: category.id,
          reason: 'P31 Server Setup'
        });
        console.log(`    📝 #${channelData.name}`);
      } else if (channelData.type === 'voice') {
        await guild.channels.create({
          name: channelData.name,
          type: 2,
          topic: channelData.topic,
          parent: category.id,
          reason: 'P31 Server Setup'
        });
        console.log(`    🔊 ${channelData.name}`);
      }
    }
  }

  console.log('\n🎉 Server setup complete!');
  console.log(`   Server: ${guild.name}`);
  console.log(`   Channels: ${SERVER_STRUCTURE.categories.reduce((sum, c) => sum + c.channels.length, 0)}`);
}

async function main() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages
    ]
  });

  // Generate invite link on ready
  client.once('ready', async () => {
    console.log('🔺 Bot ready!');
    await generateInviteLink(client);
  });

  // Detect when bot joins a new server
  client.on('guildCreate', async (guild) => {
    console.log(`\n✨ Bot added to new server: ${guild.name}`);
    await setupGuild(guild);
  });

  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.error('❌ DISCORD_TOKEN not set in .env');
    process.exit(1);
  }

  await client.login(token);

  // Wait for user to add bot to server (60 seconds)
  await new Promise(resolve => setTimeout(resolve, 60000));

  console.log('\n⏰ Done waiting. Check the server above or run again if needed.');
  await client.destroy();
  process.exit(0);
}

main();
