import type { CommandContext, P31Command } from './base';

const grants = [
  { name: 'Pollination', amount: '$500', status: 'Submitted March 10', due: 'Rolling' },
  { name: 'Awesome Foundation', amount: '$1,000', status: 'Submitted March 10', due: 'Rolling' },
  { name: 'Stimpunks', amount: '$3,000', status: 'Submitted April 1', due: '4-6 weeks' },
  { name: 'NDEP', amount: '$19,000', status: 'Ready to submit', due: 'TBD' },
  { name: 'Divergent Impact', amount: '$50-100K', status: 'Pitch ready', due: 'TBD' },
  { name: 'ESG', amount: '$50,000', status: 'Draft ready', due: 'May 8, 2026' },
  { name: 'Georgia Rehoused', amount: '$25,000', status: 'Draft ready', due: 'TBD' },
  { name: 'Microsoft AI Accessibility', amount: '$75,000', status: 'Draft ready', due: 'TBD' },
];

export class GrantsCommand implements P31Command {
  name = 'grants';
  description = 'Show P31 Labs funding pipeline status';
  aliases = ['funding', 'donations'];
  usage = 'grants';

  async execute(context: CommandContext): Promise<void> {
    const { message } = context;

    let response = '# 💰 P31 Labs Funding Pipeline\n\n';
    
    for (const grant of grants) {
      response += `**${grant.name}** (${grant.amount})\n`;
      response += `  Status: ${grant.status}\n`;
      response += `  Due: ${grant.due}\n\n`;
    }

    response += '---\n';
    response += 'Total pending: $150,000+ in grant applications\n';
    response += 'See docs/funding_tracker.md for full details';

    await message.reply(`\`\`\`markdown\n${response}\n\`\`\``);
  }
}
