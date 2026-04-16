#!/usr/bin/env node
/**
 * Injects MVP "enriched" sections into p31ca/public/*-about.html for every
 * card whose link in public/index.html mvpData ends with -about.html.
 * Idempotent: skips files that already contain id="mvp-enriched".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'public', 'index.html');
const PUBLIC = path.join(ROOT, 'public');

const EXTRA_CSS = `
.detail-grid { display: grid; gap: 20px; margin: 28px 0; }
@media (min-width: 640px) { .detail-grid { grid-template-columns: 1fr 1fr; } }
.detail-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; }
.detail-card h3 { font-family: var(--mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--accent); margin: 0 0 12px; border: none; padding: 0; }
.detail-card p { font-size: 14px; margin-bottom: 10px; }
.detail-card p:last-child { margin-bottom: 0; }
.detail-card ul { margin: 0; padding-left: 18px; color: rgba(216,214,208,0.88); font-size: 14px; line-height: 1.65; }
.detail-card li { margin-bottom: 8px; }
.callout-p31 { font-size: 13px; color: rgba(216,214,208,0.78); border-left: 3px solid var(--teal); padding: 14px 18px; margin: 28px 0; background: rgba(37,137,125,0.08); border-radius: 0 10px 10px 0; line-height: 1.65; }
.callout-p31 a { color: var(--cyan); }
`;

/** Allow numeric entities (&#x2084;) from hub copy; strip only raw tags. */
function safeBodyText(s) {
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseMvpProducts(html) {
  const parts = html.split(/\r?\n    \{\r?\n        id: '/);
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const idEnd = chunk.indexOf("'");
    const id = chunk.slice(0, idEnd);
    const rest = chunk.slice(idEnd + 1);
    const linkM = /link:\s*'([^']+)'/.exec(rest);
    if (!linkM) continue;
    const link = linkM[1];
    if (!link.endsWith('-about.html')) continue;

    const titleM = /title:\s*'((?:\\'|[^'])*)'/.exec(rest);
    const taglineM = /tagline:\s*'((?:\\'|[^'])*)'/.exec(rest);
    const statusM = /statusLabel:\s*'((?:\\'|[^'])*)'/.exec(rest);
    const descM =
      /description:\s*'((?:\\'|[^'])*)'/.exec(rest) ||
      /description:\s*"((?:\\"|[^"])*)"/.exec(rest);
    const techM = /tech:\s*\[([^\]]*)\]/.exec(rest);

    const title = titleM ? titleM[1].replace(/\\'/g, "'") : id;
    const tagline = taglineM ? taglineM[1].replace(/\\'/g, "'") : '';
    const statusLabel = statusM ? statusM[1].replace(/\\'/g, "'") : '';
    const description = descM
      ? descM[0].startsWith("description: '")
        ? descM[1].replace(/\\'/g, "'")
        : descM[1].replace(/\\"/g, '"')
      : '';
    let tech = [];
    if (techM) {
      tech = techM[1]
        .split(',')
        .map((t) => t.trim().replace(/^'|'$/g, ''))
        .filter(Boolean);
    }
    out.push({ id, link, title, tagline, statusLabel, description, tech });
  }
  return out;
}

function sentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

function readLaunchHref(aboutHtml) {
  const patterns = [
    /<a\s+href="([^"]+)"[^>]*class="nav-cta"/,
    /class="nav-cta"[^>]*href="([^"]+)"/,
    /<a\s+href="([^"]+)"[^>]*class="cta-btn"/,
  ];
  for (const re of patterns) {
    const m = aboutHtml.match(re);
    if (m) return m[1];
  }
  return '#';
}

function readCtaLabel(aboutHtml) {
  const m = aboutHtml.match(/class="nav-cta"[^>]*>([^<]+)</);
  return m ? m[1].trim() : 'Launch';
}

function buildInsert({ title, tagline, description, tech, launchHref, ctaLabel }) {
  const sens = sentences(description);
  const lead = sens[0] || description;
  const more = sens.slice(1, 4);
  const techLis = tech.map((t) => `      <li>${safeBodyText(t)}</li>`).join('\n');
  const moreParas = more.map((p) => `      <p>${safeBodyText(p)}</p>`).join('\n');

  return `
  <div id="mvp-enriched" class="detail-grid">
    <div class="detail-card">
      <h3>What you can do</h3>
      <p>${safeBodyText(lead)}</p>
${moreParas}
    </div>
    <div class="detail-card">
      <h3>Build surface</h3>
      <p>Hub card stack for <strong>${safeBodyText(title)}</strong> (${safeBodyText(tagline)}). Ships as static HTML on <code>p31ca.org</code>; live app may live on Pages, Workers, or a sibling route.</p>
      <ul>
${techLis}
      </ul>
    </div>
  </div>

  <p class="callout-p31"><strong>P31 Labs, Inc.</strong> (Georgia nonprofit, EIN 42-1888158) builds open tools for cognitive load, communication clarity, and family coordination. This page is technical documentation, not medical or legal advice. Mission and donations: <a href="https://phosphorus31.org" target="_blank" rel="noopener">phosphorus31.org</a>.</p>

  <div class="cta-wrap">
    <a href="${safeBodyText(launchHref)}" class="cta-btn">${ctaLabel.replace(/</g, '&lt;')}</a>
    <a href="index.html" class="cta-secondary">&larr; Back to Hub</a>
  </div>
`;
}

function injectCss(html) {
  if (html.includes('detail-grid')) return html;
  return html.replace('</style>', `${EXTRA_CSS}\n</style>`);
}

function injectBody(html, insert) {
  if (html.includes('id="mvp-enriched"')) return html;
  const needle = '</table>';
  const idx = html.indexOf(needle);
  if (idx === -1) {
    console.warn('No </table> found, skip');
    return html;
  }
  const pos = idx + needle.length;
  return html.slice(0, pos) + '\n' + insert + html.slice(pos);
}

/** Legacy stack CTA (margin-top:40px) — redundant after enrichment adds launch row. */
function removeOldStackCtaAfterEnriched(html) {
  const enriched = html.indexOf('id="mvp-enriched"');
  if (enriched === -1) return html;
  const needle = '<div class="cta-wrap" style="margin-top:40px">';
  const pos = html.indexOf(needle, enriched);
  if (pos === -1) return html;
  const end = html.indexOf('</div>', pos);
  if (end === -1) return html;
  return html.slice(0, pos) + html.slice(end + 6);
}

function main() {
  const indexHtml = fs.readFileSync(INDEX, 'utf8');
  const products = parseMvpProducts(indexHtml);
  console.log(`Parsed ${products.length} MVP about targets from index.html`);

  for (const p of products) {
    const fp = path.join(PUBLIC, p.link);
    if (!fs.existsSync(fp)) {
      console.warn('Missing file:', p.link);
      continue;
    }
    let html = fs.readFileSync(fp, 'utf8');
    if (html.includes('id="mvp-enriched"')) {
      console.log('Skip (already enriched):', p.link);
      continue;
    }
    if (!html.includes('<table class="stack">')) {
      console.warn('Skip (non-standard layout, no stack table):', p.link);
      continue;
    }
    const launchHref = readLaunchHref(html);
    const ctaLabel = readCtaLabel(html);
    const insert = buildInsert({ ...p, launchHref, ctaLabel });
    html = injectCss(html);
    html = injectBody(html, insert);
    html = removeOldStackCtaAfterEnriched(html);

    fs.writeFileSync(fp, html, 'utf8');
    console.log('Enriched:', p.link);
  }
}

main();
