/**
 * Posner Molecule (Ca₉(PO₄)₆) — 2D spring-physics navigator.
 *
 * 15 nodes: 3 inner Ca + 6 PO₄ + 6 outer Ca.
 * Verlet integration · Hooke springs · centre restoring force.
 * Zero CPU cost when unmounted (no rAF loop running).
 *
 * Usage:
 *   const nav = createSpatialNavigator();
 *   nav.mount(svgElement);  // start
 *   nav.unmount();           // stop + clear DOM
 */

const VW = 600, VH = 600, CX = 300, CY = 300;
const R1 = 78;   // inner Ca ring
const R2 = 152;  // PO₄ ring
const R3 = 232;  // outer Ca ring

interface N {
  x: number; y: number;
  px: number; py: number; // previous position (Verlet)
  ex: number; ey: number; // equilibrium position (centre restoring)
  type: 'ca-inner' | 'ca-outer' | 'po4';
}

interface B { a: number; b: number; rest: number; k: number; }

export interface SpatialHandle {
  mount(svg: SVGSVGElement): void;
  unmount(): void;
}

export function createSpatialNavigator(): SpatialHandle {
  let ns: N[] = [];
  let bs: B[] = [];
  let raf = 0;
  let drag = -1;
  let svgEl: SVGSVGElement | null = null;
  let nodeEls: SVGCircleElement[] = [];
  let bondEls: SVGLineElement[] = [];

  function rad(deg: number) { return deg * Math.PI / 180; }
  function pt(deg: number, r: number): [number, number] {
    return [CX + r * Math.cos(rad(deg)), CY + r * Math.sin(rad(deg))];
  }
  function mk(deg: number, r: number, type: N['type']): N {
    const [x, y] = pt(deg, r);
    return { x, y, px: x, py: y, ex: x, ey: y, type };
  }
  function len(a: N, b: N) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function init() {
    ns = [
      // idx 0–2: inner Ca (triangle, 120° apart, top-pointing)
      mk(-90, R1, 'ca-inner'), mk(30, R1, 'ca-inner'), mk(150, R1, 'ca-inner'),
      // idx 3–8: PO₄ (hexagon, 60° apart, starting at -30°)
      mk(-30, R2, 'po4'), mk(30, R2, 'po4'), mk(90, R2, 'po4'),
      mk(150, R2, 'po4'), mk(210, R2, 'po4'), mk(270, R2, 'po4'),
      // idx 9–14: outer Ca (hexagon, 60° apart, starting at 0° — between PO₄)
      mk(0, R3, 'ca-outer'), mk(60, R3, 'ca-outer'), mk(120, R3, 'ca-outer'),
      mk(180, R3, 'ca-outer'), mk(240, R3, 'ca-outer'), mk(300, R3, 'ca-outer'),
    ];

    bs = [];
    const b = (a: number, bb: number, k: number) =>
      bs.push({ a, b: bb, rest: len(ns[a], ns[bb]), k });

    // Inner Ca triangle
    b(0, 1, 0.40); b(1, 2, 0.40); b(0, 2, 0.40);

    // Inner Ca → flanking PO₄ (skip same-angle PO₄ for C₃ symmetry)
    // Ca[0](-90°/270°) → PO₄[4](210°=idx7) and PO₄[0](-30°=330°,idx3)
    b(0, 7, 0.30); b(0, 3, 0.30);
    // Ca[1](30°) → PO₄[0](-30°=330°,idx3) and PO₄[2](90°,idx5)
    b(1, 3, 0.30); b(1, 5, 0.30);
    // Ca[2](150°) → PO₄[2](90°,idx5) and PO₄[4](210°,idx7)
    b(2, 5, 0.30); b(2, 7, 0.30);

    // PO₄ → flanking outer Ca (each PO₄ to its two adjacent OCa)
    // PO₄[3](-30°=330°,idx3) → OCA[5](300°,idx14) + OCA[0](0°,idx9)
    b(3, 14, 0.22); b(3, 9,  0.22);
    // PO₄[4](30°,idx4) → OCA[0](0°,idx9) + OCA[1](60°,idx10)
    b(4, 9,  0.22); b(4, 10, 0.22);
    // PO₄[5](90°,idx5) → OCA[1](60°,idx10) + OCA[2](120°,idx11)
    b(5, 10, 0.22); b(5, 11, 0.22);
    // PO₄[6](150°,idx6) → OCA[2](120°,idx11) + OCA[3](180°,idx12)
    b(6, 11, 0.22); b(6, 12, 0.22);
    // PO₄[7](210°,idx7) → OCA[3](180°,idx12) + OCA[4](240°,idx13)
    b(7, 12, 0.22); b(7, 13, 0.22);
    // PO₄[8](270°,idx8) → OCA[4](240°,idx13) + OCA[5](300°,idx14)
    b(8, 13, 0.22); b(8, 14, 0.22);

    // Outer Ca ring
    for (let i = 0; i < 6; i++) b(9 + i, 9 + (i + 1) % 6, 0.18);
  }

  function step() {
    const ax = new Float64Array(ns.length);
    const ay = new Float64Array(ns.length);

    for (const { a, b: bb, rest, k } of bs) {
      const dx = ns[bb].x - ns[a].x, dy = ns[bb].y - ns[a].y;
      const d = Math.hypot(dx, dy) || 1e-5;
      const f = (d - rest) * k / d;
      ax[a] += f * dx; ay[a] += f * dy;
      ax[bb] -= f * dx; ay[bb] -= f * dy;
    }

    const DAMP = 0.91, CK = 0.007;
    for (let i = 0; i < ns.length; i++) {
      if (i === drag) continue;
      const n = ns[i];
      ax[i] += (n.ex - n.x) * CK;
      ay[i] += (n.ey - n.y) * CK;
      const vx = (n.x - n.px) * DAMP, vy = (n.y - n.py) * DAMP;
      n.px = n.x; n.py = n.y;
      n.x += vx + ax[i];
      n.y += vy + ay[i];
    }
  }

  function draw() {
    for (let i = 0; i < ns.length; i++) {
      const c = nodeEls[i]; if (!c) continue;
      c.setAttribute('cx', String(ns[i].x.toFixed(2)));
      c.setAttribute('cy', String(ns[i].y.toFixed(2)));
    }
    for (let i = 0; i < bs.length; i++) {
      const l = bondEls[i]; if (!l) continue;
      l.setAttribute('x1', String(ns[bs[i].a].x.toFixed(2)));
      l.setAttribute('y1', String(ns[bs[i].a].y.toFixed(2)));
      l.setAttribute('x2', String(ns[bs[i].b].x.toFixed(2)));
      l.setAttribute('y2', String(ns[bs[i].b].y.toFixed(2)));
    }
  }

  function loop() { step(); draw(); raf = requestAnimationFrame(loop); }

  function ns_<T extends SVGElement>(tag: string, attrs: Record<string, string>): T {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag) as T;
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function buildDOM(s: SVGSVGElement) {
    s.innerHTML = '';

    // Glow filter for inner Ca
    const defs = ns_<SVGDefsElement>('defs', {});
    const filt = ns_<SVGFilterElement>('filter', {
      id: 'sg-glow', x: '-40%', y: '-40%', width: '180%', height: '180%',
    });
    const blur = ns_<SVGFEGaussianBlurElement>('feGaussianBlur', {
      in: 'SourceGraphic', stdDeviation: '4', result: 'b',
    });
    const merge = ns_<SVGFEMergeElement>('feMerge', {});
    merge.appendChild(ns_('feMergeNode', { in: 'b' }));
    merge.appendChild(ns_('feMergeNode', { in: 'SourceGraphic' }));
    filt.appendChild(blur); filt.appendChild(merge);
    defs.appendChild(filt); s.appendChild(defs);

    // Bond layer
    const gBonds = ns_('g', { id: 'spatial-bonds', opacity: '0.5' });
    bondEls = bs.map(({ a, b: bb }) => {
      const line = ns_<SVGLineElement>('line', {
        x1: String(ns[a].x), y1: String(ns[a].y),
        x2: String(ns[bb].x), y2: String(ns[bb].y),
        stroke: '#3ba89a', 'stroke-width': '1.4', 'stroke-linecap': 'round',
      });
      gBonds.appendChild(line);
      return line;
    });
    s.appendChild(gBonds);

    // Node layer
    const gNodes = ns_('g', { id: 'spatial-nodes' });
    const NODE_STYLE: Record<N['type'], { r: number; fill: string; stroke: string; glow: boolean }> = {
      'ca-inner': { r: 9,  fill: '#0ea5e9', stroke: '#0284c7', glow: true  },
      'ca-outer': { r: 6,  fill: '#64d4c8', stroke: '#3ba89a', glow: false },
      'po4':      { r: 5,  fill: '#a78bfa', stroke: '#7c3aed', glow: false },
    };
    nodeEls = ns.map((n, i) => {
      const s2 = NODE_STYLE[n.type];
      const c = ns_<SVGCircleElement>('circle', {
        cx: String(n.x), cy: String(n.y), r: String(s2.r),
        fill: s2.fill, stroke: s2.stroke, 'stroke-width': '1.5',
        ...(s2.glow ? { filter: 'url(#sg-glow)' } : {}),
        style: 'cursor:grab',
        role: 'button',
        'aria-label': `${n.type === 'po4' ? 'PO₄³⁻' : 'Ca²⁺'} node ${i} — drag to perturb`,
        tabindex: '0',
      });
      gNodes.appendChild(c);
      return c;
    });
    s.appendChild(gNodes);

    // Pointer interaction
    let captureId = -1;

    function toSVG(e: PointerEvent): [number, number] {
      const r = s.getBoundingClientRect();
      return [
        (e.clientX - r.left) * (VW / r.width),
        (e.clientY - r.top) * (VH / r.height),
      ];
    }

    function nearest(x: number, y: number): number {
      let best = -1, bestD = 28;
      ns.forEach((n, i) => {
        const d = Math.hypot(n.x - x, n.y - y);
        if (d < bestD) { best = i; bestD = d; }
      });
      return best;
    }

    s.addEventListener('pointerdown', (e) => {
      const [x, y] = toSVG(e);
      const idx = nearest(x, y);
      if (idx === -1) return;
      drag = idx; captureId = e.pointerId;
      s.setPointerCapture(e.pointerId);
      nodeEls[idx].style.cursor = 'grabbing';
      e.preventDefault();
    });

    s.addEventListener('pointermove', (e) => {
      if (drag === -1 || e.pointerId !== captureId) return;
      const [x, y] = toSVG(e);
      ns[drag].x = x; ns[drag].y = y;
      ns[drag].px = x; ns[drag].py = y;
    });

    function endDrag(e: PointerEvent) {
      if (drag === -1 || e.pointerId !== captureId) return;
      nodeEls[drag].style.cursor = 'grab';
      drag = -1; captureId = -1;
    }
    s.addEventListener('pointerup', endDrag);
    s.addEventListener('pointercancel', endDrag);
  }

  return {
    mount(s: SVGSVGElement) {
      if (raf) return; // already running
      svgEl = s;
      init();
      buildDOM(s);
      raf = requestAnimationFrame(loop);
    },
    unmount() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      drag = -1;
      if (svgEl) { svgEl.innerHTML = ''; svgEl = null; }
      nodeEls = []; bondEls = [];
    },
  };
}
