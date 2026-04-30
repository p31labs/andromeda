/**
 * Single source of truth for root → p31ca passport mirror transform.
 * Home `scripts/passport-p31ca-transform.mjs` re-exports from here.
 * Alignment: p31-alignment.json "passport-to-p31ca-mirror" + verify:passport
 */

export const HEADER_SOURCE = `      <p class="sub">
        Answer questions once; export a short summary when you need someone else to understand how your brain works. Free. No login. Stays in your browser.
      </p>
      <p class="sub-muted">
        If this tool uses AI to tidy wording or layout, it is organizing what <em>you</em> enter—not writing your history for you. Change anything that does not sound like you.
      </p>`;

export const HEADER_P31CA = `      <p class="sub">
        Answer questions once; export a short summary when you need someone else to understand how your brain works. Free. No login. Stays in your browser.
      </p>
      <p class="sub-muted">
        If this tool uses AI to tidy wording or layout, it is organizing what <em>you</em> enter—not writing your history for you. Change anything that does not sound like you.
      </p>`;

export const FOOTER_SOURCE = `    <footer>
      Built by P31 Labs — Georgia nonprofit. Free. Open source. No tracking. No ads.
      · <a href="https://github.com/p31labs/bonding-soup" target="_blank" rel="noopener noreferrer">Source code</a>
      · <a href="https://ko-fi.com/trimtab69420" target="_blank" rel="noopener noreferrer">Ko-fi</a>
      · <a href="../soup.html">C.A.R.S.</a>
      · <a href="../p31-sovereign-lab.html">Sovereign Lab</a>
      · <a href="../docs/P31-DEPLOY-CANON.md" title="npm run connection">CONNECTION</a>
      · Full human document: <a href="../P31%20COGNITIVE%20PASSPORT%20%E2%80%94%20v5.md">P31 Cognitive Passport v5</a> (not required for export).
    </footer>`;

export const FOOTER_P31CA = `    <footer>
      Built by P31 Labs — Georgia nonprofit. Free. Open source. No tracking. No ads.
      · <a href="https://github.com/p31labs/bonding-soup" target="_blank" rel="noopener noreferrer">Source code</a>
      · <a href="https://ko-fi.com/trimtab69420" target="_blank" rel="noopener noreferrer">Ko-fi</a>
      · <a href="https://bonding.p31ca.org/soup" target="_blank" rel="noopener noreferrer">C.A.R.S.</a>
      · <a href="https://p31ca.org/lab">Sovereign Lab</a>
      · <a href="https://github.com/p31labs/bonding-soup/blob/main/docs/P31-DEPLOY-CANON.md" target="_blank" rel="noopener noreferrer" title="npm run connection">CONNECTION</a>
      · Full human document: <code>P31 COGNITIVE PASSPORT — v5.md</code> in the repo (not required for export).
    </footer>`;

/** Home demo uses bonding assets one level up; hub mirror serves from public/ roots. */
export const SOURCE_WEB_APP_ICONS = `  <link rel="manifest" href="../p31-bonding.webmanifest" crossorigin="anonymous" />
  <link rel="apple-touch-icon" href="../p31-bonding-icons/apple-touch-180.png" sizes="180x180" />`;

export const P31CA_WEB_APP_ICONS = `  <link rel="manifest" href="/p31-mesh.webmanifest" crossorigin="anonymous" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />`;

/** Home demo serves starfield main CSS under /design-assets/starfield/; hub mirrors it as /lib/p31-starfield.css. */
export const STARFIELD_MAIN_CSS_HREF_SOURCE = 'href="/design-assets/starfield/p31-starfield.css"';
export const STARFIELD_MAIN_CSS_HREF_P31CA = 'href="/lib/p31-starfield.css"';

/** @returns {string | null} error message, or null if OK */
export function validateSourceHtml(html) {
  if (!html.includes(HEADER_SOURCE)) {
    return "cognitive-passport/index.html: expected header block not found. Update p31ca/scripts/passport-p31ca-transform.mjs if markup changed.";
  }
  if (!html.includes(FOOTER_SOURCE)) {
    return "cognitive-passport/index.html: expected footer block not found. Update p31ca/scripts/passport-p31ca-transform.mjs if markup changed.";
  }
  if (!html.includes(SOURCE_WEB_APP_ICONS)) {
    return "cognitive-passport/index.html: expected manifest + apple-touch block not found. Update p31ca/scripts/passport-p31ca-transform.mjs if markup changed.";
  }
  return null;
}

/** @param {string} sourceHtml well-formed source from cognitive-passport/index.html */
export function toP31caMirror(sourceHtml) {
  const err = validateSourceHtml(sourceHtml);
  if (err) throw new Error(err);
  return sourceHtml
    .replace(HEADER_SOURCE, HEADER_P31CA)
    .replace(FOOTER_SOURCE, FOOTER_P31CA)
    .replace(SOURCE_WEB_APP_ICONS, P31CA_WEB_APP_ICONS)
    .replace(STARFIELD_MAIN_CSS_HREF_SOURCE, STARFIELD_MAIN_CSS_HREF_P31CA);
}
