import { Message, EmbedBuilder } from "discord.js";
import { CommandContext, P31Command } from "./base";
import { gatherDigestData, buildDigestEmbed } from "../services/digestFormatter";

export class DigestCommand implements P31Command {
  name = "digest";
  description = "Generate the P31 morning digest (system health, FERS, treasury)";
  aliases = ["morning", "oracle"];
  usage = "digest";

  async execute(context: CommandContext): Promise<void> {
    const { message } = context;

    await message.reply("\u{1F504} Gathering morning digest...");

    try {
      const data = await gatherDigestData();
      const embed = buildDigestEmbed(data);
      await message.reply({ embeds: [embed] });
    } catch (error) {
      const errEmbed = new EmbedBuilder()
        .setTitle("\u{1F6AB} Digest Error")
        .setColor(0xef4444)
        .setDescription("Failed to generate digest. Check service logs.")
        .setFooter({ text: "P31 Oracle" });
      await message.reply({ embeds: [errEmbed] });
    }
  }
}
