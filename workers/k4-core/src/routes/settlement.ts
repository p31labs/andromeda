import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'settlement', timestamp: Date.now() }));

app.post('/create', async (c) => {
  return c.json({ ok: true, note: 'Settlement creation — implementation pending' }, 501);
});

app.post('/join', async (c) => {
  return c.json({ ok: true, note: 'Settlement join — implementation pending' }, 501);
});

export default app;
