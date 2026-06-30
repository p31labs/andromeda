export async function onRequest(context) {
  return new Response(JSON.stringify({
    status: 'ok',
    version: '0.0.0',
    timestamp: new Date().toISOString(),
    service: 'p31-hearing-ops',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
