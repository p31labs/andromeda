import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';

export interface WebhookEvent {
  type: 'kofi' | 'stripe' | 'node_one' | 'bonding' | 'github';
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface KoFiPayload {
  [key: string]: unknown;
  type: 'Donation' | 'Subscription' | 'ShopOrder';
  amount: number;
  currency: string;
  message?: string;
  supporterName?: string;
}

export interface NodeOnePayload {
  [key: string]: unknown;
  event: 'button_press' | 'haptic_feedback' | 'battery_status' | 'connection_status';
  deviceId: string;
  data: Record<string, unknown>;
}

export interface BondingPayload {
  [key: string]: unknown;
  event: 'game_start' | 'game_end' | 'molecule_created' | 'quest_complete' | 'love_earned';
  roomCode: string;
  userId: string;
  data: Record<string, unknown>;
}

class WebhookHandler extends EventEmitter {
  private _app: express.Application;
  public get app(): express.Application { return this._app; }
  private port: number;

  constructor(port: number = 3000) {
    super();
    // Port can be overridden via PORT env var at runtime
    const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : NaN;
    this.port = Number.isFinite(envPort) ? envPort : port;
    this._app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this._app.use(cors());
    this._app.use(express.json());
    this._app.use(express.urlencoded({ extended: true }));
  }

  private setupRoutes(): void {
    // Ko-fi webhook endpoint
    this._app.post('/webhook/kofi', (req: Request, res: Response) => {
      try {
        // Ko-fi sends application/x-www-form-urlencoded with a nested JSON string in `data`
        let payload: KoFiPayload;
        if (req.body?.data && typeof req.body.data === 'string') {
          payload = JSON.parse(req.body.data) as KoFiPayload;
        } else {
          payload = req.body as KoFiPayload;
        }

        // Verify Ko-fi token if configured
        const kofiToken = process.env.KOFI_VERIFICATION_TOKEN;
        if (kofiToken && payload.verification_token !== kofiToken) {
          console.warn('[Ko-fi] Invalid verification token — rejected');
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const event: WebhookEvent = {
          type: 'kofi',
          payload,
          timestamp: new Date().toISOString()
        };
        this.emit('kofi', event);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error processing Ko-fi webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Node One webhook endpoint
    this._app.post('/webhook/node-one', (req: Request, res: Response) => {
      try {
        const payload = req.body as NodeOnePayload;
        const event: WebhookEvent = {
          type: 'node_one',
          payload,
          timestamp: new Date().toISOString()
        };
        this.emit('node_one', event);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error processing Node One webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // BONDING webhook endpoint
    this._app.post('/webhook/bonding', (req: Request, res: Response) => {
      try {
        const payload = req.body as BondingPayload;
        const event: WebhookEvent = {
          type: 'bonding',
          payload,
          timestamp: new Date().toISOString()
        };
        this.emit('bonding', event);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error processing BONDING webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // GitHub webhook endpoint
    this._app.post('/webhook/github', (req: Request, res: Response) => {
      try {
        const githubEvent = req.headers['x-github-event'] as string;
        const event: WebhookEvent = {
          type: 'github',
          payload: { ...req.body, githubEvent },
          timestamp: new Date().toISOString()
        };
        this.emit('github', event);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error processing GitHub webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Stripe webhook endpoint
    this._app.post('/webhook/stripe', (req: Request, res: Response) => {
      try {
        const stripeEvent = req.headers['stripe-signature'] ? req.body : req.body;
        const event: WebhookEvent = {
          type: 'stripe',
          payload: stripeEvent as Record<string, unknown>,
          timestamp: new Date().toISOString(),
        };
        this.emit('stripe', event);
        res.status(200).json({ received: true });
      } catch (error) {
        console.error('Error processing Stripe webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Health check endpoint
    this._app.get('/health', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', service: 'p31-webhook-handler' });
    });

    // Error handling middleware
    this._app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this._app.listen(this.port, () => {
        console.log(`Webhook handler listening on port ${this.port}`);
        resolve();
      });
    });
  }

  public on(event: 'kofi' | 'stripe' | 'node_one' | 'bonding' | 'github', listener: (event: WebhookEvent) => void): this {
    return super.on(event, listener);
  }
}

export default WebhookHandler;
export { WebhookHandler };
