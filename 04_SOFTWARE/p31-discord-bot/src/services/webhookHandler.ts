import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';

/**
 * Webhook Event Types
 */
export interface BondingMatchEvent {
  roomCode: string;
  players: string[];
  event: 'match_start' | 'match_end' | 'player_joined' | 'player_left';
}

export interface NodeOneStatusEvent {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  message: string;
  timestamp?: string;
  metrics?: {
    battery?: number;
    temperature?: number;
    signalStrength?: number;
  };
}

export interface KoFiPurchaseEvent {
  supporter: string;
  amount: string;
  tier: string;
  currency?: string;
}

/**
 * P31 Webhook Server
 * Inbound Automation: Listens for events from:
 * - Cloudflare Workers (Node One Telemetry)
 * - BONDING game multiplayer events
 * - Ko-fi donation webhooks
 * 
 * Routes events to Discord channels for real-time notifications.
 */
export class WebhookHandler extends EventEmitter {
  private app: Express;
  private port: number;

  constructor() {
    super();
    this.app = express();
    this.port = parseInt(process.env.NODE_ONE_WEBHOOK_PORT || '3000');
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[WEBHOOK] ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });
  }

  /**
   * Setup webhook routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', service: 'p31-webhook-handler' });
    });

    // BONDING Multiplayer Webhook
    // Triggered by Cloudflare Worker when match starts/ends
    this.app.post('/webhooks/bonding', (req: Request, res: Response) => {
      try {
        const { roomCode, players, event } = req.body as BondingMatchEvent;
        
        console.log(`[WEBHOOK] BONDING event: ${event}`, { roomCode, players });
        
        if (event === 'match_start') {
          this.emit('bonding-match', { roomCode, players, event });
        } else if (event === 'match_end') {
          this.emit('bonding-match-end', { roomCode, players, event });
        } else if (event === 'player_joined') {
          this.emit('bonding-player-joined', { roomCode, players, event });
        }
        
        res.status(200).json({ success: true, event });
      } catch (err) {
        console.error('[WEBHOOK] BONDING parse error:', err);
        res.status(400).json({ error: 'Invalid payload' });
      }
    });

    // Node One Telemetry Webhook
    // Triggered by Quantum Edge Cloudflare Worker when edge hardware status changes
    this.app.post('/webhooks/node-one', (req: Request, res: Response) => {
      try {
        const { deviceId, status, message, timestamp, metrics } = req.body as NodeOneStatusEvent;
        
        console.log(`[WEBHOOK] Node One ${status}: ${deviceId}`, { message });
        
        // Validate required fields
        if (!deviceId || !status) {
          res.status(400).json({ error: 'Missing deviceId or status' });
          return;
        }

        if (status === 'offline' || status === 'online' || status === 'error') {
          this.emit('node-one-status', { 
            deviceId, 
            status, 
            message: message || `Node ${deviceId} is now ${status}`,
            timestamp: timestamp || new Date().toISOString(),
            metrics
          });
        }
        
        res.status(200).json({ success: true, status });
      } catch (err) {
        console.error('[WEBHOOK] Node One parse error:', err);
        res.status(400).json({ error: 'Invalid payload' });
      }
    });

    // Ko-fi Donation Webhook
    // Triggered by Ko-fi when someone makes a purchase/donation
    this.app.post('/webhooks/kofi', (req: Request, res: Response) => {
      try {
        // Ko-fi sends data in different formats depending on integration
        let data: Record<string, unknown>;
        
        if (typeof req.body.data === 'string') {
          data = JSON.parse(req.body.data);
        } else {
          data = req.body;
        }

        console.log('[WEBHOOK] Ko-fi event:', data);
        
        // Only process public events (actual purchases, not test hooks)
        if (data && typeof data === 'object' && 'is_public' in data) {
          const koFiData = data as Record<string, unknown>;
          if (koFiData.is_public) {
            this.emit('kofi-purchase', {
              supporter: (koFiData.from_name as string) || 'Anonymous',
              amount: `${koFiData.amount} ${koFiData.currency || 'USD'}`,
              tier: (koFiData.tier_name as string) || 'Network Expansion',
              currency: koFiData.currency as string | undefined
            });
          }
        }
        
        res.status(200).json({ success: true });
      } catch (err) {
        console.error('[WEBHOOK] Ko-fi parse error:', err);
        res.status(400).json({ error: 'Bad Request' });
      }
    });

    // Generic telemetry webhook for custom events
    this.app.post('/webhooks/telemetry', (req: Request, res: Response) => {
      try {
        const { event, data } = req.body;
        
        console.log(`[WEBHOOK] Telemetry: ${event}`, data);
        this.emit('telemetry', { event, data, timestamp: new Date().toISOString() });
        
        res.status(200).json({ success: true });
      } catch (err) {
        console.error('[WEBHOOK] Telemetry parse error:', err);
        res.status(400).json({ error: 'Invalid payload' });
      }
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' });
    });

    // Error handler
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('[WEBHOOK] Server error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
  }

  /**
   * Start the webhook server
   */
  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🌐 P31 Webhook Handler listening on port ${this.port}`);
      console.log(`   - /webhooks/bonding    (BONDING game events)`);
      console.log(`   - /webhooks/node-one  (Node One hardware status)`);
      console.log(`   - /webhooks/kofi     (Ko-fi donations)`);
      console.log(`   - /webhooks/telemetry (custom events)`);
      console.log(`   - /health            (health check)`);
    });
  }

  /**
   * Get the Express app (for testing)
   */
  public getApp(): Express {
    return this.app;
  }
}
