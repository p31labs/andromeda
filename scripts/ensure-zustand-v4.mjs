import { cpSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';

const root = dirname(new URL(import.meta.url).pathname.slice(1));
const src = join(root, 'software', 'node_modules', '.pnpm',
  'zustand@4.5.7_@types+react@18.3.28_react@18.3.1',
  'node_modules', 'zustand');
const dst = join(root, 'software', 'p31ca', 'node_modules', 'zustand');

if (!existsSync(src)) {
  console.log('[ensure-zustand-v4] source not found');
  process.exit(0);
}

if (existsSync(dst)) unlinkSync(dst);
mkdirSync(dirname(dst), { recursive: true });
cpSync(src, dst, { recursive: true });
console.log('[ensure-zustand-v4] copied zustand v4 to p31ca/node_modules');
