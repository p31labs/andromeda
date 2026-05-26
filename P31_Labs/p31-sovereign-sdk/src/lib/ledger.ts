export async function hashTelemetry(didKey: string, activeRoom: string): Promise<string> {
  const payload = Date.now().toString() + didKey + activeRoom;
  const data = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}
