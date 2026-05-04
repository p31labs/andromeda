/**
 * P31 S.M.A.R.T. Molecular Notification Field
 * Spatial · Molecular · Actionable · Reactive · Transient
 *
 * No WebGL. No external deps. DOM divs + SVG bonds + rAF spring physics.
 * Usage:
 *   import { getMolecularField } from '/lib/p31-molecular-field.js';
 *   getMolecularField().notify({ severity: 'info', title: 'Mesh connected', groupId: 'mesh' });
 * Or globally:
 *   window.p31Notify({ severity: 'success', title: 'Build passed' });
 */

const SEVERITY_COLOR = {
  info:     '#4db8a8',  // teal (P31 canon)
  success:  '#10b981',  // emerald
  warning:  '#cc6247',  // coral (P31 canon)
  critical: '#f43f5e',  // hot coral
  mesh:     '#8b5cf6',  // purple
};

const MAX_ATOMS = 15;
const DEFAULT_LIFESPAN = 8000;
const FIELD_W = 300;
const FIELD_H = 300;

function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

export class MolecularField {
  constructor() {
    this._atoms = new Map();
    this._links = [];
    this._raf   = null;
    this._container = null;
    this._svg = null;
    this._quantumState = 'liquid'; // liquid | gas | plasma
    if (typeof document !== 'undefined') this._mount();
  }

  _mount() {
    const wrap = document.createElement('div');
    wrap.id = 'p31-mol-field';
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'System notifications');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'p31-mol-bonds';
    svg.setAttribute('aria-hidden', 'true');
    wrap.appendChild(svg);

    document.body.appendChild(wrap);
    this._container = wrap;
    this._svg = svg;
    this._loop();
  }

  /** @param {{ id?: string, groupId?: string|null, severity?: string, title: string, data?: any, lifespan?: number }} opts */
  notify(opts = {}) {
    const id       = opts.id || Math.random().toString(36).slice(2, 10);
    const groupId  = opts.groupId || null;
    const severity = opts.severity || 'info';
    const title    = opts.title || '';
    const lifespan = opts.lifespan ?? DEFAULT_LIFESPAN;

    // Evict oldest unpinned if at cap
    if (this._atoms.size >= MAX_ATOMS) {
      const oldest = [...this._atoms.values()]
        .filter(a => !a.pinned)
        .sort((a, b) => a.born - b.born)[0];
      if (oldest) this._evict(oldest.id, true);
    }

    // Spawn at random position inside field
    const x = 28 + Math.random() * (FIELD_W - 56);
    const y = 28 + Math.random() * (FIELD_H - 56);
    const speed = this._quantumState === 'plasma' ? 1.2
                : this._quantumState === 'gas'    ? 0.6
                :                                   0.25;

    const el = document.createElement('div');
    el.className = 'p31-mol-atom';
    el.setAttribute('data-severity', severity);
    el.setAttribute('role', 'status');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', title);
    el.style.setProperty('--atom-color', SEVERITY_COLOR[severity] || SEVERITY_COLOR.info);
    el.innerHTML = `
      <div class="p31-mol-atom__core" aria-hidden="true"></div>
      <div class="p31-mol-atom__label">${esc(title)}</div>
      <div class="p31-mol-atom__card">
        <span class="p31-mol-atom__card-title">${esc(title)}</span>
        ${opts.data ? `<pre class="p31-mol-atom__card-data">${esc(JSON.stringify(opts.data, null, 2))}</pre>` : ''}
        <button class="p31-mol-atom__dismiss" aria-label="Dismiss">×</button>
      </div>`;

    el.addEventListener('pointerenter', () => this._pin(id));
    el.addEventListener('pointerleave', () => this._unpin(id));
    el.addEventListener('click',        () => this._toggle(id));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') this._toggle(id); });
    el.querySelector('.p31-mol-atom__dismiss')
      .addEventListener('click', e => { e.stopPropagation(); this._evict(id); });

    this._container.appendChild(el);

    const atom = {
      id, groupId, severity, title, lifespan, el,
      x, y,
      vx: (Math.random() - 0.5) * speed * 2,
      vy: (Math.random() - 0.5) * speed * 2,
      born: Date.now(),
      pinned:   false,
      expanded: false,
    };
    this._atoms.set(id, atom);

    // Register bonds to same group
    if (groupId) {
      for (const other of this._atoms.values()) {
        if (other.id !== id && other.groupId === groupId) {
          this._links.push({ source: id, target: other.id });
        }
      }
    }

    this._scheduleDecay(id, lifespan);
    return id;
  }

  setQuantumState(state) {
    this._quantumState = state; // 'liquid' | 'gas' | 'plasma'
    if (this._container) {
      this._container.dataset.quantum = state;
    }
  }

  _scheduleDecay(id, ms) {
    setTimeout(() => {
      const atom = this._atoms.get(id);
      if (!atom || atom.pinned) return;
      this._evict(id);
    }, ms);
  }

  _evict(id, immediate = false) {
    const atom = this._atoms.get(id);
    if (!atom) return;
    if (immediate) {
      atom.el.remove();
      this._atoms.delete(id);
      this._links = this._links.filter(l => l.source !== id && l.target !== id);
      return;
    }
    atom.el.classList.add('p31-mol-atom--evaporating');
    atom.el.addEventListener('animationend', () => {
      atom.el.remove();
      this._atoms.delete(id);
      this._links = this._links.filter(l => l.source !== id && l.target !== id);
    }, { once: true });
  }

  _pin(id) {
    const a = this._atoms.get(id);
    if (a) a.pinned = true;
  }

  _unpin(id) {
    const a = this._atoms.get(id);
    if (!a || a.expanded) return;
    a.pinned = false;
    this._scheduleDecay(id, 3000);
  }

  _toggle(id) {
    const a = this._atoms.get(id);
    if (!a) return;
    a.expanded = !a.expanded;
    a.pinned   =  a.expanded;
    a.el.classList.toggle('p31-mol-atom--expanded', a.expanded);
    if (!a.expanded) this._scheduleDecay(id, 3000);
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    if (document.hidden || this._atoms.size === 0) return;
    this._tick();
  }

  _tick() {
    const atoms = [...this._atoms.values()];
    const qs = this._quantumState;
    const damping  = qs === 'plasma' ? 0.96 : qs === 'gas' ? 0.92 : 0.86;
    const drift    = qs === 'plasma' ? 0.00008 : 0.00006;
    const REPEL    = qs === 'plasma' ? 1200 : qs === 'gas' ? 900 : 600;
    const SPRING_K = qs === 'gas'    ? 0.004 : 0.009;

    // Bond springs — pull grouped atoms toward each other
    for (const link of this._links) {
      const a = this._atoms.get(link.source);
      const b = this._atoms.get(link.target);
      if (!a || !b || a.expanded || b.expanded) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = 65;
      const f = (dist - target) * SPRING_K;
      const nx = dx / dist, ny = dy / dist;
      if (!a.pinned) { a.vx += nx * f; a.vy += ny * f; }
      if (!b.pinned) { b.vx -= nx * f; b.vy -= ny * f; }
    }

    // Repulsion between all atoms
    for (let i = 0; i < atoms.length; i++) {
      for (let j = i + 1; j < atoms.length; j++) {
        const a = atoms[i], b = atoms[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = (dx * dx + dy * dy) || 1;
        if (d2 > 120 * 120) continue;
        const d = Math.sqrt(d2);
        const f = REPEL / d2;
        if (!a.pinned && !a.expanded) { a.vx += (dx / d) * f; a.vy += (dy / d) * f; }
        if (!b.pinned && !b.expanded) { b.vx -= (dx / d) * f; b.vy -= (dy / d) * f; }
      }
    }

    // Integrate + boundary
    const PAD = 22;
    for (const atom of atoms) {
      if (atom.pinned || atom.expanded) continue;
      // Soft center gravity
      atom.vx += (FIELD_W / 2 - atom.x) * drift;
      atom.vy += (FIELD_H / 2 - atom.y) * drift;
      atom.vx *= damping;
      atom.vy *= damping;
      atom.x  += atom.vx;
      atom.y  += atom.vy;
      if (atom.x < PAD)          { atom.x = PAD;          atom.vx =  Math.abs(atom.vx) * 0.4; }
      if (atom.x > FIELD_W - PAD) { atom.x = FIELD_W - PAD; atom.vx = -Math.abs(atom.vx) * 0.4; }
      if (atom.y < PAD)          { atom.y = PAD;          atom.vy =  Math.abs(atom.vy) * 0.4; }
      if (atom.y > FIELD_H - PAD) { atom.y = FIELD_H - PAD; atom.vy = -Math.abs(atom.vy) * 0.4; }
      atom.el.style.transform = `translate(${atom.x}px, ${atom.y}px)`;
    }

    // Draw bonds
    while (this._svg.firstChild) this._svg.removeChild(this._svg.firstChild);
    for (const link of this._links) {
      const a = this._atoms.get(link.source);
      const b = this._atoms.get(link.target);
      if (!a || !b) continue;
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
      ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      ln.setAttribute('class', 'p31-mol-bond');
      this._svg.appendChild(ln);
    }
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    this._container?.remove();
  }
}

let _field = null;
export function getMolecularField() {
  if (!_field && typeof document !== 'undefined') _field = new MolecularField();
  return _field;
}

if (typeof window !== 'undefined') {
  window.p31Notify = opts => getMolecularField().notify(opts);
  window.p31MolField = { get: getMolecularField };
}
