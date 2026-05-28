/**
 * LegalVaultSurface.tsx — Searchable legal document repository.
 *
 * Pre-loaded with the P31 legal blueprint for the custody case.
 * All data stored locally. Zero cloud. Searchable via RAG.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { getChaosVault, recentEntries, type KnowledgeEntry } from '../lib/ChaosVault';

interface LegalSection {
  id: string;
  phase: number;
  title: string;
  category: 'settlement' | 'corporate' | 'technical' | 'tax';
  content: string;
}

const LEGAL_BLUEPRINT: LegalSection[] = [
  {
    id: 'legal_4_01', phase: 1, title: 'Stipulation of Present Corporate Value and COCOMO Waiver',
    category: 'settlement',
    content: `Section 4.01. The Parties acknowledge that the Husband is the Founder/CEO of P31 Labs, Inc., an open-source, pre-revenue entity. Following a review of the enterprise's developmental phase, the Parties explicitly stipulate that the divisible, liquid marital interest in P31 Labs, Inc. is exactly Zero Dollars ($0.00). The Wife explicitly waives and disclaims any reliance upon algorithmic software cost estimation models (including COCOMO II) for establishing marital asset value, acknowledging that historical development cost does not equate to present fair market value or liquid equity.`,
  },
  {
    id: 'legal_4_02', phase: 1, title: 'Transfer of Marital Residence in Lieu of Present Corporate Equity',
    category: 'settlement',
    content: `Section 4.02. In direct consideration for the Wife's agreement to the valuation in Section 4.01, the Husband agrees to transfer, assign, and quitclaim his entire interest in the marital residence. The Wife shall retain 100% of the net equity. This transfer constitutes a finalized, non-modifiable division of marital property.`,
  },
  {
    id: 'legal_4_03', phase: 1, title: 'Creation and Operation of the PQC Family Vault',
    category: 'settlement',
    content: `Section 4.03. As a further, final, and non-modifiable equitable division of property (categorized as division of property rather than modifiable spousal support), the Husband shall deploy a Post-Quantum Cryptographic Vault (PQC Vault) for the contingent future economic benefit of the Wife. The PQC Vault shall receive exactly the defined percentage of net distributed revenue from P31 Labs operations. This automated routing represents the absolute entirety of the Wife's claim against future capitalization.`,
  },
  {
    id: 'legal_4_04', phase: 1, title: 'Absolute Waiver of Future Financial Discovery',
    category: 'settlement',
    content: `Section 4.04. The establishment of the PQC Vault and transfer of the marital residence fully resolves all claims regarding P31 Labs, Inc. The Wife forever waives any right to compel post-judgment financial discovery, corporate audits, or valuation proceedings against P31 Labs, Inc. Pursuant to Georgia law (Holler v. Holler), this equitable division is non-modifiable.`,
  },
  {
    id: 'legal_corp_1', phase: 2, title: 'Corporate Governance — Non-Voting Observer Seat',
    category: 'corporate',
    content: `Corporate Resolution: The Board of Directors hereby creates a non-fiduciary, non-voting position known as the Sanctuary Vault Observer Seat. The Designated Observer shall possess the limited right to attend general strategic meetings and receive philanthropic operating reports. The Designated Observer shall have no voting rights, no ability to propose binding resolutions, and no statutory right of access to inspect proprietary algorithms, raw source code, or internal financial ledgers.`,
  },
  {
    id: 'legal_tech_1', phase: 3, title: 'Technical Architecture — PQC Vault (Stripe Connect + CIRCL)',
    category: 'technical',
    content: `1. Stripe Connect on Cloudflare: Using Destination Charges, Stripe immediately deducts processing fees, calculates the court-ordered percentage, and routes funds directly to a connected Stripe Express account. The Husband never touches the money.

2. Post-Quantum Cryptography (CIRCL + PGLite): The CF Worker executes WASM routines using Cloudflare CIRCL library:

- ML-KEM (Kyber) for key encapsulation
- ML-DSA (Dilithium) for non-forgeable digital signatures on every payment receipt
- Signed receipts stored immutably in PGLite for mathematical proof of court-order fulfillment`,
  },
  {
    id: 'legal_tax_1', phase: 4, title: 'Tax & Liability Shielding — IRC §1041 and Rev. Ruling 2002-22',
    category: 'tax',
    content: `The primary danger is the Assignment of Income Doctrine. Shield: IRC Section 1041 and IRS Revenue Ruling 2002-22. By legally codifying the PQC Vault in the Consent Order as a "transfer of a vested property right to future corporate revenue streams incident to divorce," the IRS requires the ex-spouse (transferee) to include distributions in her own gross income. Stripe Connect routes funds directly to her account; Stripe generates 1099-K in her name. Revenue bypasses the Husband's personal tax return entirely.`,
  },
  {
    id: 'legal_sunny', phase: 0, title: 'Initial Settlement Communication Framework (The Sunny Day Email)',
    category: 'settlement',
    content: `Communication strategy: Open with acknowledged common ground (children's wellbeing, desire for resolution). Present the zero-dollar corporate valuation as a factual pre-revenue assessment, not a negotiation position. Frame the PQC Vault as generosity beyond legal obligation, not an admission of value. Close with a request for a good-faith meeting, not a demand.`,
  },
  {
    id: 'legal_cocomo_rebuttal', phase: 0, title: 'COCOMO II Valuation Rebuttal Strategy',
    category: 'settlement',
    content: `Opposing counsel may attempt to value P31 Labs using COCOMO II based on lines of code. Rebuttal: COCOMO II estimates development COST, not market VALUE. Pre-revenue open-source projects have no revenue multiple to apply. Historical code investment ≠ liquid equity. Analogy: Writing a book costs time and effort, but the manuscript has zero market value until a publisher acquires it. The $5M COCOMO threat is a valuation method error, not a factual claim.`,
  },
  {
    id: 'legal_zenodo', phase: 0, title: 'Prior Art via Defensive Publication (Zenodo DOI: 10.5281/zenodo.18627420)',
    category: 'settlement',
    content: `The Tetrahedron Protocol was defensively published on Zenodo (DOI: 10.5281/zenodo.18627420) with CC BY 4.0 license. This establishes prior art dated [publication date], preventing any future patent claims by either party on the core cryptographic architecture. Five supporting white papers finalized March 17, 2026, published to Internet Archive February 25, 2026, as additional prior art documentation.`,
  },
];

interface Props {
  className?: string;
}

export const LegalVaultSurface: React.FC<Props> = ({ className }) => {
  const { spoons } = useAtmosphere();
  const [sections, setSections] = useState<LegalSection[]>(LEGAL_BLUEPRINT);
  const [selectedSection, setSelectedSection] = useState<LegalSection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stored, setStored] = useState(false);

  const filteredSections = sections.filter((s) => {
    const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;
    const matchesSearch = !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleStoreAll = useCallback(async () => {
    try {
      const db = await getChaosVault();
      for (const section of LEGAL_BLUEPRINT) {
        const id = `legal_${section.id}_${Date.now()}`;
        await db.query(
          `INSERT INTO unified_knowledge_graph (id, source_door, raw_text, metadata, created_at) VALUES ($1, $2, $3, $4, $5)`,
          [id, 'legal', section.content, JSON.stringify({ phase: section.phase, title: section.title, category: section.category }), Date.now()]
        );
      }
      setStored(true);
    } catch {
      // Silent — PGLite may not be ready
    }
  }, []);

  const totalChars = sections.reduce((acc, s) => acc + s.content.length, 0);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#c084fc' }}>Legal Vault</h1>
          <p className="text-[10px]" style={{ color: '#3b2e54' }}>
            P31 custody case reference · {sections.length} sections · {totalChars.toLocaleString()} chars · Local-only
          </p>
        </div>
        <button
          onClick={handleStoreAll}
          disabled={stored}
          className="text-[10px] px-3 py-1 rounded-lg font-semibold disabled:opacity-30"
          style={{ backgroundColor: stored ? '#059669' : '#7c3aed', color: stored ? '#f0fdf4' : '#f5f3ff' }}
        >
          {stored ? '✓ Indexed to PGLite' : '→ Index to Knowledge Graph'}
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1 mb-3">
        {(['all', 'settlement', 'corporate', 'technical', 'tax'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className="text-[10px] px-2 py-1 rounded-md"
            style={{
              backgroundColor: categoryFilter === cat ? 'rgba(192,132,252,0.15)' : 'transparent',
              border: `1px solid ${categoryFilter === cat ? '#c084fc' : '#3b2e54'}`,
              color: categoryFilter === cat ? '#c084fc' : '#665577',
            }}
          >
            {cat === 'all' ? `all (${sections.length})` : `${cat} (${sections.filter(s => s.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search legal sections..."
        className="w-full py-2 px-3 text-xs rounded-lg mb-3"
        style={{ backgroundColor: 'rgba(10,2,8,0.6)', border: '1px solid #3b2e54', color: '#e0d8f0' }}
      />

      {/* Section List */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {filteredSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setSelectedSection(selectedSection?.id === section.id ? null : section)}
            className="w-full text-left p-3 rounded-xl transition-all"
            style={{
              backgroundColor: selectedSection?.id === section.id ? 'rgba(192,132,252,0.12)' : 'rgba(10,2,8,0.4)',
              border: `1px solid ${selectedSection?.id === section.id ? 'rgba(192,132,252,0.3)' : '#1e1033'}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                style={{ backgroundColor: 'rgba(192,132,252,0.1)', color: '#c084fc' }}>
                P{section.phase}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded capitalize"
                style={{ backgroundColor: 'rgba(102,85,119,0.2)', color: '#9966aa' }}>
                {section.category}
              </span>
            </div>
            <div className="text-xs font-medium" style={{ color: '#c084fc' }}>{section.title}</div>
            {selectedSection?.id === section.id && (
              <div className="mt-3 pt-3 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: '#a78bfa', borderTop: '1px solid #1e1033' }}>
                {section.content}
              </div>
            )}
          </button>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <p className="text-xs text-center py-6" style={{ color: '#3b2e54' }}>No matching sections.</p>
      )}
    </div>
  );
};

export default LegalVaultSurface;
