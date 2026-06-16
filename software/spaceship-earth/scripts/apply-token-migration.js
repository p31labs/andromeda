import { readFileSync, writeFileSync } from 'fs';

// ---- Token map derived from the suggestion engine (hex → token) ----
const tokenMap = {
  '#00e8ff': 'tokens.color.accent.cyan',
  '#ffbf00': 'tokens.color.status.warning',
  '#ef4444': 'tokens.color.status.error',
  '#050510': 'tokens.color.background.vaultDark',
  '#e8e6e3': 'tokens.color.text.bright2',
  '#8a8a95': 'tokens.color.text.dimmed',
  '#fff': 'tokens.color.text.bright',
  '#333': 'tokens.color.background.vaultSurface2',
  '#111': 'tokens.color.background.vaultCore2',
  '#fecaca': 'tokens.color.status.errorLight',
  '#0a0a12': 'tokens.color.background.vaultDeep',
  '#2a2a35': 'tokens.color.background.vaultSurface',
  '#0c0c14': 'tokens.color.background.vaultCore',
  '#86efac': 'tokens.color.status.successLight',
  // The three #4ade80 instances map to tokens.color.stage.sprout
  '#4ade80': 'tokens.color.stage.sprout'
};

// Helper: decide what to do with the 12px spacing
// 12px = 0.75rem → we added a `base` token to space
const spacingReplacement = "tokens.space.base";

function replaceAll(str, search, replace) {
  return str.split(search).join(replace);
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf8');

  // 1. Ensure the import exists (add if missing)
  if (!content.includes('import { tokens } from \'@p31/ui\';')) {
    // Insert after the first import line or at the very top
    const importLine = 'import { tokens } from \'@p31/ui\';';
    const lines = content.split('\n');
    // Find first import line
    let insertIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ') && lines[i].endsWith('from')) {
        insertIdx = i + 1;
        break;
      }
    }
    lines.splice(insertIdx, 0, importLine);
    content = lines.join('\n');
  }

  // 2. Replace all hex color values
  for (const [hex, token] of Object.entries(tokenMap)) {
    content = replaceAll(content, hex, token);
  }

  // 3. Replace the 12px spacing (look for the exact pattern)
  content = replaceAll(content, "padding: '12px'", `padding: ${spacingReplacement}`);

  writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Processed ${filePath}`);
}

// Run
const target = '../p31-hearing-ops/src/P31OmnibusVault.jsx';
try {
  processFile(target);
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
