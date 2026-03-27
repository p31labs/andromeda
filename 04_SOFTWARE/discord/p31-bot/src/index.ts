import { Client, GatewayIntentBits, Message, TextChannel, Events, ChannelType } from 'discord.js';
import * as dotenv from 'dotenv';
import WebhookHandler from './services/webhookHandler';
import FawnDetector from './services/fawnDetector';
import TelemetryService from './services/telemetry';
import QuantumEggHunt from './services/quantumEggHunt';
import { createCommandRegistry, getApiUrls, getTimeout, getPrefix, parseArgs, CommandContext } from './commands/base';
import { SpoonCommand } from './commands/spoon';
import { BondingCommand } from './commands/bonding';
import { StatusCommand } from './commands/status';
import { HelpCommand } from './commands/help';

// Load environment variables
dotenv.config();

// Initialize services
const webhookPort = parseInt(process.env.NODE_ONE_WEBHOOK_PORT || '3000', 10);
const webhookHandler = new WebhookHandler(webhookPort);

const fawnDetector = new FawnDetector(process.env.ENABLE_FAWN_DETECTION === 'true');

const telemetryService = new TelemetryService(
  process.env.TELEMETRY_API_URL || '',
  !!process.env.TELEMETRY_API_URL,
  getTimeout()
);

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Initialize command registry
const registry = createCommandRegistry();

// Register commands
registry.register(new SpoonCommand());
registry.register(new BondingCommand());
registry.register(new StatusCommand());
registry.register(new HelpCommand(registry));

// Get configuration
const prefix = getPrefix();
const apiUrls = getApiUrls();
const timeout = getTimeout();

// Channel IDs
const bondingChannelId = process.env.BONDING_CHANNEL_ID;
const nodeOneChannelId = process.env.NODE_ONE_CHANNEL_ID;
const announcementsChannelId = process.env.ANNOUNCEMENTS_CHANNEL_ID;
let showcaseChannelId = process.env.SHOWCASE_CHANNEL_ID;

// Initialize Quantum Egg Hunt service (may be rebound after scaffold)
let quantumEggHunt = new QuantumEggHunt({
  targetChannelId: showcaseChannelId
});

// Helper function to get channel
function getChannel(channelId?: string): TextChannel | null {
  if (!channelId) return null;
  const channel = client.channels.cache.get(channelId);
  if (channel && channel instanceof TextChannel) {
    return channel;
  }
  return null;
}

// Handle webhook events
webhookHandler.on('kofi', async (event) => {
  console.log('Ko-fi webhook received:', event);
  const channel = getChannel(announcementsChannelId);
  if (channel) {
    await channel.send({
      content: `💖 Ko-fi donation received! Thank you for supporting P31 Labs!`
    });
  }
  await telemetryService.trackWebhook('kofi', event.payload.type as string);
});

webhookHandler.on('node_one', async (event) => {
  console.log('Node One webhook received:', event);
  const channel = getChannel(nodeOneChannelId);
  if (channel) {
    await channel.send({
      content: `🔘 Node One event: ${event.payload.event}`
    });
  }
  await telemetryService.trackWebhook('node_one', event.payload.event as string);
});

webhookHandler.on('bonding', async (event) => {
  console.log('BONDING webhook received:', event);
  const channel = getChannel(bondingChannelId);
  if (channel) {
    await channel.send({
      content: `🧬 BONDING event: ${event.payload.event}`
    });
  }
  await telemetryService.trackWebhook('bonding', event.payload.event as string);
});

// Discord message handler
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Check for Quantum Egg Hunt triggers in showcase channel
  if (message.channel.id === showcaseChannelId && quantumEggHunt.isActive()) {
    await quantumEggHunt.processDiscovery(message);
  }

  // Check for hidden !quantum-egg or !863 commands
  const lowerContent = message.content.toLowerCase();
  if (lowerContent === '!quantum-egg' || lowerContent === '!863') {
    await quantumEggHunt.handleHiddenCommand(message);
    return;
  }

  // Check if message starts with prefix
  if (!message.content.startsWith(prefix)) {
    // Check for fawning patterns in all messages
    const fawnResult = fawnDetector.analyze(message.content);
    if (fawnResult.isFawning) {
      console.log(`Fawning detected in message from ${message.author.id}:`, fawnResult.patterns);
      await telemetryService.trackFawnDetection(message.author.id, fawnResult.confidence, fawnResult.patterns);
      
      // Optionally respond with a gentle reminder (disabled by default)
      // if (fawnResult.suggestion) {
      //   await message.reply(fawnResult.suggestion);
      // }
    }
    return;
  }

  // Parse command and args
  const args = parseArgs(message.content, prefix);
  const commandName = args.shift()?.toLowerCase();

  if (!commandName) return;

  // Get command from registry
  const command = registry.get(commandName);
  if (!command) {
    await message.reply(`Unknown command: ${commandName}. Use \`${prefix} help\` for available commands.`);
    return;
  }

  // Create command context
  const context: CommandContext = {
    message,
    args,
    prefix,
    apiUrls,
    timeout
  };

  // Execute command
  try {
    await command.execute(context);
    await telemetryService.trackCommand(command.name, message.author.id, message.guildId || 'dm');
  } catch (error) {
    console.error(`Error executing command ${command.name}:`, error);
    await message.reply(`An error occurred while executing \`${command.name}\`. Please try again.`);
    await telemetryService.trackError(
      'command_execution',
      error instanceof Error ? error.message : 'Unknown error',
      error instanceof Error ? error.stack : undefined
    );
  }
});

// Bot ready handler
client.on(Events.ClientReady, async () => {
  console.log(`P31 Bot logged in as ${client.user?.tag}`);
  console.log(`Prefix: ${prefix}`);
  console.log(`Commands: ${registry.getAll().map(c => c.name).join(', ')}`);
  console.log(`Fawn detection: ${fawnDetector.isEnabled() ? 'enabled' : 'disabled'}`);
  console.log(`Telemetry: ${telemetryService.isEnabled() ? 'enabled' : 'disabled'}`);

  // Auto-scaffold #showcase channel across connected guilds
  for (const [, guild] of client.guilds.cache) {
    let showcase = guild.channels.cache.find(c => c.name === 'showcase');

    if (!showcase) {
      console.log(`[SCAFFOLD] Creating #showcase in ${guild.name}...`);
      try {
        showcase = await guild.channels.create({
          name: 'showcase',
          type: ChannelType.GuildText,
          topic: 'Quantum Egg Hunt: Chemical Egg Verification. Post Bashium, Willium, or Posner formulas here.',
        });
        console.log(`[SCAFFOLD] #showcase created in ${guild.name} (${showcase.id})`);
      } catch (err) {
        console.error(`[SCAFFOLD] Missing Manage Channels permission in ${guild.name} — grant it to the bot role.`);
        continue;
      }
    } else {
      console.log(`[SCAFFOLD] #showcase found in ${guild.name} (${showcase.id})`);
    }

    // Dynamically bind showcase ID — last guild wins if multi-guild
    showcaseChannelId = showcase.id;
    process.env.SHOWCASE_CHANNEL_ID = showcase.id;
  }

  // Rebind Quantum Egg Hunt with discovered channel ID
  quantumEggHunt = new QuantumEggHunt({ targetChannelId: showcaseChannelId });
  quantumEggHunt.setClient(client);

  console.log(`[BOT] Quantum Egg Hunt: ${quantumEggHunt.isActive() ? `armed on channel ${showcaseChannelId}` : 'inactive (no showcase channel found)'}`);
});

// Error handlers
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  telemetryService.trackError('unhandled_rejection', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : undefined);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  telemetryService.trackError('uncaught_exception', error.message, error.stack);
  process.exit(1);
});

// Start the bot
async function main(): Promise<void> {
  // Start webhook server
  await webhookHandler.start();
  console.log(`Webhook handler started on port ${webhookPort}`);

  // Login to Discord
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN is required');
  }

  await client.login(token);
}

main().catch(console.error);

export { client, registry, webhookHandler, fawnDetector, telemetryService };
