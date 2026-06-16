import { Project } from 'ts-morph';
import { tokens } from '../packages/ui/src/tokens';
import * as fs from 'fs';
import * as path from 'path';

// Flatten the token dictionary for reverse lookup
const flattenTokens = (obj: any, prefix = 'tokens'): Record<string, string> => {
  let result: Record<string, string> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      result = { ...result, ...flattenTokens(obj[key], `${prefix}.${key}`) };
    } else {
      // Normalize hex value to uppercase 6-digit form for reliable matching
      let val = String(obj[key]);
      // Ensure it's a hex color and normalize to 6-digit uppercase
      if (val.startsWith('#')) {
        const hex = val.slice(1);
        if (hex.length === 3) {
          // Expand #RGB to #RRGGBB
          const expanded = hex.split('').map(c => c + c).join('');
          val = `#${expanded.toUpperCase()}`;
        } else if (hex.length === 6) {
          val = `#${hex.toUpperCase()}`;
        }
        // For rgba/hsla we keep as is (but they won't match hex regex anyway)
      }
      result[val] = `${prefix}.${key}`;
    }
  }
  return result;
};

const tokenMap = flattenTokens(tokens);

// Helper to normalize input hex for matching
const normalizeHex = (hex: string): string => {
  if (!hex.startsWith('#')) return hex;
  const h = hex.slice(1);
  if (h.length === 3) {
    // Expand #RGB to #RRGGBB
    const expanded = h.split('').map(c => c + c).join('');
    return `#${expanded.toUpperCase()}`;
  }
  if (h.length === 6) {
    return `#${h.toUpperCase()}`;
  }
  return hex; // fallback
};

async function suggestMigration(targetFile: string) {
  const filePath = path.resolve(process.cwd(), targetFile);
  if (!fs.existsSync(filePath)) {
    console.error(`[Abort] File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`\nAnalyzing ${targetFile} for UI Debt...`);

  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(filePath);
  const text = sourceFile.getText();
  const lines = text.split('\n');

  let debtFound = false;

  lines.forEach((line, index) => {
    // Check for hardcoded hex codes
    const hexMatches = line.match(/#[0-9a-fA-F]{3,8}/g);
    if (hexMatches) {
      hexMatches.forEach(hex => {
        const normalizedHex = normalizeHex(hex);
        const suggestedToken = tokenMap[normalizedHex];

        debtFound = true;
        console.log(`\nLine ${index + 1}:`);
        console.log(`  - Found: ${hex}`);
        if (suggestedToken) {
          console.log(`  + Suggestion: Replace with \`${suggestedToken}\``);
        } else {
          console.log(`  ! Warning: No exact token match found. Check token dictionary.`);
        }
      });
    }

    // Check for raw pixel padding/margins
    const spacingMatch = line.match(/(padding|margin)[^:]*:\s*'(\d+px)'/i);
    if (spacingMatch) {
      debtFound = true;
      console.log(`\nLine ${index + 1}:`);
      console.log(`  - Found: ${spacingMatch[0]}`);
      console.log(`  + Suggestion: Evaluate against \`tokens.space\` (xs: 4px, sm: 8px, md: 16px, base: 0.75rem)`);
    }
  });

  if (!debtFound) {
    console.log(`\n[Clear] No actionable UI debt detected in this file.`);
  }
  console.log('\n--- End of Suggestions ---\n');
}

// Extract args and run
const args = process.argv.slice(2);
const fileArg = args.find(a => a.startsWith('--file='));
if (!fileArg) {
  console.error("Usage: tsx scripts/suggest-migration.ts --file=path/to/file.tsx");
  process.exit(1);
}

suggestMigration(fileArg.split('=')[1]);
