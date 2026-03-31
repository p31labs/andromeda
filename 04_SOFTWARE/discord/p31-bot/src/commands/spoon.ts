import { Message, EmbedBuilder } from 'discord.js';
import { CommandContext, P31Command, getApiUrls, getTimeout } from './base';
import { defaultRetryableFetch } from '../services/retryUtility';
import * as spoonLedger from '../services/spoonLedger';

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
    const maxDisplay = parseInt(process.env.MAX_SPOON_DISPLAY || '12', 10);

    // p31 spoon leaderboard
    if (args[0] === 'leaderboard' || args[0] === 'top') {
      return this.showLeaderboard(message);
    }

    // p31 spoon link <kofi_name> — merge Ko-fi spoons into caller's Discord account
    if (args[0] === 'link' && args[1]) {
      return this.linkKofi(message, args.slice(1).join(' '));
    }

    // p31 spoon @user — show a specific user's balance
    const mentionedUser = message.mentions.users.first();
    if (mentionedUser) {
      return this.showUserBalance(message, mentionedUser.id, mentionedUser.username);
    }

    // p31 spoon — show caller's own balance first, then global aggregate
    const callerBalance = spoonLedger.getBalance(message.author.id);
    const callerEntry = spoonLedger.getEntry(message.author.id);

    const embed = new EmbedBuilder()
      .setTitle('🥄 Spoon Economy')
      .setColor(0x00FF88);

    if (callerEntry) {
      embed.addFields(
        { name: 'Your Balance', value: `**${callerBalance}** spoons`, inline: true },
        { name: 'Total Earned', value: `${callerEntry.totalEarned}`, inline: true },
        { name: 'Last Updated', value: new Date(callerEntry.lastUpdated).toLocaleString(), inline: true }
      );
    } else {
      embed.setDescription('No spoons earned yet. Synthesize a Posner molecule in #showcase to earn 39.');
    }

    // Append global aggregate from remote API (best-effort)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await defaultRetryableFetch.fetchWithRetry(
        apiUrls.spoon,
        { signal: controller.signal },
        'spoon'
      );
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json() as SpoonData;
        const bar = this.createBar(data.spoons, data.maxSpoons, maxDisplay);
        embed.addFields({ name: 'Global Pool', value: bar, inline: false });
      }
    } catch {
      // remote aggregate unavailable — local data is still shown
    }

    embed.setFooter({ text: '🔺 P31 Labs • Spoon Theory + LOVE Economy' });
    await message.reply({ embeds: [embed] });
  }

  private async showUserBalance(message: Message, userId: string, username: string): Promise<void> {
    const entry = spoonLedger.getEntry(userId);
    const embed = new EmbedBuilder()
      .setTitle(`🥄 ${username}'s Spoons`)
      .setColor(0x00FF88);

    if (entry) {
      embed.addFields(
        { name: 'Balance', value: `**${entry.balance}** spoons`, inline: true },
        { name: 'Total Earned', value: `${entry.totalEarned}`, inline: true },
        { name: 'Last Updated', value: new Date(entry.lastUpdated).toLocaleString(), inline: true }
      );
    } else {
      embed.setDescription('No spoons on record for this user.');
    }
    await message.reply({ embeds: [embed] });
  }

  private async showLeaderboard(message: Message): Promise<void> {
    // Filter out unlinked external keys (kofi:, stripe:) — only Discord IDs on the board
    const all = spoonLedger.getLeaderboard(50);
    const top = all
      .filter(e => !e.userId.startsWith('kofi:') && !e.userId.startsWith('stripe:'))
      .slice(0, 10);

    const embed = new EmbedBuilder()
      .setTitle('🥄 Spoon Leaderboard')
      .setColor(0x00FF88)
      .setFooter({ text: `Total distributed: ${spoonLedger.getGlobalTotal()} spoons` });

    if (top.length === 0) {
      embed.setDescription('No spoons distributed yet. Synthesize a molecule or support on Ko-fi to earn some.');
    } else {
      const rows = top.map((e, i) => `${i + 1}. <@${e.userId}> — **${e.balance}** (${e.totalEarned} earned)`);
      embed.setDescription(rows.join('\n'));
    }
    await message.reply({ embeds: [embed] });
  }

  private async linkKofi(message: Message, kofiName: string): Promise<void> {
    const kofiKey = `kofi:${kofiName}`;
    const kofiEntry = spoonLedger.getEntry(kofiKey);

    if (!kofiEntry || kofiEntry.balance === 0) {
      await message.reply(
        `No pending Ko-fi spoons found for **${kofiName}**. ` +
        `Make sure the name matches exactly what you used on Ko-fi.`
      );
      return;
    }

    const transferred = spoonLedger.transferAll(kofiKey, message.author.id);
    const newBalance = spoonLedger.getBalance(message.author.id);

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('🥄 Ko-fi Account Linked')
      .addFields(
        { name: 'Ko-fi Name',    value: kofiName,               inline: true },
        { name: 'Transferred',   value: `+${transferred} spoons`, inline: true },
        { name: 'New Balance',   value: `${newBalance} spoons`,  inline: true },
      )
      .setFooter({ text: 'P31 Labs · Thank you for keeping the mesh alive. 💜🔺💜' });

    await message.reply({ embeds: [embed] });
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