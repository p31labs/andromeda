# P31 Open Doc Suite — file index

| Path | Use |
|------|-----|
| `brand-tokens.json` | Machine-readable brand + entity (regenerate with `p31-forge` `npm run brand:tokens`). |
| `print/suite-tokens.css` | Shared CSS variables and `@page` for US Letter. |
| `print/letterhead.html` | Blank first page: org block + return address. |
| `print/notepad.html` | Ruled lines + title line (brain dump, LOR drafts). |
| `print/memo.html` | To / From / Re / Date + body. |
| `print/meeting-minutes.html` | Attendees, agenda, action items. |
| `print/business-card.html` | Two cards per 8.5×11, cut lines. |
| `print/slides.html` | Six-panel slide / one-pager; print “Save as PDF” with backgrounds. |
| `assets/watermark-draft.svg` | Diagonal DRAFT (lightweight overlay). |
| `assets/watermark-p31-labs.svg` | Branded text watermark. |
| `assets/watermark-cage.svg` | Subtle “Ca₉(PO₄)₆ / cage” motif. |
| `TEMPLATE-memo.md` | Git-editable internal memo. |
| `TEMPLATE-meeting-minutes.md` | Git-editable minutes shell. |
| `TEMPLATE-press-brief.md` | Short narrative for media / partners. |
| `grant-budget-template.csv` | Line-item template for funder budget attachment. |
| `email-signature.html` / `email-signature.txt` | Paste into mail client. |

Open any `print/*.html` in **Chrome or Firefox → Print → Save as PDF**. For European A4, change `@page` in `suite-tokens.css` to `size: A4;`.
