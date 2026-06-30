import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'passport', timestamp: Date.now() }));

app.post('/identity/register', async (c) => {
  return c.json({ ok: true, note: 'Passport registration — implementation pending' }, 501);
});

app.get('/identity/resolve/:did', async (c) => {
  return c.json({ exists: true }, 200);
});

export default app;
