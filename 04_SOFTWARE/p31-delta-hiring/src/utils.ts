const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

export function parseHash(): { name: string; id?: string } {
  const raw = (window.location.hash || '#/').replace(/^#/, '') || '/';
  const [path, ...rest] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'roles' && parts[1]) return { name: 'roles', id: parts[1] };
  if (parts[0] === 'proof' && parts[1] === 'new' && parts[2]) return { name: 'proof-new', id: parts[2] };
  if (parts[0] === 'proof' && parts[1] && parts[1] !== 'new') return { name: 'proof-edit', id: parts[1] };
  if (parts[0] === 'roles') return { name: 'roles' };
  if (parts[0] === 'portfolio') return { name: 'portfolio' };
  if (parts[0] === 'governance') return { name: 'governance' };
  return { name: 'home' };
}

export function setHashPath(parts: string[]): void {
  window.location.hash = '#/' + parts.join('/');
}