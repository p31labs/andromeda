#!/usr/bin/env node
/**
 * Generates all *-about.html files in public/ from hub/registry.mjs (single source).
 * Run: node scripts/generate-about-pages.mjs
 * Overwrites existing files — idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from './hub/registry.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

// ─── URL map (about page → launch URL) ─────────────────────────────────────
function getAppUrl(item) {
  return item.appUrl;
}

// ─── Accent colors for status badges ───────────────────────────────────────
function statusColor(status) {
  return {
    live: '#3ba372',
    research: '#4db8a8',
    hardware: '#cda852'
  }[status] || '#3ba372';
}

function statusBg(status) {
  return {
    live: 'rgba(59,163,114,0.12)',
    research: 'rgba(77,184,168,0.12)',
    hardware: 'rgba(205,168,82,0.12)'
  }[status] || 'rgba(59,163,114,0.12)';
}

// ─── HTML template ──────────────────────────────────────────────────────────
function renderAboutPage(item) {
  const appUrl = getAppUrl(item);
  const sc = statusColor(item.status);
  const sb = statusBg(item.status);
  const featureItems = item.features.map(f => `            <li>${f}</li>`).join('\n');
  const howToItems = item.howTo.map((s, i) =>
    `          <div class="step"><span class="step-num">${i + 1}</span><span>${s}</span></div>`
  ).join('\n');
  const techItems = item.tech.map(t => `              <li>${t}</li>`).join('\n');
  const relatedItems = (item.related || []).map(r => {
    const rel = registry.find(x => x.id === r);
    if (!rel) return '';
    return `            <a href="/${r}-about.html" class="related-link">${rel.icon} ${rel.title}</a>`;
  }).filter(Boolean).join('\n');

  const isExternal = appUrl.startsWith('http');
  const targetAttr = isExternal ? ' target="_blank" rel="noopener"' : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0f1115">
<title>${item.title} — ${item.tagline} | P31 Labs</title>
<meta name="description" content="${item.features[0]}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/p31-style.css">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --accent:${item.accent};
  --font:var(--p31-font-sans);
  --mono:var(--p31-font-mono);
}
html,body{min-height:100%;background:var(--void);color:var(--cloud);font-family:var(--font);line-height:1.6}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}

/* Nav */
.nav{position:sticky;top:0;z-index:50;background:rgba(15,17,21,0.92);border-bottom:1px solid var(--border);backdrop-filter:blur(8px)}
.nav-inner{max-width:1100px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--cloud)}
.nav-brand:hover{text-decoration:none}
.nav-brand-label{font-family:var(--mono);font-weight:700;font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.8}
.nav-links{display:flex;align-items:center;gap:20px}
.nav-link{font-family:var(--mono);font-size:11px;color:var(--muted);text-decoration:none;transition:color .15s}
.nav-link:hover{color:var(--cloud);text-decoration:none}
.nav-cta{font-family:var(--mono);font-size:11px;font-weight:700;background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);padding:6px 14px;border-radius:4px;border:1px solid color-mix(in srgb,var(--accent) 30%,transparent);text-decoration:none;transition:background .15s}
.nav-cta:hover{background:color-mix(in srgb,var(--accent) 25%,transparent);text-decoration:none}

/* Hero */
.hero{background:linear-gradient(135deg,var(--surface) 0%,var(--void) 100%);border-bottom:1px solid var(--border);padding:56px 24px 48px}
.hero-inner{max-width:1100px;margin:0 auto}
.hero-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:16px}
.hero-top{display:flex;align-items:flex-start;gap:20px;margin-bottom:24px}
.hero-icon{font-size:48px;line-height:1;flex-shrink:0}
.hero-text h1{font-size:clamp(28px,4vw,42px);font-weight:700;color:var(--accent);font-family:var(--mono);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.hero-text .tagline{font-size:16px;color:rgba(216,214,208,.75);margin-bottom:16px}
.hero-badges{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.badge{display:inline-block;font-family:var(--mono);font-size:10px;font-weight:700;padding:3px 10px;border-radius:9999px;letter-spacing:1px;background:${sb};color:${sc};border:1px solid color-mix(in srgb,${sc} 30%,transparent)}
.hero-cta{margin-top:28px;display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.cta-btn{display:inline-block;background:var(--accent);color:var(--void);font-family:var(--mono);font-weight:700;font-size:13px;letter-spacing:1px;padding:13px 32px;border-radius:5px;text-decoration:none;transition:filter .15s}
.cta-btn:hover{filter:brightness(1.12);text-decoration:none}
.cta-secondary{font-family:var(--mono);font-size:12px;color:var(--muted);text-decoration:none;transition:color .15s}
.cta-secondary:hover{color:var(--cloud);text-decoration:none}

/* Two-column layout */
.page-body{max-width:1100px;margin:0 auto;padding:48px 24px 80px;display:grid;grid-template-columns:1fr 340px;gap:48px;align-items:start}
@media(max-width:768px){.page-body{grid-template-columns:1fr;gap:32px}}

/* Main column */
.main-col section{margin-bottom:40px}
.section-label{font-family:var(--mono);font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)}
p{font-size:15px;color:rgba(216,214,208,.82);margin-bottom:14px;line-height:1.72}
ul.feature-list{margin:0;padding-left:0;list-style:none}
ul.feature-list li{font-size:15px;color:rgba(216,214,208,.82);padding:10px 0 10px 20px;border-bottom:1px solid var(--border);position:relative;line-height:1.6}
ul.feature-list li::before{content:'▸';color:var(--accent);position:absolute;left:0;top:10px}
ul.feature-list li:last-child{border-bottom:none}
.step{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px}
.step-num{font-family:var(--mono);font-size:11px;font-weight:700;background:color-mix(in srgb,var(--accent) 15%,transparent);color:var(--accent);border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.step span:last-child{font-size:15px;color:rgba(216,214,208,.82);line-height:1.65}
.tech-note{font-size:13px;color:rgba(216,214,208,.6);background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;padding:14px 18px;line-height:1.65}

/* Sidebar */
.sidebar{position:sticky;top:80px;display:flex;flex-direction:column;gap:20px}
.sidebar-card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:20px}
.sidebar-card-title{font-family:var(--mono);font-size:9px;letter-spacing:3px;text-transform:uppercase;color:var(--muted);margin-bottom:14px}
.tech-stack{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.tech-stack li{font-family:var(--mono);font-size:12px;color:var(--accent);display:flex;align-items:center;gap:8px}
.tech-stack li::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0}
.sidebar-link{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;color:var(--muted);text-decoration:none;padding:8px 0;border-bottom:1px solid var(--border);transition:color .15s}
.sidebar-link:hover{color:var(--cloud);text-decoration:none}
.sidebar-link:last-child{border-bottom:none}
.related-link{display:block;font-size:14px;color:rgba(216,214,208,.7);text-decoration:none;padding:7px 0;border-bottom:1px solid var(--border);transition:color .15s}
.related-link:hover{color:var(--cloud);text-decoration:none}
.related-link:last-child{border-bottom:none}

/* Callout */
.callout-p31{font-size:13px;color:rgba(216,214,208,.78);border-left:3px solid var(--teal);padding:14px 18px;margin:32px 0 0;background:rgba(37,137,125,0.08);border-radius:0 10px 10px 0;line-height:1.65}
.callout-p31 a{color:var(--cyan)}

/* Footer */
.footer{margin-top:64px;padding-top:24px;border-top:1px solid var(--border);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:11px;font-family:var(--mono);color:var(--muted)}
.footer a{color:var(--muted);text-decoration:none;transition:color .15s}
.footer a:hover{color:var(--cloud);text-decoration:none}
.footer-links{display:flex;gap:20px;flex-wrap:wrap}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="nav-brand">
      <svg width="24" height="24" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="112" fill="#25897d"/><circle cx="390" cy="120" r="48" fill="#cc6247"/><text x="256" y="340" font-family="system-ui" font-weight="900" font-size="220" fill="#d8d6d0" text-anchor="middle">P31</text><rect x="156" y="380" width="200" height="16" rx="8" fill="#cda852"/></svg>
      <span class="nav-brand-label">P31 Labs</span>
    </a>
    <div class="nav-links">
      <a href="/" class="nav-link">&larr; Hub</a>
      <a href="https://github.com/p31labs/andromeda" target="_blank" rel="noopener" class="nav-link">GitHub</a>
      <a href="${appUrl}" class="nav-cta"${targetAttr}>&#x2B21; Launch ${item.title}</a>
    </div>
  </div>
</nav>

<div class="hero">
  <div class="hero-inner">
    <div class="hero-eyebrow">P31 Labs &mdash; ${item.statusLabel}</div>
    <div class="hero-top">
      <div class="hero-icon">${item.icon}</div>
      <div class="hero-text">
        <h1>${item.title}</h1>
        <div class="tagline">${item.tagline}</div>
        <div class="hero-badges">
          <span class="badge">${item.statusLabel}</span>
          ${item.tech.slice(0, 3).map(t => `<span class="badge" style="background:rgba(255,255,255,0.04);color:var(--muted);border-color:var(--border)">${t}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="hero-cta">
      <a href="${appUrl}" class="cta-btn"${targetAttr}>&#x2B21; Launch ${item.title}</a>
      <a href="/" class="cta-secondary">&larr; Back to Hub</a>
    </div>
  </div>
</div>

<div class="page-body">
  <div class="main-col">

    <section>
      <div class="section-label">What Is It</div>
      <p>${item.features[0]}. ${item.tagline} is a core component of the P31 Labs sovereign cognitive infrastructure stack — built to run offline, deployed to the edge, and designed without dark patterns.</p>
      <p>${item.techNotes}</p>
    </section>

    <section>
      <div class="section-label">Core Features</div>
      <ul class="feature-list">
${featureItems}
      </ul>
    </section>

    <section>
      <div class="section-label">How To Use</div>
${howToItems}
    </section>

    <section>
      <div class="section-label">Architecture Notes</div>
      <div class="tech-note">${item.techNotes}</div>
    </section>

    <div class="callout-p31">
      <strong>P31 Labs, Inc.</strong> (Georgia nonprofit, EIN 42-1888158) builds open tools for cognitive sovereignty, communication clarity, and family coordination. This page is technical documentation, not medical or legal advice. Mission and support: <a href="https://phosphorus31.org" target="_blank" rel="noopener">phosphorus31.org</a>.
    </div>

    <div style="margin-top:32px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
      <a href="${appUrl}" class="cta-btn"${targetAttr}>&#x2B21; Launch ${item.title}</a>
      <a href="/" class="cta-secondary">&larr; Back to Hub</a>
    </div>

    <div class="footer">
      <span>P31 Labs, Inc. &middot; ${item.title}</span>
      <div class="footer-links">
        <a href="/">Hub</a>
        <a href="${appUrl}"${targetAttr}>${item.title}</a>
        <a href="https://phosphorus31.org/donate" target="_blank" rel="noopener">Support</a>
        <a href="https://github.com/p31labs/andromeda" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
  </div>

  <aside class="sidebar">
    <div class="sidebar-card">
      <div class="sidebar-card-title">Status</div>
      <span class="badge">${item.statusLabel}</span>
      <p style="margin-top:12px;font-size:13px;color:var(--muted)">Deployed on P31 Labs infrastructure. EIN 42-1888158.</p>
    </div>

    <div class="sidebar-card">
      <div class="sidebar-card-title">Tech Stack</div>
      <ul class="tech-stack">
${techItems}
      </ul>
    </div>

    <div class="sidebar-card">
      <div class="sidebar-card-title">Links</div>
      <a href="${appUrl}" class="sidebar-link"${targetAttr}>&#x2B21; Launch Application</a>
      <a href="https://github.com/p31labs/andromeda" target="_blank" rel="noopener" class="sidebar-link">&#x2009;&#x276F; Source Code</a>
      <a href="https://phosphorus31.org" target="_blank" rel="noopener" class="sidebar-link">&#x25B3; phosphorus31.org</a>
      <a href="https://phosphorus31.org/donate" target="_blank" rel="noopener" class="sidebar-link">&#x2665; Support P31 Labs</a>
    </div>

    ${(item.related || []).length ? `<div class="sidebar-card">
      <div class="sidebar-card-title">Related</div>
${relatedItems}
    </div>` : ''}
  </aside>
</div>

</body>
</html>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────
let written = 0, skipped = 0;
for (const item of registry) {
  const outPath = path.join(PUBLIC, `${item.id}-about.html`);
  const html = renderAboutPage(item);
  fs.writeFileSync(outPath, html, 'utf8');
  written++;
  console.log(`✅ ${item.id}-about.html`);
}
console.log(`\nDone: ${written} written, ${skipped} skipped.`);
