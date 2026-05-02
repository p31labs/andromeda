/* P31 PWA drop-in: registers the local service worker + surfaces a
   non-intrusive install button when the browser fires beforeinstallprompt.
   Source of truth: pwa/p31-pwa.js. Mirrored to each PWA-installable surface
   by scripts/build-pwa.mjs. Verified by scripts/verify-pwa.mjs.

   Add to a surface with one line in <head>:
     <script src="./p31-pwa.js" defer></script>
   (paired with a <link rel="manifest" ...> and a theme-color meta).

   Behavior is operator-summoned only. The install button appears in the
   bottom-right corner with low opacity; tap-and-hold to dismiss for the
   session. No telemetry. No analytics. P31 Labs · CC-BY 4.0.
*/
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  if (window.__P31_PWA_LOADED__) return;
  window.__P31_PWA_LOADED__ = true;

  /* Register the SW from the same directory this script lives in. */
  const here = new URL(document.currentScript ? document.currentScript.src : "./", document.baseURI);
  const swUrl = new URL("./sw.js", here).href;
  const scope = here.pathname.replace(/[^/]*$/, "");

  navigator.serviceWorker
    .register(swUrl, { scope })
    .catch(() => { /* fail silently — PWA is opt-in for the user, not required */ });

  /* Install prompt — defer until the browser hands us the event. */
  let deferred = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    showBadge();
  });

  /* Quietly remove the badge after install. */
  window.addEventListener("appinstalled", () => {
    deferred = null;
    const el = document.getElementById("p31-pwa-install");
    if (el) el.remove();
  });

  function showBadge() {
    if (document.getElementById("p31-pwa-install")) return;
    if (sessionStorage.getItem("p31-pwa-dismissed") === "1") return;
    const btn = document.createElement("button");
    btn.id = "p31-pwa-install";
    btn.type = "button";
    btn.setAttribute("aria-label", "Install this P31 surface to your home screen");
    btn.title = "Install · adds this page to your home screen for offline access · long-press to dismiss";
    btn.innerHTML = "<span aria-hidden=\"true\" style=\"font-size:14px;line-height:1\">\u25cd</span> install";
    Object.assign(btn.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "9999",
      padding: "8px 14px",
      background: "rgba(15, 17, 21, 0.92)",
      color: "#25897d",
      border: "1px solid rgba(37, 137, 125, 0.4)",
      borderRadius: "8px",
      font: "600 12px/1 ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
      letterSpacing: "0.06em",
      cursor: "pointer",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35)",
      opacity: "0.85",
      transition: "opacity 0.2s ease, border-color 0.2s ease",
    });
    btn.onmouseenter = () => { btn.style.opacity = "1"; };
    btn.onmouseleave = () => { btn.style.opacity = "0.85"; };
    btn.onclick = async () => {
      if (!deferred) { btn.remove(); return; }
      try {
        deferred.prompt();
        await deferred.userChoice;
      } finally {
        deferred = null;
        btn.remove();
      }
    };
    /* Long-press / right-click → dismiss for the session */
    let pressTimer = null;
    btn.addEventListener("contextmenu", (e) => { e.preventDefault(); dismiss(); });
    btn.addEventListener("touchstart", () => {
      pressTimer = setTimeout(dismiss, 700);
    });
    btn.addEventListener("touchend", () => { if (pressTimer) clearTimeout(pressTimer); });
    function dismiss() {
      sessionStorage.setItem("p31-pwa-dismissed", "1");
      btn.remove();
    }
    document.body.appendChild(btn);
  }
})();
