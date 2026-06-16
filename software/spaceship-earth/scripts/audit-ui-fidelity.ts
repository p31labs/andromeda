import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';
import { tokens } from '../packages/ui/src/tokens';

// Flatten token values for quick lookup
const flattenTokenValues = (obj: any, prefix = ''): Set<string> => {
  const set = new Set<string>();
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === 'object' && val !== null) {
      for (const v of Object.values(flattenTokenValues(val, `${prefix}${key}.`))) {
        set.add(v);
      }
    } else if (typeof val === 'string') {
      // Normalize hex to uppercase 6-digit for comparison
      let hex = val;
      if (hex.startsWith('#')) {
        const h = hex.slice(1);
        if (h.length === 3) {
          // expand #RGB to #RRGGBB
          const expanded = h.split('').map(c => c + c).join('');
          hex = `#${expanded.toUpperCase()}`;
        } else if (h.length === 6) {
          hex = `#${h.toUpperCase()}`;
        }
        // keep as is for rgba etc.
      }
      set.add(hex);
    }
  }
  return set;
};

const tokenValues = flattenTokenValues(tokens);

// Regex patterns
const HEX_REGEX = /#[0-9a-fA-F]{3,8}/g;
const INLINE_STYLE_REGEX = /style=\{\{/g;
const PX_SPACING_REGEX = /(padding|margin)(Top|Bottom|Left|Right)?:\s*\d+px/g;

// Weights
const HEX_WEIGHT = 1;
const INLINE_WEIGHT = 2;
const SPACING_WEIGHT = 1;

// Files to ignore
const IGNORE_GLOBS = ['**/node_modules/**', '**/dist/**', '**/.cache/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'];

async function runAudit() {
  console.log('Scanning monorepo for UI debt...');

  // Define source roots (adjust as needed)
  const sourceGlobs = [
    'packages/**/src/**/*.{ts,tsx}',
    'apps/**/src/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}'
  ];

  let totalHex = 0;
  let totalInline = 0;
  let totalSpacing = 0;
  const projectDebt: Record<string, { hex: number; inline: number; spacing: number; score: number }> = {};

  for (const globPattern of sourceGlobs) {
    const files = await glob(globPattern, { ignore: [...IGNORE_GLOBS] });
    for (const file of files) {
      // Determine project name from path (simplistic: first directory after software/ or apps/)
      let project = 'unknown';
      const parts = file.split(path.sep);
      if (parts.includes('software')) {
        const idx = parts.indexOf('software');
        if (parts[idx + 1]) project = parts[idx + 1];
      } else if (parts.includes('apps')) {
        const idx = parts.indexOf('apps');
        if (parts[idx + 1]) project = parts[idx + 1];
      } else if (parts.includes('src')) {
        const idx = parts.indexOf('src');
        if (parts[idx - 1]) project = parts[idx - 1];
      }
      if (!projectDebt[project]) {
        projectDebt[project] = { hex: 0, inline: 0, spacing: 0, score: 100 };
      }

      try {
        const content = await fs.promises.readFile(file, 'utf8');

        // Hex colors
        const hexMatches = content.match(HEX_REGEX) || [];
        for (const hex of hexMatches) {
          // Normalize
          let norm = hex;
          if (hex.startsWith('#')) {
            const h = hex.slice(1);
            if (h.length === 3) {
              const expanded = h.split('').map(c => c + c).join('');
              norm = `#${expanded.toUpperCase()}`;
            } else if (h.length === 6) {
              norm = `#${h.toUpperCase()}`;
            }
          }
          if (!tokenValues.has(norm)) {
            totalHex++;
            projectDebt[project].hex++;
          }
        }

        // Inline styles
        const inlineMatches = content.match(INLINE_STYLE_REGEX) || [];
        totalInline += inlineMatches.length;
        projectDebt[project].inline += inlineMatches.length;

        // Pixel spacing
        const spacingMatches = content.match(PX_SPACING_REGEX) || [];
        totalSpacing += spacingMatches.length;
        projectDebt[project].spacing += spacingMatches.length;
      } catch (err) {
        console.error(`Failed to read ${file}: ${err}`);
      }
    }
  }

  // Compute scores per project
  for (const [project, debt] of Object.entries(projectDebt)) {
    const debtScore = debt.hex * HEX_WEIGHT + debt.inline * INLINE_WEIGHT + debt.spacing * SPACING_WEIGHT;
    debt.score = Math.max(0, 100 - debtScore);
  }

  // Global fidelity: average of project scores, or compute from total debt
  const totalDebt = totalHex * HEX_WEIGHT + totalInline * INLINE_WEIGHT + totalSpacing * SPACING_WEIGHT;
  const globalScore = Math.max(0, 100 - totalDebt);

  const report = {
    projects: projectDebt,
    globalFidelity: globalScore,
    totals: { hex: totalHex, inline: totalInline, spacing: totalSpacing, totalDebt }
  };

  // Ensure docs directory exists
  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  const outPath = path.join(docsDir, 'UI_AUDIT_REPORT.json');
  await fs.promises.writeFile(outPath, JSON.stringify(report, null, 2));

  console.log(`Audit complete. Global Fidelity: ${globalScore.toFixed(1)}%`);
  console.log(`Report written to: ${outPath}`);
  console.log(`Totals: Hex=${totalHex}, Inline=${totalInline}, Spacing=${totalSpacing}, Total Debt=${totalDebt}`);
}

runAudit().catch(console.error);
