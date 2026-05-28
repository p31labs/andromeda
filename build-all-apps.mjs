#!/usr/bin/env node
/**
 * P31 Andromeda - Universal App Builder
 * Builds all family apps using the root vite installation
 */
import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// App directories to build (relative to ROOT)
const APPS = [
  { name: 'chromatica', path: '02_Client_or_Misc/chromatica', built: true },
  { name: 'matriarch-culinary', path: '02_Client_or_Misc/matriarch-culinary-node/dashboard', built: false },
  { name: 'fantasy-sports', path: '02_Client_or_Misc/fantasy-sports', built: false },
  { name: 'p31-vibe-studio', path: 'p31-vibe-studio', built: false },
  { name: 'fence-pro', path: '02_Client_or_Misc/fence-pro', built: false },
  { name: 'lighthouse-edu', path: '02_Client_or_Misc/lighthouse-edu', built: true },
];

const results = [];

for (const app of APPS) {
  if (app.built) {
    console.log(`\n✅ ${app.name} - already built`);
    results.push({ name: app.name, status: 'already-built' });
    continue;
  }

  const appPath = resolve(ROOT, app.path);
  const indexHtml = join(appPath, 'index.html');
  const viteConfig = join(appPath, 'vite.config.ts');
  const viteConfigJs = join(appPath, 'vite.config.js');
  const pkgJson = join(appPath, 'package.json');

  console.log(`\n🔨 Building ${app.name}...`);
  console.log(`   Path: ${app.path}`);

  // Check prerequisites
  if (!existsSync(indexHtml)) {
    console.log(`   ❌ Missing index.html`);
    results.push({ name: app.name, status: 'failed', error: 'Missing index.html' });
    continue;
  }
  if (!existsSync(pkgJson)) {
    console.log(`   ❌ Missing package.json`);
    results.push({ name: app.name, status: 'failed', error: 'Missing package.json' });
    continue;
  }

  // Determine vite config
  let configArg = '';
  if (existsSync(viteConfig)) {
    configArg = `--config "${viteConfig}"`;
  } else if (existsSync(viteConfigJs)) {
    configArg = `--config "${viteConfigJs}"`;
  }

  // Read package.json to check for vite
  try {
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (!deps.vite && !existsSync(join(appPath, 'node_modules', 'vite'))) {
      // Create a vite config that uses root vite
      const configContent = `import { defineConfig } from 'vite';
import { resolve } from 'path';
const root = resolve(__dirname);
export default defineConfig({
  root,
  build: { outDir: resolve(root, 'dist'), sourcemap: true },
  resolve: { alias: { '@': resolve(root, 'src') } },
});
`;
      const configPath = join(appPath, 'vite.config.ts');
      if (!existsSync(configPath)) {
        import('fs').then(fs => fs.writeFileSync(configPath, configContent));
        configArg = `--config "${configPath}"`;
      }
    }
  } catch (e) {}

  try {
    // Install deps first
    console.log(`   📦 Installing dependencies...`);
    execSync('pnpm install', { cwd: appPath, stdio: 'pipe', timeout: 120000 });

    // Build with vite
    console.log(`   🏗️  Building...`);
    const buildCmd = configArg
      ? `npx vite build ${configArg}`
      : `npx vite build`;

    execSync(buildCmd, {
      cwd: appPath,
      stdio: 'pipe',
      timeout: 120000,
      env: { ...process-env, NODE_ENV: 'production' }
    });

    // Check for dist
    const distPath = join(appPath, 'dist');
    if (existsSync(distPath)) {
      const files = readdirSync(distPath);
      console.log(`   ✅ Built successfully! (${files.length} files in dist/)`);
      results.push({ name: app.name, status: 'success', files: files.length });
    } else {
      console.log(`   ⚠️  Build completed but no dist/ found`);
      results.push({ name: app.name, status: 'no-dist' });
    }
  } catch (err) {
    console.log(`   ❌ Build failed: ${err.message?.substring(0, 100)}`);
    results.push({ name: app.name, status: 'failed', error: err.message?.substring(0, 200) });
  }
}

console.log('\n\n📊 BUILD RESULTS:');
console.log('─'.repeat(50));
for (const r of results) {
  const icon = r.status === 'success' || r.status === 'already-built' ? '✅' : '❌';
  console.log(`${icon} ${r.name}: ${r.status}${r.files ? ` (${r.files} files)` : ''}${r.error ? ` - ${r.error}` : ''}`);
}
