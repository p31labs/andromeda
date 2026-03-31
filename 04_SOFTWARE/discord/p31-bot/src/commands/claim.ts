import { EmbedBuilder, Role } from 'discord.js';
import { CommandContext, P31Command } from './base';
import { eggTracker, ALL_EGGS, FOUNDING_SLOTS } from '../services/eggTracker';
import * as spoonLedger from '../services/spoonLedger';
import type { EggId } from '../services/eggTracker';

const VALID_EGGS: EggId[] = ALL_EGGS;

const EGG_DESCRIPTIONS: Record<EggId, { title: string; emoji: string; found: string }> = {
  bashium: {
    emoji: '🟣',
    title: 'Bashium Element',
    found: 'You discovered Bashium in the Genesis quest!',
  },
  willium: {
    emoji: '🟢',
    title: 'Willium Element',
    found: 'You discovered Willium in the Kitchen quest!',
  },
  missing_node: {
    emoji: '🔊',
    title: 'The Missing Node (172.35 Hz)',
    found: 'You found the 172.35 Hz tone at p31ca.org/#collider!',
  },
  tetrahedron: {
    emoji: '🧱',
    title: 'The First Tetrahedron',
    found: 'You built a K₄ (4 atoms, 6 bonds) in BONDING!',
  },
};

const SPOONS_PER_EGG = 39;

export class ClaimCommand implements P31Command {
  name = 'claim';
  description = 'Claim an egg you found in the Quantum Egg Hunt';
  aliases = ['found', 'discovered'];
  usage = 'claim <egg>';

  async execute(context: CommandContext): Promise<void> {
    const { message } = context;
    const args = context.args.join(' ').toLowerCase().trim();
    const userId = message.author.id;

    if (!args) {
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle('🔺 Claim Your Egg')
        .setDescription(
          'Claim an egg you found in the Quantum Egg Hunt.\n\n' +
          '**Usage:** `p31 claim <egg>`\n\n' +
          '**Available eggs:**\n' +
          ALL_EGGS.map(id => `• ${EGG_DESCRIPTIONS[id].emoji} \`${id}\``).join('\n') +
          '\n\n**Example:** `p31 claim bashium`'
        )
        .setFooter({ text: 'Screenshot your discovery in #🎉-showcase for verification.' });
      await message.reply({ embeds: [embed] });
      return;
    }

    // Map shorthand to full egg ID
    const eggId = this.resolveEgg(args);
    if (!eggId) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('❌ Unknown Egg')
        .setDescription(
          `**"${args}"** is not a valid egg.\n\n` +
          '**Available eggs:**\n' +
          ALL_EGGS.map(id => `• \`${id}\` — ${EGG_DESCRIPTIONS[id].title}`).join('\n')
        );
      await message.reply({ embeds: [embed] });
      return;
    }

    const meta = EGG_DESCRIPTIONS[eggId];
    const alreadyFound = !eggTracker.recordDiscovery(userId, eggId);

    if (alreadyFound) {
      const userProgress = eggTracker.getUserProgress(userId);
      const embed = new EmbedBuilder()
        .setColor(0x6b7280)
        .setTitle(`${meta.emoji} Already Claimed`)
        .setDescription(
          `**${meta.title}** was already claimed by you.\n` +
          `Your progress: ${userProgress.length}/${ALL_EGGS.length} eggs`
        );
      await message.reply({ embeds: [embed] });
      return;
    }

    const newBalance = spoonLedger.award(userId, SPOONS_PER_EGG);
    const updatedProgress = eggTracker.getUserProgress(userId);
    const allComplete = eggTracker.hasCompletedAll(userId);

    let foundingSlot: number | null = null;
    if (allComplete) {
      foundingSlot = eggTracker.claimFoundingNode(userId);
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle(`${meta.emoji} EGG CLAIMED!`)
      .setDescription(`${meta.found}\n\n🥄 **+${SPOONS_PER_EGG} spoons** awarded!\nYour new balance: **${newBalance} spoons**`)
      .addFields(
        {
          name: 'Progress',
          value: `${updatedProgress.length}/${ALL_EGGS.length} eggs found`,
          inline: true,
        },
        {
          name: 'Spoons',
          value: `${newBalance} total`,
          inline: true,
        }
      );

    if (foundingSlot !== null) {
      embed.addFields({
        name: '⬡ FOUNDING NODE CLAIMED!',
        value: `You are **Vertex #${foundingSlot}** of ${FOUNDING_SLOTS} in the first physical K₄ mesh!\n` +
               `**Node Zero hardware reserved** for you.`,
        inline: false,
      });
      embed.setColor(0x9c27b0);
      embed.setTitle(`⬡ FOUNDING NODE #${foundingSlot} — ALL 4 EGGS FOUND!`);
    }

    const remaining = ALL_EGGS.length - updatedProgress.length;
    if (remaining > 0 && !allComplete) {
      const unclaimed = ALL_EGGS
        .filter(id => !updatedProgress.includes(id))
        .map(id => `${EGG_DESCRIPTIONS[id].emoji} ${EGG_DESCRIPTIONS[id].title}`)
        .join('\n');
      embed.addFields({
        name: 'Still hunting',
        value: unclaimed,
        inline: false,
      });
    }

    embed.setFooter({ text: 'P31 Labs · 💜🔺💜 · Deadline: Easter Sunday, April 5' });
    await message.reply({ embeds: [embed] });
  }

  private resolveEgg(input: string): EggId | null {
    if (VALID_EGGS.includes(input as EggId)) return input as EggId;
    // Allow common shorthands
    const aliases: Record<string, EggId> = {
      'ba': 'bashium',
      'bash': 'bashium',
      'genesis': 'bashium',
      'wi': 'willium',
      'will': 'willium',
      'kitchen': 'willium',
      'node': 'missing_node',
      'frequency': 'missing_node',
      'hz': 'missing_node',
      '172': 'missing_node',
      '172.35': 'missing_node',
      'k4': 'tetrahedron',
      'tetra': 'tetrahedron',
      'k₄': 'tetrahedron',
      'posner': 'tetrahedron',
      'calcium': 'tetrahedron',
      'first': 'tetrahedron',
    };
    return aliases[input] ?? null;
  }
}

export default ClaimCommand;
