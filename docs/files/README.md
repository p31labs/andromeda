# P31 Labs Research Series — Zenodo upload workspace

**Author:** Johnson, William R.  
**Affiliation:** P31 Labs, Inc.  
**ORCID:** 0009-0002-2492-9079  
**License:** CC BY 4.0  
**Date:** April 13, 2026  

---

## Rules (canonical in repo)

| Source | What it governs |
|--------|------------------|
| **`docs/CANONICAL-NUMBERING.md`** (P31 home root) | **PAPER** namespace: **DOI is the immutable key** after publish; Zenodo DOIs are never renumbered—issue a new version/record for corrections. |
| **`p31-constants.json`** → `research.orcid`, `research.papers` | Operator-locked ORCID and **published** DOIs (e.g. Paper IV, defensive pub); run `npm run apply:constants` after edits. |
| **`P31_Claude_Code_Prompt.md`** (this folder) | **SOULSAFE:** no Zenodo publish without independent citation verification. |

---

## Doc generators and upload tooling

| Tool | Location | Role |
|------|----------|------|
| **Batch uploader (this folder)** | `zenodo_upload.py` | Builds Zenodo metadata, **`--dry-run`** checks PDFs on disk, ordered upload (**XII first** → XI & XIX cite XII → V–X, XIII–XVII, XVIII–XX). Needs **`ZENODO_TOKEN`**: shell `export`, **or** `.env` next to this script / next to `--pdf-dir` (see `.env.example`). Same name as the **GitHub Actions secret** — it is **not** committed to git. |
| **Forge — Zenodo channel** | `andromeda/04_SOFTWARE/p31-forge/README.md` | `node forge.js publish zenodo @content/releases/....json` — deposition from structured JSON (`title`, `description`, `creators`, `files`, optional `publish`). |
| **DOI backfill helper** | `andromeda/04_SOFTWARE/ops/update-dois.js` | Paste DOIs into `DOI_MAP` and propagate across configured paths (see script header). |
| **Zenodo Worker (edge)** | `andromeda/04_SOFTWARE/cloudflare-worker/p31_zenodo_worker.js` | HTTP wrapper around Zenodo API (optional; needs `ZENODO_API_TOKEN`). |

**Referenced but not in this checkout:** `02_RESEARCH/` (e.g. `convert_papers.py` for Markdown → styled PDF), `zenodo_batch/upload_batch.py` — see `andromeda/docs/REPOSITORY_LAYOUT.md` and `andromeda/README.md` for intended layout.

---

## Previously published (Papers I–IV)

| Paper | Title | DOI |
|-------|-------|-----|
| I | The Tetrahedron Protocol (current deposit) | 10.5281/zenodo.19004485 (prior: 10.5281/zenodo.18627420) |
| II | Genesis Whitepaper | — |
| III | Consciousness Memory Architecture | 10.5281/zenodo.19411363 |
| IV | Universal Bridge at the Phase Transition | 10.5281/zenodo.19503542 |

---

## Series map (faces V–XX)

Full series titles and filenames (inventory). The **automated batch** is the same **16** rows (V–XX, Roman order within each upload tier).

| Paper | Filename | Title |
|-------|----------|-------|
| V | `P31_Paper_V_Borderland_Strategy.pdf` | The Borderland Strategy and Estuarine Sensory Gating |
| VI | `P31_Paper_VI_Topological_History.pdf` | Topological History and Institutional Capture |
| VII | `P31_Paper_VII_Neuro_Kinship.pdf` | Neuro-Kinship and the Impedance Mismatch |
| VIII | `P31_Paper_VIII_Value_Form.pdf` | Evolutionary Cognition and the Value-Form Crisis |
| IX | `P31_Paper_IX_Quantum_Social_Science.pdf` | Quantum Social Science and the Authorized Observer |
| X | `P31_Paper_X_Linguistic_Thermodynamics.pdf` | Linguistic Thermodynamics and Synergetic Accounting |
| XI | `P31_Paper_XI_LOVE_Protocol.pdf` | The L.O.V.E. Protocol |
| XII | `P31_Paper_XII_Sovereign_Stack.pdf` | The Sovereign Stack |
| XIII | `P31_Paper_XIII_Abdication_Protocol.pdf` | The Abdication Protocol and Legal Faraday Cage |
| XIV | `P31_Paper_XIV_Centennial_Sync.pdf` | The Centennial Synchronization |
| XV | `P31_Paper_XV_Resonant_Mind.pdf` | The Resonant Mind and the Biology of Belief |
| XVI | `P31_Paper_XVI_Incense_Metaphor.pdf` | The Incense Metaphor and Cortical Thermodynamics |
| XVII | `P31_Paper_XVII_Architecture_of_Chaos.pdf` | Architecture of Chaos and Somatic Anchoring |
| XVIII | `P31_Paper_XVIII_GOD_DAO_Constitution.pdf` | G.O.D. DAO Constitution and the Slashing Engine |
| XIX | `P31_Paper_XIX_SOULSAFE_Protocol.pdf` | SOULSAFE Protocol and Digital Centaur Diagnostics |
| XX | `P31_Paper_XX_Trimtab_Declaration.pdf` | The Trimtab Declaration and Safe Geometry |

### Zenodo batch set (16) — `zenodo_upload.py`

**XII first** (anchor DOI), then **XI** and **XIX** (Zenodo `cites` → XII), then **V–X**, **XIII–XVII**, **XVIII** and **XX**. Papers **XI, XIII, XIX, XVIII, XX** declare that `cites` relation once XII’s DOI is known (same run or `--xii-doi`).

### Prep checklist

1. Citation / SOULSAFE gate on every PDF in the batch.
2. From this directory: `python3 zenodo_upload.py --dry-run` — confirm **16/16** PDFs present.
3. If XII already has a DOI: `python3 zenodo_upload.py --pdf-dir . --xii-doi '10.5281/zenodo.NNNNNNN'` (then run without `--dry-run` only when ready).
4. After publish: add new DOIs to `p31-constants.json` (`research.papers`) and run **`npm run apply:constants`** + **`npm run verify:constants`** at P31 home root.

---

## Architecture (narrative)

The 20 papers form the faces of a geodesic icosahedron:

- **Faces 1–4:** Quantum biophysics and topological foundations (published)
- **Faces 5–10:** Environmental, sociological, and economic mechanics
- **Faces 11–14:** Economic engines and technical infrastructure
- **Faces 15–17:** Biological resilience and somatic anchoring
- **Faces 18–20:** Governance, safety engineering, and final escapement

---

*P31 Labs, Inc. — Open-source assistive technology for neurodivergent individuals.*  
*Georgia Domestic Nonprofit Corporation. GitHub: github.com/p31labs*  
*Geometry is Destiny.*
