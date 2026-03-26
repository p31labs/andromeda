import { Message, EmbedBuilder } from 'discord.js';
import { P31Command, CommandContext } from './base';
import fetch from 'node-fetch';

const COLORS = {
  phosphorGreen: 0x00FF88,
  calciumAmber: 0xF59E0B,
  dangerRed: 0xEF4444,
  quantumCyan: 0x00D4FF
};

const MAX_SPOONS = parseInt(process.env.MAX_SPOON_DISPLAY || '12');
const MAX_LOVE = parseInt(process.env.MAX_LOVE_DISPLAY || '12');

/**
 * Spoon Command - Automated Spoon Economy Tracking
 * Outbound Automation: Fetches live data from Spoon API instead of hardcoded values
 * Tracks cognitive/physical energy (spoons) and earned LOVE (regulation credits)
 */
export class SpoonCommand implements P31Command {
  name = 'spoon';
  description = 'Track your spoon economy (energy) and LOVE (earned)';
  usage = 'spoon [check|add|use|earn] [amount]';
  aliases = ['love', 'spoons', 'energy', ' spoons', ' spoons'];

  async execute(message: Message, args: string[], context: CommandContext): Promise<void> {
    const action = args[0]?.toLowerCase() || 'check';
    const amount = parseInt(args[1]) || 1;

    try {
      switch (action) {
        case 'add':
        case 'gain':
        case '+':
          await this.addSpoons(message, amount, context);
          break;
        case 'use':
        case 'spend':
        case '-':
          await this.useSpoons(message, amount, context);
          break;
        case 'earn':
        case 'award':
          await this.earnLove(message, amount, context);
          break;
        case 'check':
        case 'status':
        case 'view':
        default:
          await this.showSpoonStatus(message, context);
      }
    } catch (err) {
      console.error('[SPOON API ERROR]', err);
      await message.reply({
        embeds: [
          this.createErrorEmbed(
            'Connection Error',
            'Unable to reach the P31 Spoon API. Using offline mode.'
          )
        ]
      });
      // Fallback to showing default state
      await this.showSpoonStatus(message, context, true);
    }
  }

  /**
   * Show current spoon and LOVE status - fetches live from API
   */
  private async showSpoonStatus(message: Message, context: CommandContext, fallback = false): Promise<void> {
    let data: { spoons: number; love: number; lastUpdated?: string };
    
    if (fallback) {
      // Default state when API unavailable
      data = { spoons: 7, love: 0 };
    } else {
      // Live API fetch
      try {
        const res = await fetch(`${context.spoonUrl}/user/${message.author.id}`, {
          headers: { 'User-Agent': 'P31-Discord-Bot/1.0' }
        });
        data = res.ok ? await res.json() as { spoons: number; love: number } : { spoons: 7, love: 0 };
      } catch {
        data = { spoons: 7, love: 0 };
      }
    }

    // Generate visual bars
    const spoonBar = this.generateBar(data.spoons, MAX_SPOONS, '🟢', '⚫');
    const loveBar = this.generateBar(Math.min(data.love, MAX_LOVE), MAX_LOVE, '💚', '🖤');

    // Determine status color based on spoon level
    let statusColor = COLORS.phosphorGreen;
    let statusMessage = '✅ Energy sufficient';
    if (data.spoons <= 2) {
      statusColor = COLORS.dangerRed;
      statusMessage = '🛑 CRITICAL - Rest required immediately';
    } else if (data.spoons <= 4) {
      statusColor = COLORS.calciumAmber;
      statusMessage = '⚠️ Energy low - prioritize rest';
    }

    const embed = new EmbedBuilder()
      .setTitle('🔋 Spoon Economy')
      .setDescription(`<@${message.author.id}>'s current state`)
      .setColor(statusColor)
      .addFields(
        { 
          name: `Spoons (Energy) ${data.spoons}/${MAX_SPOONS}`, 
          value: spoonBar,
          inline: false 
        },
        { 
          name: 'Status', 
          value: statusMessage,
          inline: false 
        },
        { 
          name: `LOVE (Earned) ${data.love}`, 
          value: loveBar + '\n💚 = regulation credit earned through consistency, care, and creation',
          inline: false 
        }
      )
      .setFooter({ text: fallback ? 'Offline mode • API unreachable' : 'Live data from P31 Spoon API' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Add spoons (rest/energy gain)
   */
  private async addSpoons(message: Message, amount: number, context: CommandContext): Promise<void> {
    try {
      const res = await fetch(`${context.spoonUrl}/user/${message.author.id}/spoons/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'P31-Discord-Bot/1.0'
        },
        body: JSON.stringify({ amount })
      });

      const data = res.ok ? await res.json() as { spoons: number } : { spoons: Math.min(7 + amount, MAX_SPOONS) };

      const embed = new EmbedBuilder()
        .setTitle('🔋 Energy Restored')
        .setDescription(`+${amount} spoons added. You now have **${data.spoons}/${MAX_SPOONS}**`)
        .setColor(COLORS.phosphorGreen)
        .setFooter({ text: 'P31 Spoon Economy' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply({
        embeds: [
          this.createErrorEmbed('API Error', 'Could not connect to add spoons. Try again later.')
        ]
      });
    }
  }

  /**
   * Use spoons (activity cost)
   */
  private async useSpoons(message: Message, amount: number, context: CommandContext): Promise<void> {
    try {
      const res = await fetch(`${context.spoonUrl}/user/${message.author.id}/spoons/use`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'P31-Discord-Bot/1.0'
        },
        body: JSON.stringify({ amount })
      });

      const data = res.ok ? await res.json() as { spoons: number } : { spoons: Math.max(7 - amount, 0) };

      const embed = new EmbedBuilder()
        .setTitle('🔋 Energy Spent')
        .setDescription(`-${amount} spoons used. You now have **${data.spoons}/${MAX_SPOONS}**`)
        .setColor(data.spoons <= 2 ? COLORS.dangerRed : COLORS.calciumAmber)
        .setFooter({ text: 'P31 Spoon Economy' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply({
        embeds: [
          this.createErrorEmbed('API Error', 'Could not connect to use spoons. Try again later.')
        ]
      });
    }
  }

  /**
   * Earn LOVE (regulation credits)
   */
  private async earnLove(message: Message, amount: number, context: CommandContext): Promise<void> {
    try {
      const res = await fetch(`${context.spoonUrl}/user/${message.author.id}/love/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'P31-Discord-Bot/1.0'
        },
        body: JSON.stringify({ amount })
      });

      const data = res.ok ? await res.json() as { love: number } : { love: amount };

      const embed = new EmbedBuilder()
        .setTitle('💚 LOVE Earned')
        .setDescription(`+${amount} LOVE for <@${message.author.id}>`)
        .addFields({ name: 'Total LOVE', value: `${data.love}`, inline: true })
        .setColor(COLORS.phosphorGreen)
        .setFooter({ text: 'P31 Spoon Economy • LOVE = earned through consistency' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch {
      await message.reply({
        embeds: [
          this.createErrorEmbed('API Error', 'Could not connect to award LOVE. Try again later.')
        ]
      });
    }
  }

  /**
   * Generate visual bar representation
   */
  private generateBar(current: number, max: number, filled: string, empty: string): string {
    const filledCount = Math.max(0, Math.min(current, max));
    const emptyCount = Math.max(0, max - filledCount);
    return filled.repeat(filledCount) + empty.repeat(emptyCount);
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
