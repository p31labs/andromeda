# P31 Open Doc Suite — the “batteries-included” office layer

A **self-hosted, git-friendly** alternative to a locked-in productivity suite. The technical hub points here from **[p31ca.org/open-doc-suite](https://p31ca.org/open-doc-suite.html)** (alias **`/doc-suite`**) and from the p31ca footer. You get:

| Proprietary pattern | P31 open replacement |
|---------------------|----------------------|
| Google Docs (letters) | `suite/print/letterhead.html` + browser Print → PDF |
| Keep / scratch | `suite/print/notepad.html` |
| Internal memo | `suite/print/memo.html` or `suite/TEMPLATE-memo.md` |
| Slides (lightweight) | `suite/print/slides.html` (print each slide, or read as one-pager) |
| Sheets (simple tracking) | `suite/*/*.csv` + LibreOffice / DuckDB / any CSV tool |
| Branded .docx for courts / funders | **P31 Forge** — `04_SOFTWARE/p31-forge` |
| Email footer | `suite/email-signature.html` (paste into client) |
| “Confidential” cover | `suite/assets/watermark-*.svg` in Inkscape, Scribus, or print CSS |

**Brand authority:** `04_SOFTWARE/p31-forge/brand.js` (colors, type, `ENTITY` strings). The suite’s CSS and `brand-tokens.json` are **downstream** — run `npm run brand:tokens` in `p31-forge` after you change the cage.

## Workflows

1. **Day-to-day notes:** duplicate `notepad.html` in the browser, print to PDF, or save HTML in `01_ADMIN/` (local) if you do not want it in the remote.  
2. **Formal board PDF:** use Forge `content/corporate/*.json` to emit `.docx`, then your PDF path (`scripts/docx_to_pdf.py` on Windows+Word) — do not re-type bylaws in Markdown.  
3. **Grants (narrative + budget):** narrative often starts in `TEMPLATE-press-brief.md` or Forge grant packs; budget lines in `suite/grant-budget-template.csv`.  
4. **Partner one-pager:** `slides.html` with five sections pre-filled, export PDF.

## Big-to-small map

1. **Governance** — `ORGANIZATION-SHEET.md`, `p31-forge/content/corporate/`, `docs/GOD_GROUND_TRUTH.md` (entity).  
2. **Identity** — `suite/brand-tokens.json`, `suite/assets/`.  
3. **Comms** — `suite/email-signature.*`, `print/business-card.html`.  
4. **Room & desk** — notepad, letterhead, watermarks.  

## Not in scope (use real tools)

- **Spreadsheet-heavy accounting:** export CSV from Mercury / bank, analyze in LibreOffice or your choice; the suite only supplies **column templates**, not a ledger.  
- **E-signature:** use your chosen provider; store executed PDFs with bank/lawyer, not only in this repo.  

## License

HTML/CSS/Markdown/SVG/CSV in `docs/corporate/suite/` are **CC-BY-4.0** (match `p31-forge/package.json` license) unless a file header says otherwise.