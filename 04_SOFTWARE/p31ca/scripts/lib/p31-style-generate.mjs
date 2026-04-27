/**
 * Build CSS, Tailwind CDN bridge, and Astro extend from p31.universalCanon/1.0.0
 * Coupled sinks: p31-alignment.json derivation "canon-to-style-css" (passport + p31ca public)
 */
function assertPaletteAligned(canon) {
  const p = canon.palette;
  const h = canon.appearances.hub.colors;
  for (const k of Object.keys(p)) {
    if (k === "comment") continue;
    if (h[k] !== p[k]) {
      throw new Error(`universal canon: appearances.hub.colors.${k} must equal palette.${k} (${h[k]} vs ${p[k]})`);
    }
  }
  const o = canon.appearances.org.colors;
  for (const k of Object.keys(p)) {
    if (k === "comment") continue;
    if (o[k] !== p[k]) {
      throw new Error(`universal canon: appearances.org.colors.${k} must equal palette.${k} (${o[k]} vs ${p[k]})`);
    }
  }
}

function fontStack(arr) {
  return arr.map((s) => (s.includes(" ") ? `"${s}"` : s)).join(", ");
}

function emitColorAliases(lines, prefix = "") {
  const keys = ["void", "surface", "surface2", "coral", "teal", "cyan", "phosphorus", "cloud", "muted", "butter"];
  for (const name of keys) {
    lines.push(`  ${prefix}--${name}: var(--p31-${name});`);
  }
  lines.push(`  ${prefix}--border: var(--p31-border-subtle);`);
}

function emitAppearanceBlock(lines, appearance, selector) {
  const { colors, semantic, glass, colorScheme, themeColor } = appearance;
  lines.push(`${selector} {`);
  lines.push(`  color-scheme: ${colorScheme};`);
  lines.push(`  --p31-theme-color: ${themeColor};`);
  for (const [name, hex] of Object.entries(colors)) {
    lines.push(`  --p31-${name}: ${hex};`);
  }
  lines.push(`  --p31-border-subtle: ${semantic.borderSubtle};`);
  lines.push(`  --p31-glass-border: ${glass.border};`);
  lines.push(`  --p31-glass-surface: ${glass.surface};`);
  lines.push("");
  emitColorAliases(lines, "");
  lines.push("}");
}

function emitUniversalScale(lines, canon) {
  const { typography, space, radius, shadow, motion, zIndex, focus } = canon;
  const sans = fontStack(typography.fontFamilies.sans);
  const mono = fontStack(typography.fontFamilies.mono);
  lines.push(`  --p31-font-sans: ${sans};`);
  lines.push(`  --p31-font-mono: ${mono};`);
  for (const [k, v] of Object.entries(typography.scaleRem)) {
    lines.push(`  --p31-text-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(typography.lineHeight)) {
    lines.push(`  --p31-leading-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(typography.letterSpacing)) {
    lines.push(`  --p31-tracking-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(space)) {
    lines.push(`  --p31-space-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(radius)) {
    lines.push(`  --p31-radius-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(shadow)) {
    lines.push(`  --p31-shadow-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(motion.durationMs)) {
    lines.push(`  --p31-duration-${k}: ${v}ms;`);
  }
  for (const [k, v] of Object.entries(motion.easing)) {
    lines.push(`  --p31-ease-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(zIndex)) {
    lines.push(`  --p31-z-${k}: ${v};`);
  }
  lines.push(`  --p31-focus-ring: ${focus.ringWidth};`);
  lines.push(`  --p31-focus-offset: ${focus.ringOffset};`);
  lines.push(`  --p31-focus-color-hub: ${focus.hubRingColor};`);
  lines.push(`  --p31-focus-color-org: ${focus.orgRingColor};`);
}

/**
 * @param {object} canon parsed p31.universalCanon
 * @returns {{ css: string, js: string }}
 */
export function buildStyleArtifacts(canon) {
  if (canon.schema !== "p31.universalCanon/1.0.0") {
    throw new Error(`expected p31.universalCanon/1.0.0, got ${canon.schema}`);
  }
  assertPaletteAligned(canon);

  const hub = canon.appearances.hub;
  const org = canon.appearances.org;

  const cssLines = [
    "/* AUTO-GENERATED from andromeda/04_SOFTWARE/design-tokens/p31-universal-canon.json */",
    "/* Hub (p31ca): default. Org (phosphorus31.org): set <html data-p31-appearance=\"org\"> */",
    ":root {",
    '  --p31-appearance: hub;',
  ];

  emitUniversalScale(cssLines, canon);
  cssLines.push("");
  for (const [name, hex] of Object.entries(hub.colors)) {
    cssLines.push(`  --p31-${name}: ${hex};`);
  }
  cssLines.push(`  --p31-border-subtle: ${hub.semantic.borderSubtle};`);
  cssLines.push(`  --p31-glass-border: ${hub.glass.border};`);
  cssLines.push(`  --p31-glass-surface: ${hub.glass.surface};`);
  cssLines.push(`  --p31-theme-color: ${hub.themeColor};`);
  cssLines.push("");
  emitColorAliases(cssLines, "");
  cssLines.push("}");

  cssLines.push("");
  emitAppearanceBlock(cssLines, org, '[data-p31-appearance="org"]');
  cssLines.push("");
  cssLines.push(
    "/* Prefer org when user wants light system UI on org host only (optional; set on <html>) */",
  );
  cssLines.push("@media (prefers-color-scheme: light) {");
  cssLines.push('  html[data-p31-appearance="auto"] {');
  cssLines.push("    color-scheme: light;");
  for (const [name, hex] of Object.entries(org.colors)) {
    cssLines.push(`    --p31-${name}: ${hex};`);
  }
  cssLines.push(`    --p31-border-subtle: ${org.semantic.borderSubtle};`);
  cssLines.push(`    --p31-glass-border: ${org.glass.border};`);
  cssLines.push(`    --p31-glass-surface: ${org.glass.surface};`);
  cssLines.push(`    --p31-theme-color: ${org.themeColor};`);
  emitColorAliases(cssLines, "  ");
  cssLines.push("  }");
  cssLines.push("}");

  cssLines.push("");
  cssLines.push("html { color-scheme: dark; }");
  cssLines.push('[data-p31-appearance="org"] { color-scheme: light; }');
  cssLines.push("");

  const hubColors = hub.colors;
  const twColors = {};
  for (const name of Object.keys(hubColors)) {
    twColors[name] = `var(--p31-${name})`;
  }

  const extendObj = {
    fontFamily: {
      sans: [`"${canon.typography.fontFamilies.sans[0]}"`, ...canon.typography.fontFamilies.sans.slice(1)],
      mono: [`"${canon.typography.fontFamilies.mono[0]}"`, ...canon.typography.fontFamilies.mono.slice(1)],
    },
    colors: twColors,
  };

  const js =
    `/* AUTO-GENERATED — hub Tailwind CDN preset (dark vars). Org: rely on CSS variables + data-p31-appearance. */\n(function () {\n  window.P31_TAILWIND_EXTEND = ${JSON.stringify(extendObj, null, 2)};\n})();\n`;

  emitMissionTrioBlock(cssLines);
  emitDesignDoctrineBlock(cssLines);

  return { css: cssLines.join("\n"), js };
}

/** Mission trio EBC + hub rail — used by static pages, verify-mission-trio, Playwright e2e */
function emitMissionTrioBlock(lines) {
  lines.push("");
  lines.push("/* p31.missionTrio — Build / Create / Connect (EBC + hub index rail) */");
  lines.push(".p31-mission-trio--ebc {");
  lines.push("  position: fixed;");
  lines.push("  bottom: 0;");
  lines.push("  left: 0;");
  lines.push("  right: 0;");
  lines.push("  z-index: 50;");
  lines.push("  display: grid;");
  lines.push("  grid-template-columns: repeat(3, minmax(0, 1fr));");
  lines.push("  border-top: 1px solid var(--p31-glass-border);");
  lines.push("  background: var(--p31-glass-surface);");
  lines.push("  backdrop-filter: blur(12px);");
  lines.push("  -webkit-backdrop-filter: blur(12px);");
  lines.push("}");
  lines.push(".p31-mission-trio--hub {");
  lines.push("  display: flex;");
  lines.push("  flex-wrap: wrap;");
  lines.push("  align-items: center;");
  lines.push("  justify-content: center;");
  lines.push("  gap: var(--p31-space-3);");
  lines.push("}");
  lines.push(".p31-mission-trio__link {");
  lines.push("  display: block;");
  lines.push("  text-decoration: none;");
  lines.push("  color: inherit;");
  lines.push("  border-right: 1px solid rgba(255, 255, 255, 0.06);");
  lines.push("  padding: var(--p31-space-4) var(--p31-space-4);");
  lines.push("  min-width: 0;");
  lines.push("  transition: background var(--p31-duration-base, 200ms) var(--p31-ease-out, ease);");
  lines.push("}");
  lines.push(".p31-mission-trio--ebc .p31-mission-trio__link:last-child { border-right: none; }");
  lines.push('.p31-mission-trio__link[aria-current="page"] {');
  lines.push("  background: rgba(77, 184, 168, 0.1);");
  lines.push("  cursor: default;");
  lines.push("}");
  lines.push(".p31-mission-trio__head {");
  lines.push("  display: flex;");
  lines.push("  align-items: center;");
  lines.push("  gap: 0.35rem;");
  lines.push("  margin-bottom: 0.35rem;");
  lines.push("}");
  lines.push(".p31-mission-trio__dot {");
  lines.push("  width: 0.35rem;");
  lines.push("  height: 0.35rem;");
  lines.push("  border-radius: 999px;");
  lines.push("  background: var(--p31-teal);");
  lines.push("  flex-shrink: 0;");
  lines.push("}");
  lines.push(".p31-mission-trio__link--build .p31-mission-trio__dot { background: var(--p31-phosphorus); }");
  lines.push(".p31-mission-trio__link--create .p31-mission-trio__dot { background: var(--p31-butter); }");
  lines.push(".p31-mission-trio__link--connect .p31-mission-trio__dot { background: var(--p31-coral); }");
  lines.push(".p31-mission-trio__verb {");
  lines.push("  font-family: var(--p31-font-mono);");
  lines.push("  font-size: var(--p31-text-2xs, 0.6rem);");
  lines.push("  font-weight: 700;");
  lines.push("  letter-spacing: 0.12em;");
  lines.push("  text-transform: uppercase;");
  lines.push("  color: var(--p31-cloud);");
  lines.push("}");
  lines.push(".p31-mission-trio__desc {");
  lines.push("  display: block;");
  lines.push("  font-size: var(--p31-text-xs, 0.7rem);");
  lines.push("  line-height: 1.45;");
  lines.push("  color: var(--p31-muted);");
  lines.push("}");
  lines.push(".p31-mission-trio__now { font-weight: 600; color: var(--p31-cyan); margin-right: 0.15em; }");
  lines.push(".p31-mission-trio__link--build { }");
  lines.push(".p31-mission-trio__link--create { }");
  lines.push(".p31-mission-trio__link--connect { }");
  lines.push("@media (prefers-reduced-motion: reduce) {");
  lines.push("  .p31-mission-trio, .p31-mission-trio * {");
  lines.push("    transition-duration: 0.01ms !important;");
  lines.push("    animation-duration: 0.01ms !important;");
  lines.push("  }");
  lines.push("}");
}

/** Design doctrine — Gray Rock → Alive component patterns (p31.designDoctrine/1.0.0) */
function emitDesignDoctrineBlock(lines) {
  lines.push("");
  lines.push("/* p31.designDoctrine — Gray Rock → Alive */");
  lines.push("");

  lines.push("/* Gray Rock: default state for all surfaces */");
  lines.push(".p31-gray-rock {");
  lines.push("  color: var(--p31-cloud);");
  lines.push("  background: var(--p31-void);");
  lines.push("  font-family: var(--p31-font-sans);");
  lines.push("  font-size: var(--p31-text-md);");
  lines.push("  line-height: var(--p31-leading-normal);");
  lines.push("  letter-spacing: var(--p31-tracking-normal);");
  lines.push("}");
  lines.push("");

  lines.push("/* Layout: Focus (single column, centered) */");
  lines.push(".p31-layout-focus {");
  lines.push("  max-width: 42rem;");
  lines.push("  margin-inline: auto;");
  lines.push("  padding-inline: var(--p31-space-5);");
  lines.push("  padding-block: var(--p31-space-8);");
  lines.push("}");
  lines.push("");

  lines.push("/* Layout: Workshop (sidebar + main) */");
  lines.push(".p31-layout-workshop {");
  lines.push("  display: flex;");
  lines.push("  gap: var(--p31-space-6);");
  lines.push("  padding: var(--p31-space-6);");
  lines.push("  min-height: 100dvh;");
  lines.push("}");
  lines.push(".p31-layout-workshop__sidebar {");
  lines.push("  flex: 0 0 14rem;");
  lines.push("  position: sticky;");
  lines.push("  top: var(--p31-space-6);");
  lines.push("  align-self: flex-start;");
  lines.push("  max-height: calc(100dvh - var(--p31-space-12));");
  lines.push("  overflow-y: auto;");
  lines.push("}");
  lines.push(".p31-layout-workshop__main {");
  lines.push("  flex: 1 1 0%;");
  lines.push("  min-width: 0;");
  lines.push("}");
  lines.push("@media (max-width: 639px) {");
  lines.push("  .p31-layout-workshop {");
  lines.push("    flex-direction: column;");
  lines.push("  }");
  lines.push("  .p31-layout-workshop__main {");
  lines.push("    order: 1;");
  lines.push("  }");
  lines.push("  .p31-layout-workshop__sidebar {");
  lines.push("    position: static;");
  lines.push("    flex: none;");
  lines.push("    max-height: none;");
  lines.push("    order: 2;");
  lines.push("  }");
  lines.push("}");
  lines.push("");

  lines.push("/* Layout: Gallery (grid, progressive reveal) */");
  lines.push(".p31-layout-gallery {");
  lines.push("  display: grid;");
  lines.push("  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));");
  lines.push("  gap: var(--p31-space-6);");
  lines.push("  padding: var(--p31-space-6);");
  lines.push("}");
  lines.push("");

  lines.push("/* Glass panel (one per viewport section) */");
  lines.push(".p31-glass {");
  lines.push("  background: var(--p31-glass-surface);");
  lines.push("  border: 1px solid var(--p31-glass-border);");
  lines.push("  border-radius: var(--p31-radius-lg);");
  lines.push("  padding: var(--p31-space-6);");
  lines.push("}");
  lines.push("");

  lines.push("/* Card (gallery item — Gray Rock default, Alive on hover) */");
  lines.push(".p31-card {");
  lines.push("  border: 1px solid var(--p31-border-subtle);");
  lines.push("  border-radius: var(--p31-radius-lg);");
  lines.push("  padding: var(--p31-space-5);");
  lines.push("  transition: border-color var(--p31-duration-fast) var(--p31-ease-standard),");
  lines.push("              background var(--p31-duration-fast) var(--p31-ease-standard);");
  lines.push("}");
  lines.push(".p31-card:hover,");
  lines.push(".p31-card:focus-within {");
  lines.push("  border-color: var(--p31-teal);");
  lines.push("  background: var(--p31-glass-surface);");
  lines.push("}");
  lines.push("@media (prefers-reduced-motion: reduce) {");
  lines.push("  .p31-card { transition: none; }");
  lines.push("}");
  lines.push("");

  lines.push(".p31-card__title {");
  lines.push("  font-size: var(--p31-text-lg);");
  lines.push("  font-weight: 700;");
  lines.push("  line-height: var(--p31-leading-tight);");
  lines.push("  color: var(--p31-cloud);");
  lines.push("  margin: 0 0 var(--p31-space-2) 0;");
  lines.push("}");
  lines.push(".p31-card__desc {");
  lines.push("  font-size: var(--p31-text-sm);");
  lines.push("  color: var(--p31-muted);");
  lines.push("  line-height: var(--p31-leading-normal);");
  lines.push("  margin: 0;");
  lines.push("}");
  lines.push("");

  lines.push("/* Status badge (pill) */");
  lines.push(".p31-badge {");
  lines.push("  display: inline-block;");
  lines.push("  font-size: var(--p31-text-xs);");
  lines.push("  font-weight: 600;");
  lines.push("  letter-spacing: var(--p31-tracking-caps);");
  lines.push("  text-transform: uppercase;");
  lines.push("  padding: 0.125rem var(--p31-space-3);");
  lines.push("  border-radius: var(--p31-radius-full);");
  lines.push("  background: var(--p31-surface2);");
  lines.push("  color: var(--p31-muted);");
  lines.push("}");
  lines.push(
    ".p31-badge--live { background: color-mix(in srgb, var(--p31-phosphorus) 15%, transparent); color: var(--p31-phosphorus); }",
  );
  lines.push(
    ".p31-badge--research { background: color-mix(in srgb, var(--p31-lavender) 15%, transparent); color: var(--p31-lavender); }",
  );
  lines.push(
    ".p31-badge--prototype { background: color-mix(in srgb, var(--p31-butter) 15%, transparent); color: var(--p31-butter); }",
  );
  lines.push(".p31-badge--pending { background: var(--p31-surface2); color: var(--p31-muted); }");
  lines.push("");

  lines.push("/* Buttons */");
  lines.push(".p31-btn {");
  lines.push("  display: inline-flex;");
  lines.push("  align-items: center;");
  lines.push("  justify-content: center;");
  lines.push("  min-height: 48px;");
  lines.push("  padding: var(--p31-space-3) var(--p31-space-5);");
  lines.push("  font-family: var(--p31-font-sans);");
  lines.push("  font-size: var(--p31-text-sm);");
  lines.push("  font-weight: 600;");
  lines.push("  line-height: 1;");
  lines.push("  border-radius: var(--p31-radius-md);");
  lines.push("  border: none;");
  lines.push("  cursor: pointer;");
  lines.push("  transition: background var(--p31-duration-fast) var(--p31-ease-standard),");
  lines.push("              color var(--p31-duration-fast) var(--p31-ease-standard),");
  lines.push("              border-color var(--p31-duration-fast) var(--p31-ease-standard);");
  lines.push("  text-decoration: none;");
  lines.push("}");
  lines.push(".p31-btn:focus-visible {");
  lines.push("  outline: var(--p31-focus-ring) solid var(--p31-focus-color-hub);");
  lines.push("  outline-offset: var(--p31-focus-offset);");
  lines.push("}");
  lines.push(".p31-btn--primary {");
  lines.push("  background: var(--p31-teal);");
  lines.push("  color: var(--p31-void);");
  lines.push("}");
  lines.push(".p31-btn--primary:hover { background: var(--p31-cyan); }");
  lines.push(".p31-btn--secondary {");
  lines.push("  background: transparent;");
  lines.push("  border: 1px solid var(--p31-border-subtle);");
  lines.push("  color: var(--p31-cloud);");
  lines.push("}");
  lines.push(".p31-btn--secondary:hover {");
  lines.push("  border-color: var(--p31-teal);");
  lines.push("  color: var(--p31-teal);");
  lines.push("}");
  lines.push("@media (prefers-reduced-motion: reduce) {");
  lines.push("  .p31-btn { transition: none; }");
  lines.push("}");
  lines.push("");

  lines.push("/* Heading hierarchy (doctrine) */");
  lines.push(".p31-h1 {");
  lines.push("  font-size: var(--p31-text-3xl);");
  lines.push("  font-weight: 700;");
  lines.push("  line-height: var(--p31-leading-tight);");
  lines.push("  letter-spacing: var(--p31-tracking-tight);");
  lines.push("  color: var(--p31-cloud);");
  lines.push("  margin: 0 0 var(--p31-space-4) 0;");
  lines.push("}");
  lines.push(".p31-h2 {");
  lines.push("  font-size: var(--p31-text-xl);");
  lines.push("  font-weight: 700;");
  lines.push("  line-height: var(--p31-leading-tight);");
  lines.push("  color: var(--p31-cloud);");
  lines.push("  margin: var(--p31-space-8) 0 var(--p31-space-3) 0;");
  lines.push("}");
  lines.push(".p31-h3 {");
  lines.push("  font-size: var(--p31-text-lg);");
  lines.push("  font-weight: 600;");
  lines.push("  line-height: var(--p31-leading-snug);");
  lines.push("  color: var(--p31-cloud);");
  lines.push("  margin: var(--p31-space-6) 0 var(--p31-space-2) 0;");
  lines.push("}");
  lines.push("");

  lines.push(".p31-caps {");
  lines.push("  font-size: var(--p31-text-xs);");
  lines.push("  font-weight: 600;");
  lines.push("  letter-spacing: var(--p31-tracking-caps);");
  lines.push("  text-transform: uppercase;");
  lines.push("  color: var(--p31-muted);");
  lines.push("}");
  lines.push("");

  lines.push("/* Section spacing (breathing room) */");
  lines.push(".p31-section {");
  lines.push("  margin-block: var(--p31-space-8);");
  lines.push("}");
  lines.push(".p31-section + .p31-section {");
  lines.push("  padding-top: var(--p31-space-8);");
  lines.push("  border-top: 1px solid var(--p31-border-subtle);");
  lines.push("}");
  lines.push("");

  lines.push("/* User preference overrides (passport-driven) */");
  lines.push(':root[data-p31-density="compact"] {');
  lines.push("  --p31-space-section: var(--p31-space-4);");
  lines.push("  --p31-text-body: var(--p31-text-base);");
  lines.push("}");
  lines.push(':root[data-p31-density="spacious"] {');
  lines.push("  --p31-space-section: var(--p31-space-10);");
  lines.push("  --p31-text-body: var(--p31-text-lg);");
  lines.push("}");
  lines.push(':root[data-p31-contrast="high"] {');
  lines.push("  --p31-cloud: #ffffff;");
  lines.push("  --p31-muted: #9ca3af;");
  lines.push("  --p31-border-subtle: rgba(255, 255, 255, 0.15);");
  lines.push("}");
  lines.push(':root[data-p31-contrast="max"] {');
  lines.push("  --p31-void: #000000;");
  lines.push("  --p31-cloud: #ffffff;");
  lines.push("  --p31-muted: #d1d5db;");
  lines.push("  --p31-border-subtle: #ffffff;");
  lines.push("}");
  lines.push(":root[data-p31-motion='none'] *,");
  lines.push(":root[data-p31-motion='none'] *::before,");
  lines.push(":root[data-p31-motion='none'] *::after {");
  lines.push("  animation-duration: 0s !important;");
  lines.push("  transition-duration: 0s !important;");
  lines.push("}");
  lines.push("");

  lines.push("/* Progressive disclosure (show more) */");
  lines.push(".p31-reveal {");
  lines.push("  display: none;");
  lines.push("}");
  lines.push('.p31-reveal[data-revealed="true"] {');
  lines.push("  display: block;");
  lines.push("}");
  lines.push(".p31-reveal-trigger {");
  lines.push("  display: inline-flex;");
  lines.push("  align-items: center;");
  lines.push("  gap: var(--p31-space-2);");
  lines.push("  color: var(--p31-muted);");
  lines.push("  cursor: pointer;");
  lines.push("  border: none;");
  lines.push("  background: none;");
  lines.push("  font-family: var(--p31-font-sans);");
  lines.push("  font-size: var(--p31-text-sm);");
  lines.push("  padding: var(--p31-space-3) 0;");
  lines.push("}");
  lines.push(".p31-reveal-trigger:hover,");
  lines.push(".p31-reveal-trigger:focus-visible {");
  lines.push("  color: var(--p31-teal);");
  lines.push("}");
}

/**
 * Tailwind theme.extend for Astro — hub appearance hex values (compile-time).
 */
export function buildAstroTailwindThemeExtend(canon) {
  if (canon.schema !== "p31.universalCanon/1.0.0") {
    throw new Error(`expected p31.universalCanon/1.0.0, got ${canon.schema}`);
  }
  const hub = canon.appearances.hub;
  const { colors, glass } = hub;
  return {
    colors: {
      ...colors,
      emerald: colors.phosphorus,
      amber: colors.butter,
      glass: {
        border: glass.border,
        surface: glass.surface,
      },
    },
    fontFamily: {
      sans: canon.typography.fontFamilies.sans,
      mono: canon.typography.fontFamilies.mono,
    },
    backdropBlur: {
      glass: "12px",
    },
  };
}
