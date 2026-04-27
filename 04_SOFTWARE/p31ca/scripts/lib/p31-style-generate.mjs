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

  return { css: cssLines.join("\n"), js };
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
