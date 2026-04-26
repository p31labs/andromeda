# P31 Labs — corporate documentation

This tree holds **governance and identity documentation** and the **P31 Open Doc Suite** — plain files you can use instead of a proprietary office stack: print from the browser, edit in any editor, version in git, and keep `.docx` generation in **P31 Forge** for formal filings.

| Document | Role |
|----------|------|
| [ORGANIZATION-SHEET.md](ORGANIZATION-SHEET.md) | **Verified** legal identity, EIN, board, public URLs — check against `docs/GOD_GROUND_TRUTH.md` when facts change. |
| [P31-DOC-SUITE.md](P31-DOC-SUITE.md) | Index of the open suite, workflows, and how it maps to P31 Forge. |
| [suite/README.md](suite/README.md) | Per-file list for `suite/`. |
| [suite/print/](suite/print/) | Print-first HTML: letterhead, notepad, memo, minutes, business card, slides. |
| **p31ca.org** | Public entry: [open-doc-suite.html](https://p31ca.org/open-doc-suite.html) (short: `/doc-suite`) — in-tree `04_SOFTWARE/p31ca/public/open-doc-suite.html`, pinned in `p31.ground-truth.json`. |
| [suite/assets/](suite/assets/) | SVG watermarks (import into SVG-capable tools or use as refs). |
| [suite/brand-tokens.json](suite/brand-tokens.json) | Colors, type scale, entity strings — `npm run brand:tokens` in `04_SOFTWARE/p31-forge` (generated). |

**Canonical doc engine:** `04_SOFTWARE/p31-forge` (`brand.js` + `forge.js` + `content/*` JSON). Do not fork brand values in the suite; regenerate tokens when `brand.js` changes.
