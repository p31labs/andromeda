import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'mesh', timestamp: Date.now() }));

app.get('/peers', (c) => {
  return c.json({ peers: [], note: 'Mesh peers — implementation pending' }, 501);
});

export default app;
