const { getChaosVault, ingestToChaosVault, updateEmbedding } = require('./dist/lib/ChaosVault');
const { embedText } = require('./dist/lib/Embedder');

async function ingestBTP() {
  const entries = [
    {
      id: 'btp_section_1_overview',
      source: 'biological-tdp',
      rawText: 'System Designation W.JOHNSON-001. Male age 40. Former US Navy submarine electrical technician 16 years GS-0802-12. Primary diagnoses: Hypoparathyroidism ICD-10 E20.9, ADHD F90.0, Autism Spectrum Disorder F84.0. Three interdependent subsystems: endocrine calcium homeostasis, AuDHD neurological architecture, pharmacological maintenance. Six month monitoring gap prior to legal proceedings represents Class A maintenance violation.',
      metadata: { section: 'overview', type: 'medical-legal' }
    },
    {
      id: 'btp_section_2_endocrine',
      source: 'biological-tdp',
      rawText: 'Hypoparathyroidism pathophysiology: PTH deficiency causes loss of renal calcium conservation, hyperphosphatemia, impaired calcitriol synthesis. Medical Baseline target: total serum calcium 8.2-8.8 mg/dL. Critical threshold: <7.6 mg/dL emergency. Documented crisis: 7.8 mg/dL on May 14 2025. Symptoms cascade: paresthesias -> tetany -> seizures -> cardiac arrhythmias. Calcitriol dosing 0.5-2.0ug/day. Calcium supplementation 1000-3000mg elemental daily divided doses. Monitoring: calcium phosphate creatinine every 3 months minimum. 6-month gap in monitoring prior to legal proceedings caused predictable neurocognitive instability.',
      metadata: { section: 'endocrine', type: 'medical-legal' }
    },
    {
      id: 'btp_section_3_neurological',
      source: 'biological-tdp',
      rawText: 'AuDHD architecture: Autism + ADHD co-occurrence 50-70% with 72% shared genetic factors. Neurological effects of hypocalcemia: extracellular calcium stabilizes voltage gated sodium channels. Hypocalcemia shifts activation threshold more negative causing spontaneous neuronal firing. Results: neuromuscular irritability, cognitive confusion, emotional lability, GABAergic inhibition reduced. Processing speed most commonly impaired domain. Working memory buffer 7+/-2 items. Task switching costs disproportionate. Time blindness common. Masking is metabolically expensive - hair cortisol elevation documented. Autistic burnout lasts months to years. Rejection Sensitive Dysphoria in 99% of ADHD adults.',
      metadata: { section: 'neurological', type: 'medical-legal' }
    },
    {
      id: 'btp_section_4_posner',
      source: 'biological-tdp',
      rawText: 'Posner molecule Ca9(PO4)6 as quantum biological substrate. Phosphorus-31 nuclear spin 1/2 as biological qubit. Fisher hypothesis: Posner molecules protect nuclear spins from decoherence acting as quantum memory. In hypoparathyroidism: chronic hypocalcemia reduces calcium availability for Posner formation, hyperphosphatemia alters Ca:P ratio, potentially disrupting quantum processing substrate. Provides mechanistic hypothesis connecting calcium status to quantum level cognitive effects.',
      metadata: { section: 'quantum-biology', type: 'medical-legal' }
    },
    {
      id: 'btp_section_5_fawn_guard',
      source: 'biological-tdp',
      rawText: 'Fawn Guard algorithm for real-time detection of trauma-based people-pleasing in digital text. Fawning clinically recognized trauma response: hyper-apologetic language, boundary self-erasure, excessive acquiescence, suppression of personal needs to appease authority. Detection patterns: sorry for/I know I should/whatever you think/youre right/never mind/Ill try harder. Neurological basis: AuDHD executive dysfunction prevents short boundary emails, traps in over-explaining loops. Floating neutral analogy: loss of social grounding causes emotional voltage instability. RSD in 99% of ADHD adults - 20000+ more critical messages by age 12.',
      metadata: { section: 'fawn-guard', type: 'technical-medical' }
    },
    {
      id: 'btp_section_6_legal',
      source: 'biological-tdp',
      rawText: 'Disability discrimination: treating metabolic crisis as psychiatric deficit. No meaningful access under ADA Title II. 7.8 mg/dL calcium crash not bipolar mania. Neurocognitive symptoms from hypocalcemia mimic psychiatric conditions. Court-ordered funks evaluation does not establish medical baseline for permanent disability. Consent order 10/23/25 void ab initio: signed by attorney terminated 10/20/25. Material misrepresentation of federal tax law regarding TSP early withdrawal penalties under 26 USC 72(t)(2)(C). Financial damage: ,079 total loss from forced liquidation.',
      metadata: { section: 'legal', type: 'medical-legal' }
    },
    {
      id: 'btp_section_posner_medical_device',
      source: 'biological-tdp',
      rawText: 'Phenix Navigator and Tetrahedron Protocol as medical prosthetics under 21 CFR 890.3710 Powered Communication Systems. Required for social communication and executive function. Not mere computers but clinical necessities for specific biological architecture. Seizure or disparagement constitutes direct threat to life and parental capacity.',
      metadata: { section: 'medical-device', type: 'medical-legal' }
    }
  ];

  const db = await getChaosVault();
  let count = 0;
  for (const entry of entries) {
    try {
      const embedding = await embedText(entry.rawText);
      await db.query(
        'INSERT INTO unified_knowledge_graph (id, source_door, raw_text, embedding, metadata, created_at) VALUES (, , , , , ) ON CONFLICT (id) DO UPDATE SET raw_text = , metadata = , created_at = ',
        [entry.id, entry.source, entry.rawText, embedding ? Buffer.from(new Float32Array(embedding).buffer) : null, JSON.stringify(entry.metadata), Date.now()]
      );
      count++;
    } catch (e) {
      console.error('Failed to ingest:', entry.id, e.message);
    }
  }
  console.log('Ingested', count, 'BTP entries');
}

ingestBTP().catch(console.error);
