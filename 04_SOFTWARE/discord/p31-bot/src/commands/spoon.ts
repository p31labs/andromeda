import { Message, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { CommandContext, P31Command, getApiUrls, getTimeout } from './base';

interface SpoonData {
  spoons: number;
  maxSpoons: number;
  love: number;
  lastUpdated: string;
}

export class SpoonCommand implements P31Command {
  name = 'spoon';
  description = 'Track spoons and LOVE in the P31 economy';
  aliases = ['spoons', 'love', 'economy'];
  usage = 'spoon [user]';

  async execute(context: CommandContext): Promise<void> {
    const { message, args, apiUrls, timeout } = context;
    const apiUrl = apiUrls.spoon;
    const maxDisplay = parseInt(process.env.MAX_SPOON_DISPLAY || '12', 10);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(apiUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json() as SpoonData;

      const spoonsBar = this.createBar(data.spoons, data.maxSpoons, maxDisplay);
      const loveStars = '⭐'.repeat(Math.min(Math.floor(data.love / 10), 10));

      const embed = new EmbedBuilder()
        .setTitle(' Spoon Economy')
        .setColor(0x00FF88)
        .addFields(
          { name: 'Spoons', value: spoonsBar, inline: true },
          { name: 'LOVE', value: `${data.love} ${loveStars}`, inline: true },
          { name: 'Updated', value: new Date(data.lastUpdated).toLocaleString(), inline: true }
        )
        .setFooter({ text: '🔺 P31 Labs • Spoon Theory + LOVE Economy' });

      await message.reply({ embeds: [embed] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Spoon command error:', errorMessage);

      const errorEmbed = new EmbedBuilder()
        .setTitle('⚠️ Spoon Service Unavailable')
        .setColor(0xEF4444)
        .setDescription(`Could not fetch spoon data: ${errorMessage}`)
        .addFields(
          { name: 'API URL', value: apiUrl, inline: false },
          { name: 'Troubleshooting', value: 'Check that SPOON_API_URL is configured correctly', inline: false }
        );

      await message.reply({ embeds: [errorEmbed] });
    }
  }

  private createBar(current: number, max: number, displayLength: number): string {
    const percentage = Math.min(current / max, 1);
    const filledLength = Math.round(percentage * displayLength);
    const emptyLength = displayLength - filledLength;

    const filled = '█'.repeat(Math.max(filledLength, 1));
    const empty = '░'.repeat(Math.max(emptyLength, 1));

    return `${filled}${empty} ${current}/${max}`;
  }
}

export default SpoonCommand;