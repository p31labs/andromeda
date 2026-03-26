import { Message, EmbedBuilder } from 'discord.js';

/**
 * Command context passed to all commands
 * Contains API URLs and configuration
 */
export interface CommandContext {
  prefix: string;
  bondingUrl: string;
  nodeOneUrl: string;
  spoonUrl: string;
}

/**
 * Base interface for all P31 Commands
 */
export interface P31Command {
  name: string;
  description: string;
  usage: string;
  aliases: string[];
  execute(message: Message, args: string[], context: CommandContext): Promise<void>;
}

/**
 * Abstract base class for P31 Commands
 * Provides common functionality and color constants
 */
export abstract class BaseCommand implements P31Command {
  abstract name: string;
  abstract description: string;
  abstract usage: string;
  aliases: string[] = [];

  // P31 Brand Colors
  static readonly COLORS = {
    phosphorGreen: 0x00FF88,
    quantumCyan: 0x00D4FF,
    quantumViolet: 0x7A27FF,
    calciumAmber: 0xF59E0B,
    dangerRed: 0xEF4444,
    void: 0x050510
  };

  /**
   * Create a standard error embed
   */
  protected createErrorEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(BaseCommand.COLORS.dangerRed);
  }

  /**
   * Create a success embed
   */
  protected createSuccessEmbed(title: string, description: string, color = BaseCommand.COLORS.phosphorGreen): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color);
  }

  /**
   * Create an info embed
   */
  protected createInfoEmbed(title: string, description: string): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(BaseCommand.COLORS.quantumCyan);
  }

  abstract execute(message: Message, args: string[], context: CommandContext): Promise<void>;
}
