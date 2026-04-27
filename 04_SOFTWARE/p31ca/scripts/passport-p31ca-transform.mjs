/**
 * Single source of truth for root → p31ca passport mirror transform.
 * Home `scripts/passport-p31ca-transform.mjs` re-exports from here.
 * Alignment: p31-alignment.json "passport-to-p31ca-mirror" + verify:passport
 */

export const HEADER_SOURCE = `      <p class="sub">
        Produces a <strong>machine slice</strong> (AI/agent context) + <strong>JSON</strong> for tools — not a replacement for the full
        <a href="../P31%20COGNITIVE%20PASSPORT%20%E2%80%94%20v5.md">v5.1 life document</a> at repo root. No PII is required; contact fields are optional.
      </p>`;

export const HEADER_P31CA = `      <p class="sub">
        Produces a <strong>machine slice</strong> (AI/agent context) + <strong>JSON</strong> for tools — not a replacement for the full
        <code>P31 COGNITIVE PASSPORT — v5.md</code> in the P31 / <code>andromeda</code> tree. No PII is required; contact fields are optional.
      </p>`;

export const FOOTER_SOURCE = `    <footer>
      P31 Labs — <code>cognitive-passport/index.html</code> (authoring copy) · mirrored for static deploy as
      <code>andromeda/04_SOFTWARE/p31ca/public/passport-generator.html</code> · localStorage <code>p31_passport_draft_v1</code> ·
      full ground truth remains <code>P31 COGNITIVE PASSPORT — v5.md</code>; this page only emits a safe machine slice.
    </footer>`;

export const FOOTER_P31CA = `    <footer>
      P31 Labs — you are on <code>passport-generator.html</code> · authoring source in the repo: <code>cognitive-passport/index.html</code> · localStorage <code>p31_passport_draft_v1</code> ·
      full ground truth remains <code>P31 COGNITIVE PASSPORT — v5.md</code> at workspace root; this page only emits a safe machine slice.
    </footer>`;

/** @returns {string | null} error message, or null if OK */
export function validateSourceHtml(html) {
  if (!html.includes(HEADER_SOURCE)) {
    return "cognitive-passport/index.html: expected header block not found. Update p31ca/scripts/passport-p31ca-transform.mjs if markup changed.";
  }
  if (!html.includes(FOOTER_SOURCE)) {
    return "cognitive-passport/index.html: expected footer block not found. Update p31ca/scripts/passport-p31ca-transform.mjs if markup changed.";
  }
  return null;
}

/** @param {string} sourceHtml well-formed source from cognitive-passport/index.html */
export function toP31caMirror(sourceHtml) {
  const err = validateSourceHtml(sourceHtml);
  if (err) throw new Error(err);
  return sourceHtml
    .replace(HEADER_SOURCE, HEADER_P31CA)
    .replace(FOOTER_SOURCE, FOOTER_P31CA);
}
