/**
 * Single source of truth for root → p31ca passport mirror transform.
 * Home `scripts/passport-p31ca-transform.mjs` re-exports from here.
 * Alignment: p31-alignment.json "passport-to-p31ca-mirror" + verify:passport
 */

export const HEADER_SOURCE = `      <p class="sub">
        Tell tools how your brain works — once. Free. No login. Everything stays in your browser.
      </p>
      <p class="sub-muted">
        Works with ChatGPT, Claude, Gemini, or any assistant that accepts custom instructions.
      </p>`;

export const HEADER_P31CA = `      <p class="sub">
        Tell tools how your brain works — once. Free. No login. Everything stays in your browser.
      </p>
      <p class="sub-muted">
        Works with ChatGPT, Claude, Gemini, or any assistant that accepts custom instructions.
      </p>`;

export const FOOTER_SOURCE = `    <footer>
      Built by P31 Labs — open-source assistive technology.
      Free forever. No tracking. No ads.
      · <a href="https://github.com/p31labs/bonding-soup" target="_blank" rel="noopener noreferrer">Source code</a>
      · <a href="https://ko-fi.com/trimtab69420" target="_blank" rel="noopener noreferrer">Ko-fi</a>
      · <a href="../docs/P31-DEPLOY-CANON.md" title="npm run connection">CONNECTION</a>
      · Full human document: <a href="../P31%20COGNITIVE%20PASSPORT%20%E2%80%94%20v5.md">P31 Cognitive Passport v5</a> (not required for export).
    </footer>`;

export const FOOTER_P31CA = `    <footer>
      Built by P31 Labs — open-source assistive technology.
      Free forever. No tracking. No ads.
      · <a href="https://github.com/p31labs/bonding-soup" target="_blank" rel="noopener noreferrer">Source code</a>
      · <a href="https://ko-fi.com/trimtab69420" target="_blank" rel="noopener noreferrer">Ko-fi</a>
      · <a href="https://github.com/p31labs/bonding-soup/blob/main/docs/P31-DEPLOY-CANON.md" target="_blank" rel="noopener noreferrer" title="npm run connection">CONNECTION</a>
      · Full human document: <code>P31 COGNITIVE PASSPORT — v5.md</code> in the repo (not required for export).
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
  return sourceHtml.replace(HEADER_SOURCE, HEADER_P31CA).replace(FOOTER_SOURCE, FOOTER_P31CA);
}
