(function () {
  var STATUS_API = "https://command-center.trimtab-signal.workers.dev/api/status";
  var TIMEOUT = 6000;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function workerUp(w) {
    var s = (w.status || "").toLowerCase();
    return s === "up" || s === "ok" || s === "online";
  }

  function loadFleet() {
    var grid = document.getElementById("about-fleet-grid");
    var tsEl = document.getElementById("about-fleet-ts");
    var dot = document.getElementById("about-fleet-indicator");
    if (!grid) return;
    var ac = new AbortController();
    var timer = setTimeout(function () { ac.abort(); }, TIMEOUT);
    fetch(STATUS_API, { signal: ac.signal })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (data) {
        var workers = Array.isArray(data.workers) ? data.workers : [];
        grid.innerHTML = "";
        var up = 0;
        workers.forEach(function (w) {
          var ok = workerUp(w);
          if (ok) up++;
          var a = document.createElement("a");
          a.className = "mesh-fleet-chip";
          a.href = w.url || "#";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.innerHTML = '<span class="mesh-fleet-name">' + esc(w.name || "—") + '</span><span class="mesh-fleet-dot ' + (ok ? "up" : "down") + '"></span>';
          grid.appendChild(a);
        });
        if (dot) dot.className = "mesh-fleet-indicator " + (workers.length > 0 && up === workers.length ? "ok" : up > 0 ? "partial" : "off");
        if (tsEl) tsEl.textContent = "Last: " + new Date().toLocaleTimeString();
      })
      .catch(function () {
        if (tsEl) tsEl.textContent = "Fleet status unavailable";
        if (dot) dot.className = "mesh-fleet-indicator off";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadFleet);
  } else {
    loadFleet();
  }
})();
