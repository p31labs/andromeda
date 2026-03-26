import fetch from 'node-fetch';

/**
 * Telemetry Event Data
 */
export interface TelemetryEvent {
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Telemetry Service
 * Sends anonymized bot usage statistics to the P31 telemetry server.
 * Uses node-fetch for HTTP requests (Discord.js compatible).
 */
export class TelemetryService {
  private url: string | undefined;
  private enabled: boolean;

  constructor() {
    this.url = process.env.TELEMETRY_API_URL;
    this.enabled = process.env.ENABLE_TELEMETRY === 'true' && !!this.url;
  }

  /**
   * Track an event
   * @param event Event name
   * @param data Additional event data
   */
  public async track(event: string, data: Record<string, unknown> = {}): Promise<void> {
    if (!this.enabled || !this.url) {
      return;
    }
    
    try {
      const payload: TelemetryEvent = {
        event,
        timestamp: new Date().toISOString(),
        ...data
      };

      const response = await fetch(`${this.url}/events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'P31-Discord-Bot/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.warn(`[TELEMETRY] Failed to send ${event}: ${response.status}`);
      }
    } catch (err) {
      // Fail silently to prevent bot crashes from telemetry issues
      console.warn(`[TELEMETRY] Error sending ${event}:`, err instanceof Error ? err.message : 'Unknown error');
    }
  }

  /**
   * Track a command execution
   */
  public async trackCommand(commandName: string, userId: string, success: boolean): Promise<void> {
    await this.track('command_executed', {
      command: commandName,
      user: userId,
      success
    });
  }

  /**
   * Track a webhook event received
   */
  public async trackWebhook(webhookType: string, data: Record<string, unknown>): Promise<void> {
    await this.track('webhook_received', {
      type: webhookType,
      ...data
    });
  }

  /**
   * Track bot startup
   */
  public async trackStartup(): Promise<void> {
    await this.track('bot_startup', {
      version: process.env.BOT_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Check if telemetry is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
}
