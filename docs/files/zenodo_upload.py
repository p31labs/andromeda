#!/usr/bin/env python3
"""
P31 Labs — Zenodo Batch Uploader
Uploads the full research series as a linked collection.

Usage:
  export ZENODO_TOKEN=your_token_here
  # or: cp .env.example .env  and set ZENODO_TOKEN (see andromeda/.gitignore)
  python zenodo_upload.py --dry-run     # preview metadata
  python zenodo_upload.py               # upload everything

Sequence: XII first (anchor DOI), then XI and XIX (which cite XII),
then V–X, XIII–XVII, XVIII–XX (stable order within each priority tier).
"""

import os, sys, json, time, argparse, glob

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def load_env_file(path):
    """KEY=VAL lines; does not override existing os.environ. Supports optional export prefix."""
    if not path or not os.path.isfile(path):
        return
    with open(path, encoding="utf-8", errors="replace") as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:].strip()
            if "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            if not key or key in os.environ:
                continue
            val = val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            os.environ[key] = val


def hydrate_token_from_dotenv(pdf_dir):
    """GitHub / Forge store ZENODO_TOKEN out-of-band; local runs can use .env next to PDFs or this script."""
    for base in (_SCRIPT_DIR, os.path.abspath(pdf_dir)):
        load_env_file(os.path.join(base, ".env"))


# ══════════════════════════════════════════════
# PAPER METADATA — THE FULL SERIES
# ══════════════════════════════════════════════

ORCID = "0009-0002-2492-9079"
CREATOR = {
    "name": "Johnson, William R.",
    "orcid": ORCID,
    "affiliation": "P31 Labs, Inc."
}

# Papers I-IV already have DOIs
EXISTING_DOIS = {
    "I": "10.5281/zenodo.19004485",
    "III_a": "10.5281/zenodo.19411363",
    "III_b": "10.5281/zenodo.19416491",
    "IV": "10.5281/zenodo.19503542",
}

# Upload order matters — XII first, then papers that cite it
PAPERS = [
    {
        "number": "XII",
        "file": "P31_Paper_XII_Sovereign_Stack.pdf",
        "title": "The Sovereign Stack: Open-Source Hardware–Software Architecture for Neurodivergent Assistive Technology",
        "description": "Paper XII of the P31 Labs Research Series. Documents the complete hardware-software architecture of the P31 ecosystem, including the Node Zero cognitive prosthetic (ESP32-S3, AXS15231B, SE050), the BONDING educational chemistry game (413 automated tests), and the Cloudflare Workers infrastructure (10 deployed workers). Triple-gated for factual accuracy.",
        "keywords": ["assistive technology", "cognitive prosthetic", "ESP32-S3", "neurodivergent", "open-source hardware", "BONDING", "Cloudflare Workers"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 1,
    },
    {
        "number": "XI",
        "file": "P31_Paper_XI_LOVE_Protocol.pdf",
        "title": "The L.O.V.E. Protocol: Biometric Consensus and the Financialization of Care in Assistive Technology",
        "description": "Paper XI of the P31 Labs Research Series. Presents a biometric consensus mechanism for quantifying care labor using BLE proximity, HRV coherence, and Soulbound Tokens. Includes deployed evidence from the BONDING application.",
        "keywords": ["care labor", "Proof of Care", "Soulbound Tokens", "Heart Rate Variability", "biometric consensus", "spoon theory", "LOVE protocol"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 2,
        "cites_xii": True,
    },
    {
        "number": "XIX",
        "file": "P31_Paper_XIX_SOULSAFE_Protocol.pdf",
        "title": "The SOULSAFE Protocol: High-Reliability Engineering for Human–AI Cognitive Symbiosis",
        "description": "Paper XIX of the P31 Labs Research Series. Adapts the U.S. Navy SUBSAFE program for human-AI collaboration quality assurance. Documents the Triad of Cognition, Red Board Diagnostics, and Objective Quality Evidence framework with operational validation from the P31 development cycle.",
        "keywords": ["SOULSAFE", "SUBSAFE", "human-AI collaboration", "high-reliability organization", "Triad of Cognition", "AI hallucination", "quality assurance"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 2,
        "cites_xii": True,
    },
    {
        "number": "V",
        "file": "P31_Paper_V_Borderland_Strategy.pdf",
        "title": "The Borderland Strategy and Estuarine Sensory Gating: Environmental Psychology as Cognitive Infrastructure",
        "description": "Paper V of the P31 Labs Research Series. Establishes the estuarine environment of St. Marys, Georgia as cognitive infrastructure for the neurodivergent operator, drawing on Kaplan ART and Ulrich SRT.",
        "keywords": ["environmental psychology", "sensory gating", "allostatic load", "estuarine ecology", "AuDHD", "hypoparathyroidism", "Delta topology"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 3,
    },
    {
        "number": "VI",
        "file": "P31_Paper_VI_Topological_History.pdf",
        "title": "Topological History of Camden County: Institutional Capture and the K₄ Counter-Architecture",
        "description": "Paper VI of the P31 Labs Research Series. Documents the historical pattern of Wye-topology institutional capture in small-county jurisdictions and proposes K₄ mesh architecture as a structural countermeasure.",
        "keywords": ["institutional capture", "K4 topology", "Delta mesh", "Camden County", "jurisdictional resilience"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 3,
    },
    {
        "number": "VII",
        "file": "P31_Paper_VII_Neuro_Kinship.pdf",
        "title": "Neuro-Kinship and the Impedance Mismatch: Communication Topology Across Divergent Neurotypes",
        "description": "Paper VII of the P31 Labs Research Series. Reframes autistic communication breakdown as an engineering impedance mismatch (Transducer Error) using Milton's Double Empathy Problem and Murray's monotropism framework.",
        "keywords": ["double empathy problem", "monotropism", "impedance mismatch", "Transducer Error", "neurodivergent communication", "Proof of Care", "network topology"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 3,
    },
    {
        "number": "VIII",
        "file": "P31_Paper_VIII_Value_Form.pdf",
        "title": "The Value-Form Problem: Self-Domestication, Proactive Strategy, and the L.O.V.E. Use-Value Ledger",
        "description": "Paper VIII of the P31 Labs Research Series. Applies Marx's use-value/exchange-value distinction to the measurement of care labor and proposes the L.O.V.E. protocol as a use-value preservation mechanism.",
        "keywords": ["value-form", "use-value", "exchange-value", "self-domestication", "care labor", "LOVE protocol", "measurement apparatus"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 3,
    },
    {
        "number": "IX",
        "file": "P31_Paper_IX_Quantum_Social_Science.pdf",
        "title": "Quantum Social Science: The Authorized Observer Problem and the Spinning Coin Phenomenology",
        "description": "Paper IX of the P31 Labs Research Series. Applies Wendt's quantum social theory framework (as structural analogy) to the problem of care measurement and proposes Proof of Care as a measurement protocol.",
        "keywords": ["quantum social science", "Wendt", "observer problem", "measurement", "Proof of Care", "phenomenology"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 3,
    },
    {
        "number": "X",
        "file": "P31_Paper_X_Linguistic_Thermodynamics.pdf",
        "title": "Linguistic Thermodynamics and Synergetic Accounting: The Landauer Limit of Zero-Work Syntax",
        "description": "Paper X of the P31 Labs Research Series. Applies Landauer's principle to demonstrate the thermodynamic cost of zero-work linguistic constructs and presents the IVM-based cognitive accounting framework.",
        "keywords": ["Landauer principle", "linguistic thermodynamics", "zero-work syntax", "spoon theory", "IVM", "Fawn Guard", "LOVE protocol"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 3,
    },
    {
        "number": "XIII",
        "file": "P31_Paper_XIII_Abdication_Protocol.pdf",
        "title": "The Abdication Protocol and Legal Faraday Cage: Structural Containment for High-Conflict Jurisdictions",
        "description": "Paper XIII of the P31 Labs Research Series. Proposes a legal Faraday-cage framing for containing institutional interference and documents abdication-of-unfit-authority patterns compatible with K₄ mesh resilience.",
        "keywords": ["abdication protocol", "legal Faraday cage", "institutional capture", "jurisdictional resilience", "K4 topology", "conflict containment", "governance"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 4,
        "cites_xii": True,
    },
    {
        "number": "XIV",
        "file": "P31_Paper_XIV_Centennial_Sync.pdf",
        "title": "Centennial Sync: Fuller's 50-Year Prediction and the P31 Implementation Timeline",
        "description": "Paper XIV of the P31 Labs Research Series. Maps Buckminster Fuller's prediction of a 50-year adoption cycle for geodesic housing to the P31 Labs assistive technology timeline.",
        "keywords": ["Buckminster Fuller", "synergetics", "geodesic", "technology adoption", "assistive technology", "implementation timeline"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 4,
    },
    {
        "number": "XV",
        "file": "P31_Paper_XV_Resonant_Mind.pdf",
        "title": "The Resonant Mind: HRV Biofeedback and the 0.1 Hz Cognitive Anchor",
        "description": "Paper XV of the P31 Labs Research Series. Documents the neuroscience of 0.1 Hz respiratory sinus arrhythmia and its application as a cognitive regulation mechanism in the P31 ecosystem.",
        "keywords": ["HRV biofeedback", "respiratory sinus arrhythmia", "0.1 Hz resonance", "vagal tone", "cognitive regulation", "baroreflex"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 4,
    },
    {
        "number": "XVI",
        "file": "P31_Paper_XVI_Incense_Metaphor.pdf",
        "title": "The Incense Metaphor: Olfactory Anchoring and Ritual in Cognitive Prosthetic Design",
        "description": "Paper XVI of the P31 Labs Research Series. Explores the role of olfactory anchoring and ritual structure in cognitive prosthetic design for neurodivergent users.",
        "keywords": ["olfactory anchoring", "ritual", "cognitive prosthetic", "sensory processing", "neurodivergent", "embodied cognition"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 4,
    },
    {
        "number": "XVII",
        "file": "P31_Paper_XVII_Architecture_of_Chaos.pdf",
        "title": "The Architecture of Chaos: Structured Entropy and the Parking Lot Protocol",
        "description": "Paper XVII of the P31 Labs Research Series. Formalizes the 'parking lot' impulse management protocol as a structured entropy channel for AuDHD executive dysfunction.",
        "keywords": ["executive dysfunction", "impulse management", "parking lot protocol", "structured entropy", "AuDHD", "cognitive architecture"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 4,
    },
    {
        "number": "XVIII",
        "file": "P31_Paper_XVIII_GOD_DAO_Constitution.pdf",
        "title": "The G.O.D. DAO Constitution and the Slashing Engine: Governance Primitives for Assistive-Technology Commons",
        "description": "Paper XVIII of the P31 Labs Research Series. Specifies governance primitives for a decentralized assistive-technology commons, including constitution-level rules and a slashing/safety engine aligned with high-reliability operations.",
        "keywords": ["DAO", "governance", "constitution", "slashing", "commons", "assistive technology", "decentralized systems"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 5,
        "cites_xii": True,
    },
    {
        "number": "XX",
        "file": "P31_Paper_XX_Trimtab_Declaration.pdf",
        "title": "The Trimtab Declaration and Safe Geometry: Minimum Leverage for Maximum Human Flourishing",
        "description": "Paper XX of the P31 Labs Research Series. States the Trimtab Declaration as minimum-leverage design ethics for neuro-inclusive systems and ties safe geometry to deployable edge and cognitive-prosthetic practice.",
        "keywords": ["trimtab", "safe geometry", "minimum leverage", "neuro-inclusive design", "assistive technology", "synergetics", "P31 Labs"],
        "upload_type": "publication",
        "publication_type": "workingpaper",
        "priority": 5,
        "cites_xii": True,
    },
]

def build_metadata(paper, xii_doi=None):
    """Build Zenodo-compatible metadata for a single paper."""
    meta = {
        "metadata": {
            "title": paper["title"],
            "upload_type": paper["upload_type"],
            "publication_type": paper["publication_type"],
            "description": paper["description"],
            "creators": [CREATOR],
            "keywords": paper["keywords"],
            "license": "cc-by-4.0",
            "communities": [],
            "related_identifiers": [],
            "notes": f"Paper {paper['number']} of the P31 Labs Research Series. "
                     f"P31 Labs, Inc. — Georgia Domestic Nonprofit Corporation (EIN: 42-1888158). "
                     f"ORCID: {ORCID}."
        }
    }

    # Link to existing papers in the series
    for label, doi in EXISTING_DOIS.items():
        meta["metadata"]["related_identifiers"].append({
            "identifier": doi,
            "relation": "isPartOf",
            "scheme": "doi"
        })

    # Link to Paper XII if it has a DOI and this paper cites it
    if xii_doi and paper.get("cites_xii"):
        meta["metadata"]["related_identifiers"].append({
            "identifier": xii_doi,
            "relation": "cites",
            "scheme": "doi"
        })

    return meta


def dry_run(papers, pdf_dir):
    """Preview what would be uploaded."""
    print("\n" + "=" * 60)
    print("P31 LABS — ZENODO BATCH UPLOAD (DRY RUN)")
    print("=" * 60)

    for p in sorted(papers, key=lambda x: x["priority"]):
        pdf_path = os.path.join(pdf_dir, p["file"])
        exists = os.path.exists(pdf_path)
        size = f"{os.path.getsize(pdf_path)/1024:.0f}KB" if exists else "MISSING"
        status = "\u2713" if exists else "\u2717"

        print(f"\n  {status} Paper {p['number']:>5s} | {size:>6s} | Priority {p['priority']}")
        print(f"    {p['title'][:70]}...")
        print(f"    Keywords: {', '.join(p['keywords'][:4])}...")

    found = sum(1 for p in papers if os.path.exists(os.path.join(pdf_dir, p["file"])))
    print(f"\n{'=' * 60}")
    print(f"  {found}/{len(papers)} PDFs found. Ready to upload.")
    print(f"{'=' * 60}\n")


def upload_all(papers, pdf_dir, token, xii_doi=None):
    """Upload all papers to Zenodo."""
    import requests

    base = "https://zenodo.org/api"
    headers = {"Authorization": f"Bearer {token}"}
    results = []

    for p in sorted(papers, key=lambda x: x["priority"]):
        pdf_path = os.path.join(pdf_dir, p["file"])
        if not os.path.exists(pdf_path):
            print(f"  \u2717 Paper {p['number']} — PDF not found: {pdf_path}")
            continue

        print(f"\n  Uploading Paper {p['number']}...")

        # 1. Create empty deposit
        meta = build_metadata(p, xii_doi)
        r = requests.post(f"{base}/deposit/depositions", json=meta, headers=headers)
        if r.status_code != 201:
            print(f"    \u2717 Create failed: {r.status_code} {r.text[:200]}")
            continue
        dep = r.json()
        dep_id = dep["id"]
        bucket_url = dep["links"]["bucket"]

        # 2. Upload PDF (Zenodo S3-compatible bucket may return 200 or 201)
        with open(pdf_path, "rb") as f:
            r2 = requests.put(f"{bucket_url}/{p['file']}", data=f, headers=headers)
        if r2.status_code not in (200, 201):
            print(f"    \u2717 Upload failed: {r2.status_code}")
            continue

        # 3. Publish
        r3 = requests.post(f"{base}/deposit/depositions/{dep_id}/actions/publish", headers=headers)
        if r3.status_code != 202:
            print(f"    \u2717 Publish failed: {r3.status_code}")
            continue

        pub = r3.json()
        doi = pub["doi"]
        print(f"    \u2713 Published! DOI: {doi}")
        results.append({"number": p["number"], "doi": doi, "id": dep_id})

        # If this was Paper XII, capture its DOI for subsequent papers
        if p["number"] == "XII":
            xii_doi = doi
            print(f"    \u2794 Paper XII DOI captured: {xii_doi}")

        time.sleep(1)  # Rate limiting

    # Summary
    print(f"\n{'=' * 60}")
    print(f"  Uploaded {len(results)}/{len(papers)} papers.")
    for r in results:
        print(f"    Paper {r['number']:>5s}: {r['doi']}")
    print(f"{'=' * 60}\n")

    # Save results
    with open(os.path.join(pdf_dir, "zenodo_results.json"), "w") as f:
        json.dump(results, f, indent=2)
    print(f"  Results saved to zenodo_results.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="P31 Labs Zenodo Batch Uploader")
    parser.add_argument("--dry-run", action="store_true", help="Preview without uploading")
    parser.add_argument("--pdf-dir", default=".", help="Directory containing PDFs")
    parser.add_argument("--xii-doi", default=None, help="Paper XII DOI if already published")
    args = parser.parse_args()

    hydrate_token_from_dotenv(args.pdf_dir)
    token = os.environ.get("ZENODO_TOKEN")
    if not token and not args.dry_run:
        print("Error: ZENODO_TOKEN not set.")
        print("  Put it in the environment, or create:")
        print(f"    {_SCRIPT_DIR}/.env")
        print(f"    {os.path.abspath(args.pdf_dir)}/.env")
        print('  with a line: ZENODO_TOKEN="..."')
        print("  (GitHub Actions: repository secret ZENODO_TOKEN — not stored in git.)")
        print("  Token UI: https://zenodo.org/account/settings/applications/")
        sys.exit(1)

    if args.dry_run:
        dry_run(PAPERS, args.pdf_dir)
    else:
        upload_all(PAPERS, args.pdf_dir, token, args.xii_doi)
