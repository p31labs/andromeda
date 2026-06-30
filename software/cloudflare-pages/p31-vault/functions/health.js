export async function onRequest(context) {
  return new Response(JSON.stringify({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    service: 'p31-vault',
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
