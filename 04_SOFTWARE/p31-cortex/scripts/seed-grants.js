#!/usr/bin/env node
/**
 * P31 Grant Seeding Script
 *
 * Seeds the Cortex GrantAgent DO with the current active grant pipeline.
 * Run: node seed-grants.js
 *
 * Requires CORTEX_API_SECRET or unsecured endpoint for local dev.
 */

const INDEX = [
  {
    title: "NLnet NGI Zero Commons",
    funder: "NLnet Foundation",
    amount: 15000,
    deadline: "2026-06-01",
    status: "assembling",
    requirements: ["EIN", "1023-EZ pending", "SAM UEI", "operator narrative review"],
    notes: "Draft complete at docs/grants/nlnet-ngi-zero-commons-application.md. Needs operator voice review before submission."
  },
  {
    title: "ASAN Teighlor McGee Disability Justice Mini-Grant",
    funder: "Autistic Self Advocacy Network",
    amount: 6250,
    deadline: "2026-07-31",
    status: "researching",
    requirements: ["501(c)(3) determination or CP575E", "500-word narrative (operator voice)"],
    notes: "Portal opens May 15, 2026. Submit immediately. AuDHD + hypoparathyroidism angle must be in operator's words."
  },
  {
    title: "Stimpunks Foundation Micro-Grant",
    funder: "Stimpunks Foundation",
    amount: 3000,
    deadline: "2026-06-01",
    status: "researching",
    requirements: ["IP filing receipts", "hardware BOM"],
    notes: "Reopens June 1. Apply same day. Node One (Totem) prototype + provisional patents."
  },
  {
    title: "Awesome Foundation",
    funder: "Awesome Foundation",
    amount: 1000,
    deadline: "2026-04-30",
    status: "submitted",
    requirements: [],
    notes: "April 2026 deliberation in progress. If accepted: Home Assistant host, Bangle.js 2, kids tablets."
  },
  {
    title: "Microsoft AI for Accessibility",
    funder: "Microsoft Corporation",
    amount: 75000,
    deadline: "2026-12-31",
    status: "researching",
    requirements: ["501(c)(3) determination letter", "demo video", "accessibility test plan"],
    notes: "Rolling deadline. Draft content pack ready. Cognitive Passport AI augmentation layer."
  },
  {
    title: "NIDILRR Switzer Fellowship",
    funder: "NIDILRR ( Dept of Ed )",
    amount: 80000,
    deadline: "2027-02-01",
    status: "researching",
    requirements: ["University partnership as host institution", "career development plan"],
    notes: "FY2027 cycle. Need academic partner (Georgia Tech CIDI?). Investigate eligibility."
  },
  {
    title: "NIDILRR FIP Development Grant",
    funder: "NIDILRR ( Dept of Ed )",
    amount: 250000,
    deadline: "2027-03-15",
    status: "researching",
    requirements: ["University partnership", "3-year research plan", "substantial matching funds"],
    notes: "FY2027 track. Large federal disability research grant. Investigate sub-award pathways."
  }
];

const CORTEX_URL = 'https://p31-cortex.trimtab-signal.workers.dev/api/grant/init';

async function seed() {
  console.log(`Seeding ${INDEX.length} grants into GrantAgent...`);

  for (const g of INDEX) {
    try {
      const resp = await fetch(CORTEX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(g)
      });

      if (resp.ok) {
        const result = await resp.json();
        console.log(`✅ ${g.title} → ${result.id}`);
      } else {
        const err = await resp.text();
        console.error(`❌ ${g.title}: ${resp.status} ${err}`);
      }
    } catch (e) {
      console.error(`❌ ${g.title}: ${e.message}`);
    }
  }

  console.log('\n✅ Seeding complete. Run `curl ${CORTEX_URL.replace('/init', '/run')}` to trigger deadline sweep.');
}

seed();
