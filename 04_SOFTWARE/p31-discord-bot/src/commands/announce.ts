import { Message, EmbedBuilder } from 'discord.js';
import { P31Command, CommandContext } from './base';

const COLORS = {
  phosphorGreen: 0x00FF88,
  quantumCyan: 0x00D4FF,
  quantumViolet: 0x7A27FF,
  calciumAmber: 0xF59E0B
};

export class AnnounceCommand implements P31Command {
  name = 'announce';
  description = 'Post a sovereignty announcement to the announcements channel';
  usage = 'announce <message>';
  aliases = ['broadcast', 'post'];

  async execute(message: Message, args: string[], context: CommandContext): Promise<void> {
    // Only allow specific users to announce (configurable via env)
    const allowedUsers = (process.env.ANNOUNCE_ALLOWED_USERS || '').split(',');
    if (allowedUsers.length > 0 && !allowedUsers.includes(message.author.id)) {
      await message.reply({ content: '⛔ You are not authorized to post announcements.' });
      return;
    }

    const announceText = args.join(' ');
    if (!announceText) {
      await message.reply({ content: 'Please provide an announcement message. Usage: `p31 announce <message>`' });
      return;
    }

    // Get the announcements channel
    const channel = message.guild?.channels.cache.get(process.env.ANNOUNCEMENTS_CHANNEL_ID || '');
    
    if (!channel?.isTextBased()) {
      await message.reply({ content: '⚠️ Announcements channel not configured. Set ANNOUNCEMENTS_CHANNEL_ID in .env' });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔺 THE MESH IS LIVE: THE SOVEREIGN STACK HAS ARRIVED')
      .setDescription(announceText)
      .setColor(COLORS.phosphorGreen)
      .setFooter({ text: 'P31 Labs | The Delta is rigid. The mesh holds. 🔺' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await message.reply({ content: '✅ Announcement posted to the announcements channel!' });
  }
}
