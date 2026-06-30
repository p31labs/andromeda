import fs from 'fs';
import path from 'path';

const log = (msg) => console.log(`[Verify] ${msg}`);
const fail = (msg) => { console.error(`❌ [ERROR] ${msg}`); process.exit(1); };

log('Starting PayPal Monetary Surface Verification...');

// 1. Worker Checks
const workerPath = path.join(process.cwd(), 'software/donate-api/src/worker.ts');
if (fs.existsSync(workerPath)) {
  const workerCode = fs.readFileSync(workerPath, 'utf8');
  if (workerCode.includes('api.stripe.com')) fail('worker.ts still contains Stripe API references.');
  if (!workerCode.includes('paypal-api-m.sandbox.paypal.com') && !workerCode.includes('paypal-api-m.paypal.com')) {
    fail('worker.ts missing PayPal API URLs.');
  }
  if (!workerCode.includes('/health') || !workerCode.includes('/create-checkout') || !workerCode.includes('/paypal-webhook')) {
    fail('worker.ts missing required routing endpoints.');
  }
  log('✅ Worker routing and PayPal API URLs verified.');
}

// 2. Frontend Astro Checks
const astroPath = path.join(process.cwd(), 'phosphorus31.org/planetary-planet/src/pages/donate.astro');
if (fs.existsSync(astroPath)) {
  const astroCode = fs.readFileSync(astroPath, 'utf8');
  if (astroCode.includes('sk_live_') || astroCode.includes('sk_test_') || astroCode.includes('pk_live_') || astroCode.includes('pk_test_')) {
    fail('Stripe keys found in donate.astro.');
  }
  if (!astroCode.includes('donate-api.phosphorus31.org/create-checkout')) {
    fail('donate.astro does not call the new PayPal checkout endpoint.');
  }
  log('✅ Astro frontend PayPal integration verified.');
}

// 3. Secret Leak Scan
log('Scanning for leaked PayPal secrets...');
const directoriesToScan = ['software/donate-api/src', 'phosphorus31.org', 'software/p31ca/public'];
directoriesToScan.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath, { recursive: true });
    files.forEach(file => {
      if (fs.statSync(path.join(fullPath, file)).isFile()) {
        const content = fs.readFileSync(path.join(fullPath, file), 'utf8');
        if (content.match(/(PAYPAL_CLIENT_SECRET|PAYPAL_WEBHOOK_ID)["']?\s*:\s*["'][a-zA-Z0-9_-]{10,}/)) {
          fail(`Potential hardcoded PayPal secret found in ${file}`);
        }
      }
    });
  }
});
log('✅ No hardcoded secrets detected.');
log('🎉 Monetary surface verification passed!');
