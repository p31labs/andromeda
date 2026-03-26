import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { P31Command, CommandContext } from './base';
import fetch from 'node-fetch';

const COLORS = {
  phosphorGreen: 0x00FF88,
  quantumCyan: 0x00D4FF,
  quantumViolet: 0x7A27FF,
  calciumAmber: 0xF59E0B,
  dangerRed: 0xEF4444
};

/**
 * Bonding Command - Interface with BONDING game
 * Outbound Automation: Fetch game state, quests, and player data
 * Inbound Automation: Via WebhookHandler for match notifications
 */
export class BondingCommand implements P31Command {
  name = 'bonding';
  description = 'Access the BONDING molecule-building game';
  usage = 'bonding [status|quest|join|help] [code]';
  aliases = ['bond', 'game', 'molecule', 'play'];

  async execute(message: Message, args: string[], context: CommandContext): Promise<void> {
    const action = args[0]?.toLowerCase() || 'help';
    const param = args[1];

    switch (action) {
      case 'status':
      case 'state':
        await this.showGameStatus(message, context);
        break;
      case 'quest':
      case 'quests':
        await this.showQuests(message, context);
        break;
      case 'join':
      case 'room':
        await this.joinRoom(message, param, context);
        break;
      case 'leaderboard':
      case 'top':
        await this.showLeaderboard(message, context);
        break;
      case 'help':
      case 'info':
      default:
        await this.showHelp(message, context);
    }
  }

  /**
   * Show current game status for user
   */
  private async showGameStatus(message: Message, context: CommandContext): Promise<void> {
    try {
      const res = await fetch(`${context.bondingUrl}/player/${message.author.id}`, {
        headers: { 'User-Agent': 'P31-Discord-Bot/1.0' }
      });

      let playerData: {
        level?: string;
        score?: number;
        moleculesBuilt?: number;
        questsCompleted?: number;
      } = {};

      if (res.ok) {
        playerData = await res.json() as typeof playerData;
      }

      const embed = new EmbedBuilder()
        .setTitle('🎮 BONDING Game Status')
        .setDescription(`<@${message.author.id}>'s progress`)
        .setColor(COLORS.quantumCyan)
        .addFields(
          { name: 'Difficulty', value: playerData.level || 'Seed 🌱', inline: true },
          { name: 'Score', value: `${playerData.score || 0}`, inline: true },
          { name: 'Molecules Built', value: `${playerData.moleculesBuilt || 0}`, inline: true },
          { name: 'Quests Completed', value: `${playerData.questsCompleted || 0}`, inline: true }
        )
        .setFooter({ text: 'P31 Labs • BONDING' })
        .setTimestamp();

      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Play BONDING')
            .setURL('https://bonding.p31ca.org')
            .setStyle(ButtonStyle.Link)
        );

      await message.reply({ embeds: [embed], components: [row] });
    } catch (err) {
      await message.reply({
        embeds: [
          this.createErrorEmbed('Connection Error', 'Could not reach BONDING API. Play directly at https://bonding.p31ca.org')
        ]
      });
    }
  }

  /**
   * Show available quests
   */
  private async showQuests(message: Message, context: CommandContext): Promise<void> {
    try {
      const res = await fetch(`${context.bondingUrl}/quests/${message.author.id}`, {
        headers: { 'User-Agent': 'P31-Discord-Bot/1.0' }
      });

      let quests: { name: string; description: string; completed: boolean }[] = [];
      
      if (res.ok) {
        quests = await res.json() as typeof quests;
      } else {
        // Default quests when API unavailable
        quests = [
          { name: 'Genesis', description: 'Build your first molecule', completed: false },
          { name: 'Kitchen', description: 'Discover the elements', completed: false },
          { name: 'Posner', description: 'Master the calcium cage', completed: false }
        ];
      }

      const questList = quests.map(q => 
        `${q.completed ? '✅' : '⬜'} **${q.name}** - ${q.description}`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('📜 BONDING Quests')
        .setDescription(questList)
        .setColor(COLORS.quantumViolet)
        .setFooter({ text: 'P31 Labs • BONDING' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply({
        embeds: [
          this.createErrorEmbed('API Error', 'Could not fetch quests. Try again later.')
        ]
      });
    }
  }

  /**
   * Join a multiplayer room
   */
  private async joinRoom(message: Message, roomCode: string | undefined, context: CommandContext): Promise<void> {
    if (!roomCode) {
      await message.reply({
        embeds: [
          this.createErrorEmbed('Missing Room Code', 'Usage: `p31 bonding join ABC123`')
        ]
      });
      return;
    }

    try {
      const res = await fetch(`${context.bondingUrl}/room/${roomCode}/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'P31-Discord-Bot/1.0'
        },
        body: JSON.stringify({ userId: message.author.id })
      });

      if (res.ok) {
        const embed = new EmbedBuilder()
          .setTitle('🎮 Room Joined!')
          .setDescription(`You've joined room **${roomCode}**`)
          .setColor(COLORS.phosphorGreen)
          .addFields({ name: 'Play', value: 'Head to BONDING to start building!' })
          .setURL('https://bonding.p31ca.org');

        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Play Now')
              .setURL('https://bonding.p31ca.org')
              .setStyle(ButtonStyle.Link)
          );

        await message.reply({ embeds: [embed], components: [row] });
      } else {
        await message.reply({
          embeds: [
            this.createErrorEmbed('Room Not Found', `Room **${roomCode}** doesn't exist or is full.`)
          ]
        });
      }
    } catch {
      await message.reply({
        embeds: [
          this.createErrorEmbed('Connection Error', 'Could not join room. Try again or play directly.')
        ]
      });
    }
  }

  /**
   * Show leaderboard
   */
  private async showLeaderboard(message: Message, context: CommandContext): Promise<void> {
    try {
      const res = await fetch(`${context.bondingUrl}/leaderboard`, {
        headers: { 'User-Agent': 'P31-Discord-Bot/1.0' }
      });

      let leaderboard: { rank: number; username: string; score: number }[] = [];
      
      if (res.ok) {
        leaderboard = await res.json() as typeof leaderboard;
      } else {
        leaderboard = [
          { rank: 1, username: 'Bash', score: 1250 },
          { rank: 2, username: 'Willow', score: 980 },
          { rank: 3, username: 'TrimTab', score: 750 }
        ];
      }

      const leaderboardText = leaderboard.slice(0, 10).map(entry => 
        `**${entry.rank}.** ${entry.username} — ${entry.score}`
      ).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🏆 BONDING Leaderboard')
        .setDescription(leaderboardText)
        .setColor(COLORS.calciumAmber)
        .setFooter({ text: 'P31 Labs • BONDING' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply({
        embeds: [
          this.createErrorEmbed('API Error', 'Could not fetch leaderboard.')
        ]
      });
    }
  }

  /**
   * Show help/information
   */
  private async showHelp(message: Message, context: CommandContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🎮 BONDING - Molecule Building Game')
      .setDescription(
        'Build molecules, complete quests, and earn LOVE in this cognitive accessibility game.'
      )
      .setColor(COLORS.phosphorGreen)
      .addFields(
        { name: 'Commands', value: '`p31 bonding status` - Your game progress\n`p31 bonding quests` - Available quests\n`p31 bonding join <code>` - Join a room\n`p31 bonding leaderboard` - Top players', inline: false },
        { name: 'How to Play', value: 'Build molecules by connecting atoms. Complete quests to unlock new elements and earn LOVE.', inline: false },
        { name: 'Difficulty Modes', value: '🌱 Seed (beginner) — H, O\n🌿 Sprout (intermediate) — H, C, N, O\n🌳 Sapling (advanced) — Full periodic table', inline: false }
      )
      .setURL('https://bonding.p31ca.org')
      .setFooter({ text: 'P31 Labs • It\'s okay to be a little wonky. 🔺' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Play BONDING')
          .setURL('https://bonding.p31ca.org')
          .setStyle(ButtonStyle.Link)
      );

    await message.reply({ embeds: [embed], components: [row] });
  }

  /**
   * Create error embed
   */
  private createErrorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(COLORS.dangerRed);
  }
}
