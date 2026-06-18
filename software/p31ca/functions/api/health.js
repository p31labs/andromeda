export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      ok: true,
      service: 'p31ca-pages',
      ts: new Date().toISOString()
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    }
  );
}
