/**
 * P31 Discord Bot
 * 
 * Cognitive accessibility features:
 * - Spoon economy tracking (energy + LOVE)
 * - Fawn response detection and de-escalation
 * - Real-time system status from Quantum Edge
 * - Clear, direct communication
 * - No jargon without explanation
 * 
 * Brand Colors:
 * - Phosphor Green: #00FF88
 * - Quantum Cyan: #00D4FF  
 * - Quantum Violet: #7A27FF
 * 
 * Outbound Automation:
 * - StatusCommand: Fetches live health from BONDING, Node One, Spoon APIs
 * - SpoonCommand: Fetches live spoon/LOVE data from API
 * - BondingCommand: Fetches game state, quests, leaderboard
 * 
 * Inbound Automation:
 * - WebhookHandler: Express server for Node One, BONDING, Ko-fi webhooks
 */

import { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  Message,
  Interaction,
  TextChannel,
  NewsChannel,
  ThreadChannel
} from 'discord.js';
import * as dotenv from 'dotenv';
import { P31Command, CommandContext } from './commands/base';
import { StatusCommand } from './commands/status';
import { BondingCommand } from './commands/bonding';
import { SpoonCommand } from './commands/spoon';
import { HelpCommand } from './commands/help';
import { AnnounceCommand } from './commands/announce';
import { FawnDetector } from './services/fawnDetector';
import { WebhookHandler } from './services/webhookHandler';
import { TelemetryService } from './services/telemetry';

dotenv.config();

// P31 Brand Colors
const COLORS = {
  phosphorGreen: 0x00FF88,
  quantumCyan: 0x00D4FF,
  quantumViolet: 0x7A27FF,
  calciumAmber: 0xF59E0B,
  dangerRed: 0xEF4444,
  void: 0x050510
};

/**
 * Main P31 Bot Class
 * Wires together Discord client, commands, services, and webhooks
 */
export class P31Bot {
  private client: Client;
  private commands: Map<string, P31Command> = new Map();
  private fawnDetector: FawnDetector;
  private webhookHandler: WebhookHandler;
  private telemetry: TelemetryService;
  private prefix: string;

  constructor() {
    // Initialize Discord client with required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    // Configuration
    this.prefix = process.env.BOT_PREFIX || 'p31';
    
    // Initialize services
    this.fawnDetector = new FawnDetector();
    this.webhookHandler = new WebhookHandler();
    this.telemetry = new TelemetryService();

    // Register commands and event handlers
    this.registerCommands();
    this.setupEventHandlers();
    this.setupWebhookEvents();
  }

  /**
   * Register all P31 commands
   */
  private registerCommands(): void {
    // Core commands
    this.commands.set('status', new StatusCommand());
    this.commands.set('bonding', new BondingCommand());
    this.commands.set('spoon', new SpoonCommand());
    this.commands.set('help', new HelpCommand(this.commands));
    this.commands.set('announce', new AnnounceCommand());
    
    // Aliases for common commands
    this.commands.set('node', new StatusCommand());      // Alias for status
    this.commands.set('love', new SpoonCommand());        // Alias for spoon
    this.commands.set('health', new StatusCommand());    // Alias for status
    this.commands.set('systems', new StatusCommand());   // Alias for status
    this.commands.set('broadcast', new AnnounceCommand()); // Alias for announce
  }

  /**
   * Setup Discord event handlers
   */
  private setupEventHandlers(): void {
    // Bot ready event
    this.client.once('ready', async () => {
      console.log(`🔺 P31 Bot online as ${this.client.user?.tag}`);
      console.log(`   Prefix: ${this.prefix}`);
      console.log(`   Commands: ${Array.from(this.commands.keys()).join(', ')}`);
      
      // Track startup
      await this.telemetry.trackStartup();

      // Start webhook listener on boot
      this.webhookHandler.start();
    });

    // Message event handler
    this.client.on('messageCreate', async (message: Message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      // Fawn detection - analyze messages mentioning the bot
      if (process.env.ENABLE_FAWN_DETECTION === 'true') {
        const fawnAnalysis = this.fawnDetector.analyze(message.content);
        if (fawnAnalysis.isFawning) {
          await this.handleFawnResponse(message, fawnAnalysis);
        }
      }

      // Command handling
      if (message.content.startsWith(this.prefix)) {
        await this.handleCommand(message);
      }
    });

    // Handle button interactions for de-escalation
    this.client.on('interactionCreate', async (interaction: Interaction) => {
      if (!interaction.isButton()) return;

      // De-escalation buttons
      if (interaction.customId === 'deescalate_calm') {
        await interaction.reply({ 
          content: 'Take your time. I\'m dismissing the previous alert.', 
          ephemeral: true 
        });
        if (interaction.message.deletable) {
          await interaction.message.delete();
        }
      }

      if (interaction.customId === 'deescalate_help') {
        await interaction.reply({ 
          content: 'Pinging a moderator to assist you. Please stand by.', 
          ephemeral: true 
        });
        // Could add moderator ping here
      }
    });
  }

  /**
   * Setup webhook event listeners
   * Routes incoming webhook events to Discord channel notifications
   */
  private setupWebhookEvents(): void {
    // BONDING match events
    this.webhookHandler.on('bonding-match', (data) => this.sendMatchNotification(data));
    this.webhookHandler.on('bonding-match-end', (data) => this.sendMatchEndNotification(data));
    this.webhookHandler.on('bonding-player-joined', (data) => this.sendPlayerJoinedNotification(data));

    // Node One hardware status events
    this.webhookHandler.on('node-one-status', (data) => this.sendNodeOneAlert(data));

    // Ko-fi donation events
    this.webhookHandler.on('kofi-purchase', (data) => this.sendKofiNotification(data));

    // Generic telemetry
    this.webhookHandler.on('telemetry', (data) => this.handleTelemetryEvent(data));
  }

  /**
   * Handle command execution
   */
  private async handleCommand(message: Message): Promise<void> {
    const args = message.content.slice(this.prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this.commands.get(commandName);
    if (!command) {
      await message.reply({ embeds: [this.createErrorEmbed(
        `Unknown command: ${commandName}`,
        `Try \`${this.prefix} help\` for all available commands.`
      )] });
      return;
    }

    try {
      const context: CommandContext = {
        prefix: this.prefix,
        bondingUrl: process.env.BONDING_API_URL || 'https://bonding.p31ca.org/api',
        nodeOneUrl: process.env.NODE_ONE_API_URL || 'http://localhost:3001/api',
        spoonUrl: process.env.SPOON_API_URL || 'https://phosphorus31.org/api/spoons'
      };

      await this.telemetry.trackCommand(commandName, message.author.id, true);
      await command.execute(message, args, context);
    } catch (error) {
      console.error(`Command error: ${commandName}`, error);
      await this.telemetry.trackCommand(commandName, message.author.id, false);
      await message.reply({ embeds: [this.createErrorEmbed(
        'System Error',
        'Something went wrong contacting P31 networks. Try again shortly.'
      )] });
    }
  }

  /**
   * Handle fawn response with de-escalation
   */
  private async handleFawnResponse(
    message: Message, 
    analysis: { isFawning: boolean; confidence: number; patterns: string[] }
  ): Promise<void> {
    // Only respond if the message mentions the bot
    const botMentioned = message.content.includes(this.client.user?.id || '');
    if (!botMentioned && !message.content.includes(this.prefix)) return;

    // Only trigger on higher confidence
    if (analysis.confidence < 0.5) return;

    const deescalateEmbed = new EmbedBuilder()
      .setTitle('🤔 Taking a breath...')
      .setDescription(this.fawnDetector.getDeescalationMessage(analysis))
      .setColor(COLORS.quantumCyan)
      .addFields(
        { name: 'Take a moment', value: 'It\'s okay to step back.' },
        { name: 'Get support', value: 'Click below if you need assistance.' }
      );

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('deescalate_calm')
          .setLabel('🧘 I\'m okay')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('deescalate_help')
          .setLabel('🆘 Need support')
          .setStyle(ButtonStyle.Danger)
      );

    await message.reply({ embeds: [deescalateEmbed], components: [row] });
  }

  /**
   * Create error embed
   */
  private createErrorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`⚠️ ${title}`)
      .setDescription(description)
      .setColor(COLORS.dangerRed);
  }

  // ============================================
  // Webhook Event Handlers (Discord notifications)
  // ============================================

  /**
   * Send BONDING match notification
   */
  private async sendMatchNotification(data: { roomCode: string; players: string[] }): Promise<void> {
    const channel = this.client.channels.cache.get(process.env.BONDING_CHANNEL_ID || '');
    if (!channel || !channel.isTextBased()) return;

    const textChannel = channel as TextChannel | NewsChannel | ThreadChannel;
    const embed = new EmbedBuilder()
      .setTitle('🎮 Match Started!')
      .setDescription(`Room **${data.roomCode}** is now live!`)
      .addFields({ name: 'Players', value: data.players?.join(', ') || 'Waiting for players...' })
      .setColor(COLORS.phosphorGreen)
      .setURL('https://bonding.p31ca.org')
      .setTimestamp();

    await textChannel.send({ embeds: [embed] });
  }

  /**
   * Send match end notification
   */
  private async sendMatchEndNotification(data: { roomCode: string; players: string[] }): Promise<void> {
    const channel = this.client.channels.cache.get(process.env.BONDING_CHANNEL_ID || '');
    if (!channel || !channel.isTextBased()) return;

    const textChannel = channel as TextChannel | NewsChannel | ThreadChannel;
    const embed = new EmbedBuilder()
      .setTitle('🎮 Match Ended')
      .setDescription(`Room **${data.roomCode}** has finished.`)
      .addFields({ name: 'Players', value: data.players?.join(', ') || 'N/A' })
      .setColor(COLORS.quantumCyan)
      .setTimestamp();

    await textChannel.send({ embeds: [embed] });
  }

  /**
   * Send player joined notification
   */
  private async sendPlayerJoinedNotification(data: { roomCode: string; players: string[] }): Promise<void> {
    const channel = this.client.channels.cache.get(process.env.BONDING_CHANNEL_ID || '');
    if (!channel || !channel.isTextBased()) return;

    const textChannel = channel as TextChannel | NewsChannel | ThreadChannel;
    const embed = new EmbedBuilder()
      .setTitle('👤 Player Joined')
      .setDescription(`New player in room **${data.roomCode}**`)
      .addFields({ name: 'Players', value: data.players?.join(', ') || 'N/A' })
      .setColor(COLORS.quantumViolet)
      .setTimestamp();

    await textChannel.send({ embeds: [embed] });
  }

  /**
   * Send Node One status alert
   */
  private async sendNodeOneAlert(data: { 
    deviceId: string; 
    status: string; 
    message: string;
    timestamp?: string;
    metrics?: { battery?: number; temperature?: number; signalStrength?: number };
  }): Promise<void> {
    const channel = this.client.channels.cache.get(process.env.NODE_ONE_CHANNEL_ID || '');
    if (!channel || !channel.isTextBased()) return;

    const textChannel = channel as TextChannel | NewsChannel | ThreadChannel;
    const isOffline = data.status === 'offline';
    const isError = data.status === 'error';

    const embed = new EmbedBuilder()
      .setTitle(isOffline ? '🔴 Node One Offline' : isError ? '🟠 Node One Error' : '🟢 Node One Online')
      .setDescription(data.message)
      .addFields(
        { name: 'Device ID', value: data.deviceId, inline: true }
      )
      .setColor(isOffline ? COLORS.dangerRed : isError ? COLORS.calciumAmber : COLORS.phosphorGreen)
      .setTimestamp();

    if (data.metrics) {
      const metricFields = [];
      if (data.metrics.battery !== undefined) {
        metricFields.push({ name: 'Battery', value: `${data.metrics.battery}%`, inline: true });
      }
      if (data.metrics.temperature !== undefined) {
        metricFields.push({ name: 'Temperature', value: `${data.metrics.temperature}°C`, inline: true });
      }
      if (data.metrics.signalStrength !== undefined) {
        metricFields.push({ name: 'Signal', value: `${data.metrics.signalStrength} dBm`, inline: true });
      }
      if (metricFields.length > 0) {
        embed.addFields(...metricFields);
      }
    }

    await textChannel.send({ embeds: [embed] });
  }

  /**
   * Send Ko-fi purchase notification
   */
  private async sendKofiNotification(data: { supporter: string; amount: string; tier: string }): Promise<void> {
    const channel = this.client.channels.cache.get(process.env.ANNOUNCEMENTS_CHANNEL_ID || '');
    if (!channel || !channel.isTextBased()) return;

    const textChannel = channel as TextChannel | NewsChannel | ThreadChannel;
    const embed = new EmbedBuilder()
      .setTitle('💚 Network Expanded!')
      .setDescription(`**${data.supporter}** just provided support!`)
      .addFields(
        { name: 'Tier', value: data.tier, inline: true },
        { name: 'Amount', value: data.amount, inline: true }
      )
      .setColor(COLORS.phosphorGreen)
      .setURL('https://ko-fi.com/trimtab69420')
      .setTimestamp();

    await textChannel.send({ embeds: [embed] });
  }

  /**
   * Handle telemetry events
   */
  private async handleTelemetryEvent(data: { event: string; data: Record<string, unknown> }): Promise<void> {
    console.log('[TELEMETRY EVENT]', data.event, data.data);
  }

  /**
   * Start the bot
   */
  public start(): void {
    const token = process.env.DISCORD_TOKEN;
    if (!token) {
      console.error('❌ DISCORD_TOKEN not set in environment');
      console.error('   Please set DISCORD_TOKEN in your .env file');
      process.exit(1);
    }

    this.client.login(token);
  }
}

// Initialize and start the bot
const bot = new P31Bot();
bot.start();
