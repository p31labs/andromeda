export async function generateDID(): Promise<string> {
  const rawBytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(rawBytes).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  return `did:key:z6Mk${hex}`;
}
