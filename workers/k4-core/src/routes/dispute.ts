import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'dispute', timestamp: Date.now() }));

app.post('/claim', async (c) => {
  return c.json({ ok: true, note: 'Dispute claim — implementation pending' }, 501);
});

export default app;
