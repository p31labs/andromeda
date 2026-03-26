import { Message, EmbedBuilder } from 'discord.js';
import { P31Command, CommandContext, BaseCommand } from './base';

/**
 * Help Command - Shows available commands and usage
 */
export class HelpCommand implements P31Command {
  name = 'help';
  description = 'Show help and available commands';
  usage = 'help [command]';
  aliases = ['h', '?', 'commands'];

  private commands: Map<string, P31Command>;

  constructor(commands: Map<string, P31Command>) {
    this.commands = commands;
  }

  async execute(message: Message, args: string[], context: CommandContext): Promise<void> {
    const commandName = args[0]?.toLowerCase();

    if (commandName) {
      // Show help for specific command
      await this.showCommandHelp(message, commandName, context);
    } else {
      // Show general help
      await this.showGeneralHelp(message, context);
    }
  }

  /**
   * Show help for specific command
   */
  private async showCommandHelp(message: Message, commandName: string, context: CommandContext): Promise<void> {
    const command = this.commands.get(commandName);
    
    if (!command) {
      const embed = new EmbedBuilder()
        .setTitle('❓ Unknown Command')
        .setDescription(`Command \`${commandName}\` not found. Use \`${context.prefix} help\` for all commands.`)
        .setColor(BaseCommand.COLORS.dangerRed);
      
      await message.reply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📖 ${context.prefix} ${command.name}`)
      .setDescription(command.description)
      .setColor(BaseCommand.COLORS.quantumCyan)
      .addFields(
        { name: 'Usage', value: `\`${context.prefix} ${command.usage}\``, inline: false }
      );

    if (command.aliases.length > 0) {
      embed.addFields({ 
        name: 'Aliases', 
        value: command.aliases.map(a => `\`${a}\``).join(', '), 
        inline: false 
      });
    }

    await message.reply({ embeds: [embed] });
  }

  /**
   * Show general help with all commands
   */
  private async showGeneralHelp(message: Message, context: CommandContext): Promise<void> {
    const commandList = Array.from(this.commands.values())
      .filter(cmd => !cmd.aliases.includes(cmd.name)) // Show only primary commands
      .map(cmd => `\`${cmd.name}\` - ${cmd.description}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🔺 P31 Labs Bot Help')
      .setDescription('Cognitive accessibility bot with spoon economy, Fawn detection, and P31 ecosystem integration.')
      .setColor(BaseCommand.COLORS.phosphorGreen)
      .addFields(
        { name: 'Available Commands', value: commandList, inline: false },
        { name: 'Quick Start', value: `Use \`${context.prefix} help <command>\` for detailed help.`, inline: false },
        { name: 'About', value: 'P31 Labs: Open-source assistive technology for neurodivergent individuals.', inline: false }
      )
      .setURL('https://phosphorus31.org')
      .setFooter({ text: 'P31 Labs • It\'s okay to be a little wonky. 🔺' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}
