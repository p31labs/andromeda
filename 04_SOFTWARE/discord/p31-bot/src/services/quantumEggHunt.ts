/**
 * Quantum Egg Hunt Service
 * 
 * Monitors the #🎉-showcase channel for screenshots containing:
 * - Bashium (Ba)
 * - Willium (Wi)  
 * - Posner molecule (Ca9(PO4)6)
 * - 39 atoms
 * 
 * Automatically awards 39 Spoons and grants "Creator" role upon verification.
 */

import { Message, GuildMember, EmbedBuilder } from 'discord.js';
import * as spoonLedger from './spoonLedger';

interface QuantumEggConfig {
  targetChannelId: string;
  rewardSpoons: number;
  rewardRole: string;
  keywordTriggers: string[];
  attachmentTypes: string[];
}

interface QuantumEggResult {
  detected: boolean;
  trigger: string | null;
  reward: number;
}

// Default configuration
const DEFAULT_CONFIG: QuantumEggConfig = {
  targetChannelId: process.env.SHOWCASE_CHANNEL_ID || '',
  rewardSpoons: 39, // The Posner number
  rewardRole: '[⚛️] Creator',
  keywordTriggers: [
    'Bashium',
    'Willium', 
    'Posner',
    'Ca9(PO4)6',
    'Ca₉(PO₄)₆',
    '39 atoms'
  ],
  attachmentTypes: ['image/png', 'image/jpeg', 'image/webp']
};

export class QuantumEggHunt {
  private config: QuantumEggConfig;
  private client: any;
  private isEnabled: boolean;

  constructor(config: Partial<QuantumEggConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isEnabled = !!this.config.targetChannelId;
  }

  /**
   * Set the Discord client reference
   */
  setClient(client: any): void {
    this.client = client;
  }

  /**
   * Check if the Quantum Egg Hunt is enabled
   */
  isActive(): boolean {
    return this.isEnabled;
  }

  /**
   * Analyze a message for Quantum Egg triggers
   */
  analyzeMessage(message: Message): QuantumEggResult {
    if (!this.isActive()) {
      return { detected: false, trigger: null, reward: 0 };
    }

    const content = message.content.toLowerCase();
    const hasAttachment = message.attachments.size > 0;
    
    // Must have both an attachment AND a keyword trigger
    if (!hasAttachment) {
      return { detected: false, trigger: null, reward: 0 };
    }

    // Check for keyword triggers
    for (const keyword of this.config.keywordTriggers) {
      if (content.includes(keyword.toLowerCase())) {
        return {
          detected: true,
          trigger: keyword,
          reward: this.config.rewardSpoons
        };
      }
    }

    // Also trigger on "Posner" in attachment name
    for (const attachment of message.attachments.values()) {
      if (attachment.name && /posner|bashium|willium/i.test(attachment.name)) {
        return {
          detected: true,
          trigger: 'attachment_name',
          reward: this.config.rewardSpoons
        };
      }
    }

    return { detected: false, trigger: null, reward: 0 };
  }

  /**
   * Process a verified Quantum Egg discovery
   */
  async processDiscovery(message: Message): Promise<void> {
    if (!this.isActive()) return;

    const result = this.analyzeMessage(message);
    if (!result.detected) return;

    const member = message.member;
    if (!member || !(member instanceof GuildMember)) return;

    try {
      const newBalance = this.awardSpoons(member, result.reward);

      await this.grantCreatorRole(member);
      await this.sendConfirmationEmbed(message, result, newBalance);
      
      console.log(`[QuantumEggHunt] Processed discovery for ${member.user.tag}: ${result.trigger}`);
    } catch (error) {
      console.error('[QuantumEggHunt] Error processing discovery:', error);
    }
  }

  /**
   * Award spoons to a member via the local ledger.
   * Returns the member's new balance.
   */
  private awardSpoons(member: GuildMember, amount: number): number {
    const newBalance = spoonLedger.award(member.id, amount);
    console.log(`[QuantumEggHunt] Awarded ${amount} spoons to ${member.user.tag} — balance: ${newBalance}`);
    return newBalance;
  }

  /**
   * Grant the Creator role to a member
   */
  private async grantCreatorRole(member: GuildMember): Promise<void> {
    const role = member.guild.roles.cache.find(r => r.name === this.config.rewardRole);
    
    if (!role) {
      console.warn(`[QuantumEggHunt] Role "${this.config.rewardRole}" not found in guild`);
      return;
    }

    try {
      await member.roles.add(role);
      console.log(`[QuantumEggHunt] Granted ${this.config.rewardRole} role to ${member.user.tag}`);
    } catch (error) {
      console.error('[QuantumEggHunt] Error granting role:', error);
    }
  }

  /**
   * Send confirmation embed to the showcase channel
   */
  private async sendConfirmationEmbed(message: Message, result: QuantumEggResult, newBalance: number): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('🔺 GEOMETRY VERIFIED: THE POSNER NODE')
      .setDescription('You have successfully synthesized the minimum enclosing structure. The floating neutral is bypassed.')
      .addFields(
        {
          name: 'Reward',
          value: `+${result.reward} Spoons — balance now **${newBalance}** (Posner number: 39 atoms).`
        },
        {
          name: 'Status',
          value: `You have been granted the **${this.config.rewardRole}** role.`
        }
      )
      .setFooter({ text: 'As above, so below. The mesh holds. 💜🔺💜' });

    await message.reply({ embeds: [embed] });
  }

  /**
   * Handle hidden command !quantum-egg or !863
   */
  async handleHiddenCommand(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor(0x00D4FF) // Quantum Cyan
      .setTitle('🔻 QUANTUM EGG HUNT ACTIVE')
      .setDescription('The system is shifting to a Delta topology.')
      .addFields(
        {
          name: 'The Hunt',
          value: 'There are 4 geometric, chemical, and acoustic anomalies hidden in the P31 ecosystem.'
        },
        {
          name: 'How to Participate',
          value: '• Complete the full BONDING quest chain to unlock Bashium & Willium\n• Visit p31ca.org/#collider to find the 172.35 Hz tone\n• Build a perfect K4 tetrahedron in the game\n• Share your screenshots in #🎉-showcase'
        },
        {
          name: 'The Stakes',
          value: 'Reach 39 nodes (the Posner number) before Eviction Friday (April 4).'
        }
      )
      .setFooter({ text: 'The geometry is invariant. Only the medium changes. 💜🔺💜' });

    await message.reply({ embeds: [embed] });
  }
}

export default QuantumEggHunt;