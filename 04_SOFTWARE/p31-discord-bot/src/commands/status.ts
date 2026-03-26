import { Message, EmbedBuilder } from 'discord.js';
import { P31Command, CommandContext } from './base';
import fetch, { FetchError } from 'node-fetch';

const COLORS = {
  phosphorGreen: 0x00FF88,
  dangerRed: 0xEF4444,
  calciumAmber: 0xF59E0B
};

/**
 * Status Command - Ping the P31 Ecosystem
 * Fetches real health data from the Edge API endpoints in parallel.
 * Outbound Automation: Queries live APIs for system status
 */
export class StatusCommand implements P31Command {
  name = 'status';
  description = 'Check the health of P31 Labs systems (Quantum Edge, BONDING, etc)';
  usage = 'status';
  aliases = ['node', 'health', 'ping', 'systems'];

  async execute(message: Message, args: string[], context: CommandContext): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle('🔺 P31 System Status')
      .setColor(COLORS.calciumAmber)
      .setDescription('Pinging Quantum Edge and P31 APIs...');

    const statusMsg = await message.reply({ embeds: [embed] });

    // Automated Parallel Health Checks - hitting live endpoints
    const timeout = parseInt(process.env.RESPONSE_TIMEOUT_MS || '5000');
    
    const [bondingHealth, nodeOneHealth, spoonHealth] = await Promise.all([
      this.pingService(`${context.bondingUrl}/health`, timeout),
      this.pingService(`${context.nodeOneUrl}/status`, timeout),
      this.pingService(`${context.spoonUrl}/health`, timeout)
    ]);

    const isAllHealthy = bondingHealth.healthy && nodeOneHealth.healthy && spoonHealth.healthy;

    const finalEmbed = new EmbedBuilder()
      .setTitle(isAllHealthy ? '🟢 P31 Systems Operational' : '⚠️ P31 Systems Degraded')
      .setColor(isAllHealthy ? COLORS.phosphorGreen : COLORS.dangerRed)
      .setDescription(
        isAllHealthy 
          ? 'All quantum nodes are online and responding.' 
          : 'One or more systems are offline. Check details below.'
      )
      .addFields(
        { 
          name: 'BONDING API', 
          value: bondingHealth.healthy 
            ? `✅ Online (${bondingHealth.ms}ms)` 
            : `❌ Offline ${bondingHealth.error ? `- ${bondingHealth.error}` : ''}`, 
          inline: true 
        },
        { 
          name: 'Quantum Edge (Node One)', 
          value: nodeOneHealth.healthy 
            ? `✅ Online (${nodeOneHealth.ms}ms)` 
            : `❌ Offline ${nodeOneHealth.error ? `- ${nodeOneHealth.error}` : ''}`, 
          inline: true 
        },
        { 
          name: 'Spoon Economy API', 
          value: spoonHealth.healthy 
            ? `✅ Online (${spoonHealth.ms}ms)` 
            : `❌ Offline ${spoonHealth.error ? `- ${spoonHealth.error}` : ''}`, 
          inline: true 
        },
        { 
          name: 'Discord Bot Latency', 
          value: `⚡ ${Date.now() - statusMsg.createdTimestamp}ms`, 
          inline: false 
        }
      )
      .setFooter({ text: 'Automated health check completed • P31 Labs' })
      .setTimestamp();

    await statusMsg.edit({ embeds: [finalEmbed] });
  }

  /**
   * Ping a service and return health status
   */
  private async pingService(url: string, timeout: number): Promise<{
    healthy: boolean;
    ms: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const res = await fetch(url, { 
        signal: controller.signal,
        headers: { 'User-Agent': 'P31-Discord-Bot/1.0' }
      });
      clearTimeout(timeoutId);
      
      const ms = Date.now() - start;
      return { 
        healthy: res.ok, 
        ms,
        error: res.ok ? undefined : `HTTP ${res.status}`
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Connection failed';
      return { 
        healthy: false, 
        ms: Date.now() - start,
        error
      };
    }
  }
}
