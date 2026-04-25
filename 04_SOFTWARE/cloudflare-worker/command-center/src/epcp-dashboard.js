export function buildEpcpDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>P31 EPCP | Sovereign Command</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  
  <style>
    :root { 
      --void:#050508; 
      --surface:#12141b; 
      --text:#d8d6d0; 
      --coral:#E8636F; 
      --teal:#4db8a8; 
      --gold:#cda852; 
      --glass:rgba(12,14,20,0.75); 
      --border:rgba(255,255,255,0.1); 
    }
    *,*{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Inter",sans-serif;background-color:var(--void);color:var(--text);-webkit-font-smoothing:antialiased;min-height:100vh}
    .font-mono{font-family:"JetBrains Mono",monospace}
    .text-teal{color:var(--teal);} .text-coral{color:var(--coral);} .text-gold{color:var(--gold);} .text-muted{color:#6b7280;}
    .ambient-grid{position:fixed;inset:0;background-image:radial-gradient(rgba(255,255,255,0.12) 1px,transparent 1px);background-size:32px 32px;opacity:0.08;pointer-events:none;z-index:0}
    .glass-panel{background:var(--glass);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid var(--border);box-shadow:0 8px 32px rgba(0,0,0,0.4)}
    .rounded-xl{border-radius:12px} .rounded-lg{border-radius:10px} .rounded-md{border-radius:6px}
    .nav-bar{position:fixed;top:0;left:0;right:0;z-index:50;padding:14px 28px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);background:rgba(5,5,8,0.85)}
    .container{max-width:1280px;margin:0 auto;padding:96px 28px 48px;position:relative;z-index:10}
    .grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:20px}
    .card{padding:22px;display:flex;flex-direction:column;gap:10px;position:relative;overflow:hidden}
    .card::before{content:"";position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)}
    .card-header{font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:#555;border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:10px;font-weight:600}
    .kpi-value{font-size:36px;font-weight:700;letter-spacing:-0.03em;line-height:1}
    .worker-row{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;cursor:pointer;transition:all 0.2s ease;position:relative}
    .worker-row:hover{background:rgba(255,255,255,0.06);border-color:rgba(77,184,168,0.3)}
    .worker-details{display:none;padding:14px;background:var(--void);border:1px solid var(--border);border-radius:8px;margin-bottom:10px;font-size:12px;border-left:2px solid var(--teal)}
    .status-dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:10px;animation: pulse 2s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.6}}
    .status-online{background:var(--teal);box-shadow:0 0 12px rgba(77,184,168,0.6)}
    .status-offline{background:var(--coral);box-shadow:0 0 12px rgba(232,99,111,0.6)}
    .status-degraded{background:var(--gold);box-shadow:0 0 12px rgba(205,168,82,0.6)}
    .btn{padding:8px 16px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text);font-family:"JetBrains Mono",monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;transition:all 0.2s ease;margin-right:8px}
    .btn:hover{background:rgba(255,255,255,0.08)}
    .btn-coral{border-color:var(--coral);color:var(--coral)} .btn-coral:hover{background:rgba(232,99,111,0.12)}
    .btn-teal{border-color:var(--teal);color:var(--teal)} .btn-teal:hover{background:rgba(77,184,168,0.12)}
    .btn-gold{border-color:var(--gold);color:var(--gold)} .btn-gold:hover{background:rgba(205,168,82,0.12)}
    .alert-box{padding:14px 18px;border-radius:8px;background:rgba(205,168,82,0.08);border:1px solid rgba(205,168,82,0.25);color:var(--gold);margin-bottom:20px}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em}
    .badge-online{background:rgba(77,184,168,0.15);color:var(--teal)}
    .badge-offline{background:rgba(232,99,111,0.15);color:var(--coral)}
    .section-label{font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#555;margin-bottom:10px;display:flex;align-items:center;gap:8px}
    .section-label::before{content:"";width:4px;height:4px;background:var(--teal);border-radius:50%}
    .stat-value{font-size:22px;font-weight:700;color:var(--teal)}
    .stat-label{font-size:11px;color:#555;margin-top:2px}
  </style>
</head>
</head>
<body>
  <div class="ambient-grid"></div>
  <nav class="nav-bar glass-panel font-mono text-xs">
    <div style="display:flex;align-items:center;gap:16px">
      <span style="font-weight:700;letter-spacing:0.2em">P31<span class="text-teal">_EPCP</span></span>
      <div style="width:1px;height:16px;background:var(--border)"></div>
      <span class="text-muted" id="auth-status">AUTHENTICATING...</span>
    </div>
    <button class="btn" id="sync-btn">[ SYNC ]</button>
  </nav>
  <div class="container" id="app"></div>
  
  <script>
    function loadDashboard(){
      var app = document.getElementById("app");
      app.innerHTML = '<div class="font-mono text-teal" style="text-align:center;margin-top:100px;letter-spacing:0.2em">SYNCING TELEMETRY...</div>';
      fetch("/api/whoami").then(function(r){return r.json()}).then(function(whoami){
        document.getElementById("auth-status").innerHTML = whoami.authenticated ? whoami.email.toUpperCase() + ' <span class="text-gold">[' + whoami.role + ']</span>' : "ANONYMOUS READ-ONLY";
        fetch("/api/status").then(function(r){return r.json()}).then(function(status){
          renderDashboard(status);
        }).catch(function(e){app.innerHTML='<div class="text-coral font-mono">ERROR: ' + e.message + '</div>'});
      }).catch(function(e){app.innerHTML='<div class="text-coral font-mono">AUTH ERROR: ' + e.message + '</div>'});
    }
    
    function renderDashboard(status){
      var app = document.getElementById("app");
      var out = "";
      
      var workerCount = status.workers ? status.workers.length : 0;
      var onlineCount = status.workers ? status.workers.filter(function(w){return w.status==="online"}).length : 0;
      var degradedCount = workerCount - onlineCount;
      
      out += '<div class="grid-3">';
      out += '<div class="glass-panel rounded-xl card"><div class="card-header font-mono">Fleet Integrity</div><div class="kpi-value text-teal">' + onlineCount + '</div><div class="text-muted font-mono text-xs">ONLINE NODES</div></div>';
      out += '<div class="glass-panel rounded-xl card"><div class="card-header font-mono">Anomalies</div><div class="kpi-value text-coral">' + degradedCount + '</div><div class="text-muted font-mono text-xs">OFFLINE / DEGRADED</div></div>';
      out += '<div class="glass-panel rounded-xl card"><div class="card-header font-mono">Topology Size</div><div class="kpi-value">' + workerCount + '</div><div class="text-muted font-mono text-xs">TOTAL VERTICES</div></div>';
      out += '</div>';
      
      if(status.legal && status.legal.next_hearing){
        out += '<div class="alert-box glass-panel font-mono text-sm"><span style="font-weight:700">⚠ LEGAL HOLD ACTIVE:</span> ' + status.legal.next_hearing + ' &mdash; ' + status.legal.case + '</div>';
      }
      
      out += '<div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">';
      
      out += '<div><div class="glass-panel rounded-xl card"><div class="card-header font-mono">Node Topology</div>';
      if(status.workers){
        status.workers.forEach(function(w){
          var dotClass = w.status==="online" ? "status-online" : w.status==="debug" ? "status-degraded" : "status-offline";
          var statusColor = w.status==="online" ? "text-teal" : w.status==="debug" ? "text-gold" : "text-coral";
          out += '<div class="worker-row font-mono text-sm" data-target="' + w.name + '">';
          out += '<div style="display:flex;align-items:center;pointer-events:none"><span class="status-dot ' + dotClass + '"></span><span>' + w.name + '</span></div>';
          out += '<span class="' + statusColor + '" style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;pointer-events:none">' + w.status + '</span>';
          out += '</div>';
          out += '<div class="worker-details font-mono" id="details-' + w.name + '">';
          out += '<div style="margin-bottom:16px;color:#94a3b8">TARGET: <a href="' + w.url + '" target="_blank" style="color:var(--teal);text-decoration:none">' + w.url + '</a></div>';
          out += '<div style="display:flex;gap:8px">';
          out += '<button class="btn btn-coral btn-action" data-action="quarantine" data-name="' + w.name + '">[ QUARANTINE ]</button>';
          out += '<button class="btn btn-gold btn-action" data-action="rollback" data-name="' + w.name + '">[ ROLLBACK ]</button>';
          out += '</div></div>';
        });
      }
      out += '</div></div>';
      
      out += '<div style="display:flex;flex-direction:column;gap:24px">';
      
    if(status.financial){
          out += '<div class="glass-panel rounded-xl card"><div class="card-header font-mono">Thermodynamics (Economics)</div>';
          out += '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:8px 0"><span class="text-muted font-mono text-xs">L.O.V.E. BUFFER</span><span class="font-mono text-sm font-bold text-teal">' + status.financial.operating_buffer + '</span></div>';
          out += '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:8px 0"><span class="text-muted font-mono text-xs">GRANTS ACTIVE</span><span class="font-mono text-sm text-teal">' + status.financial.grants_active + '</span></div>';
          out += '<div style="display:flex;flex-direction:column;padding:8px 0;gap:4px"><span class="text-muted font-mono text-xs">ENTITY STATUS</span><span class="font-mono text-xs text-gold">' + status.financial.corp_status + '</span></div>';
          out += '<div style="display:flex;flex-direction:column;padding:8px 0;gap:4px"><span class="text-muted font-mono text-xs">NEXT HEARING</span><span class="font-mono text-sm text-coral">' + (status.legal ? status.legal.next_hearing || "N/A" : "N/A") + '</span></div>';
          out += '</div>';
       }
       
      // Social Communications Card
        out += '<div class="glass-panel rounded-xl card"><div class="card-header font-mono">Social Communications</div>';
        if(status.social) {
          var platforms = status.social.platforms || {};
          var platKeys = Object.keys(platforms);
          if(platKeys.length > 0) {
            platKeys.forEach(function(p) {
              var cfg = platforms[p];
              var icon = cfg.configured ? '🟢' : '⚪';
              var statusText = cfg.configured ? 'ACTIVE' : 'OFFLINE';
              var statusColor = cfg.configured ? 'text-teal' : 'text-coral';
              out += '<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border);padding:8px 0"><span class="font-mono text-sm">' + icon + ' ' + p + '</span><span class="' + statusColor + ' font-mono text-xs">' + statusText + '</span></div>';
            });
          } else {
            out += '<div style="padding:8px 0;color:#6b7280;font-size:12px">No platforms configured</div>';
          }
        } else {
          out += '<div style="padding:8px 0;color:#6b7280;font-size:12px">Social worker offline</div>';
        }
        out += '<div style="display:flex;flex-direction:column;gap:4px;padding:8px 0">';
        out += '<div class="font-mono text-xs text-muted">Discord Bot:</div>';
        out += '<div class="font-mono text-sm text-teal">✓ Classic Willy#1581 Online</div>';
        out += '</div>';
       out += '<div style="display:flex;gap:8px;padding-top:8px">';
       out += '<button class="btn btn-teal" onclick="triggerWave()" style="flex:1">[ BROADCAST ]</button>';
       out += '<button class="btn btn-coral" onclick="runPreflight()" style="flex:1">[ PREFLIGHT ]</button>';
       out += '</div>';
       out += '</div>';
      
      if(status.dates && status.dates.length){
        out += '<div class="glass-panel rounded-xl card"><div class="card-header font-mono">Temporal Vectors</div>';
        status.dates.slice(0,5).forEach(function(d){
          out += '<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)"><span class="font-mono text-teal text-xs" style="min-width:60px">' + d.date + '</span><span class="font-mono text-xs">' + d.event + '</span></div>';
        });
        out += '</div>';
      }
      
      out += '</div></div>';
      app.innerHTML = out;
    }
    
    document.getElementById("sync-btn").addEventListener("click", loadDashboard);
    
     document.addEventListener("click", function(e) {
       var row = e.target.closest(".worker-row");
       if(row) {
         var targetId = row.getAttribute("data-target");
         var el = document.getElementById("details-" + targetId);
         if(el) el.style.display = (el.style.display === "block") ? "none" : "block";
       }
       var btn = e.target.closest(".btn-action");
       if(btn) {
         var action = btn.getAttribute("data-action");
         var name = btn.getAttribute("data-name");
         if(action === "quarantine") alert("EPCP POLICY ENFORCEMENT: Quarantining node " + name);
         if(action === "rollback") alert("EPCP ARTIFACT SWAP: Rolling back node " + name);
       }
     });
     
     function triggerWave() {
       var wave = prompt("Enter wave name (weekly_update, midweek, weekend_recap, etc.):");
       if(!wave) return;
       fetch("https://social.p31ca.org/trigger", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ wave: wave })
       }).then(function(r) { return r.json(); }).then(function(data) {
         alert("Wave triggered: " + wave + "\nStatus: " + (data.status || "unknown"));
         loadDashboard();
       }).catch(function(e) {
         alert("Error: " + e.message);
       });
     }
     
     function runPreflight() {
       fetch("https://social.p31ca.org/preflight", {
         method: "POST"
       }).then(function(r) { return r.json(); }).then(function(data) {
         var msg = data.allGreen ? "✅ All links GREEN" : "⚠️ Some links FAILED";
         msg += "\n\n" + (data.results || []).map(function(r) {
           return r.name + ": " + r.status;
         }).join("\n");
         alert(msg);
       }).catch(function(e) {
         alert("Error: " + e.message);
       });
     }
     
     loadDashboard();
  </script>
</body>
</html>`;
}
