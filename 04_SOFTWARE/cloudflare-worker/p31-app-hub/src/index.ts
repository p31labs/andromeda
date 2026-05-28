import appsData from './apps-registry.json';

interface App {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  tier: string;
  status: string;
  icon: string;
  color: string;
  url: string;
  repo: string;
  pillar_status: number;
  features: string[];
  tests?: number;
  owner: string;
  deployment: string;
  worker?: string;
}

interface Request extends EventTarget {
  url: string;
}

interface Env {
  APP_REGISTRY: KVNamespace;
  APP_STATUS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL((request as any).url);
    const path = url.pathname;
    const searchParams = url.searchParams;

    // API Routes
    if (path === '/api/apps') {
      return handleAppsList(searchParams);
    }

    if (path.startsWith('/api/apps/')) {
      const appId = path.replace('/api/apps/', '');
      return handleAppDetail(appId);
    }

    if (path === '/api/health') {
      return handleHealth(env);
    }

    if (path === '/api/search') {
      const query = searchParams.get('q') || '';
      return handleSearch(query);
    }

    // HTML Routes
    if (path === '/' || path === '') {
      return handleHome();
    }

    if (path === '/apps') {
      return handleAppsBrowse(searchParams);
    }

    if (path.startsWith('/app/')) {
      const appId = path.replace('/app/', '');
      return handleAppPage(appId);
    }

    if (path === '/dev') {
      return handleDeveloperConsole();
    }

    return new Response('Not Found', { status: 404 });
  },
};

// === API HANDLERS ===

function handleAppsList(searchParams: URLSearchParams): Response {
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  let apps = appsData.apps as App[];

  if (category) {
    apps = apps.filter(app => app.category === category);
  }

  if (status) {
    apps = apps.filter(app => app.status === status);
  }

  return jsonResponse({
    count: apps.length,
    apps,
    categories: Object.keys(appsData.categories),
  });
}

function handleAppDetail(appId: string): Response {
  const app = (appsData.apps as App[]).find(a => a.id === appId);

  if (!app) {
    return jsonResponse({ error: 'App not found' }, 404);
  }

  return jsonResponse({
    ...app,
    status_info: (appsData.statuses as any)[app.status],
    category_info: (appsData.categories as any)[app.category],
  });
}

function handleHealth(env: Env): Response {
  return jsonResponse({
    status: 'operational',
    timestamp: new Date().toISOString(),
    services: {
      'app-hub': 'healthy',
      'kv-registry': 'healthy',
    },
  });
}

function handleSearch(query: string): Response {
  const apps = (appsData.apps as App[]).filter(app =>
    app.name.toLowerCase().includes(query.toLowerCase()) ||
    app.tagline.toLowerCase().includes(query.toLowerCase()) ||
    app.description.toLowerCase().includes(query.toLowerCase()) ||
    app.features.some(f => f.toLowerCase().includes(query.toLowerCase()))
  );

  return jsonResponse({
    query,
    results: apps,
    count: apps.length,
  });
}

// === HTML HANDLERS ===

function handleHome(): Response {
  return htmlResponse(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>P31 App Hub</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          color: #333;
        }
        .nav { background: rgba(0,0,0,0.1); padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; }
        .nav a { color: white; text-decoration: none; margin: 0 1rem; font-weight: 500; }
        .hero {
          text-align: center;
          padding: 4rem 1rem;
          color: white;
        }
        .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
        .hero p { font-size: 1.3rem; margin-bottom: 2rem; opacity: 0.9; }
        .search-box {
          max-width: 600px;
          margin: 2rem auto;
          display: flex;
          gap: 0.5rem;
        }
        .search-box input {
          flex: 1;
          padding: 1rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
        }
        .search-box button {
          padding: 1rem 2rem;
          background: #FF6B6B;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }
        .apps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          padding: 3rem;
          background: white;
        }
        .app-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          cursor: pointer;
        }
        .app-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }
        .app-header {
          padding: 1.5rem;
          background: linear-gradient(135deg, var(--color) 0%, rgba(0,0,0,0.1) 100%);
          color: white;
        }
        .app-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .app-name { font-size: 1.5rem; font-weight: bold; }
        .app-tagline { font-size: 0.9rem; opacity: 0.9; margin-top: 0.5rem; }
        .app-body { padding: 1.5rem; }
        .app-status {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: bold;
          margin-bottom: 1rem;
          background: var(--status-bg);
          color: white;
        }
        .app-features {
          font-size: 0.9rem;
          color: #666;
          margin: 1rem 0;
          line-height: 1.6;
        }
        .app-footer {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }
        .app-button {
          flex: 1;
          padding: 0.75rem;
          text-align: center;
          text-decoration: none;
          background: #f0f0f0;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: bold;
          transition: background 0.2s;
        }
        .app-button:hover { background: #e0e0e0; }
        .app-button.primary { background: var(--color); color: white; }
        .category-filter {
          padding: 1rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
          background: white;
          border-bottom: 1px solid #eee;
        }
        .filter-btn {
          padding: 0.5rem 1rem;
          border: 2px solid #ddd;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-btn.active {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }
        footer {
          background: #333;
          color: white;
          text-align: center;
          padding: 2rem;
        }
      </style>
    </head>
    <body>
      <div class="nav">
        <div style="color: white; font-weight: bold; font-size: 1.3rem;">🔷 P31 App Hub</div>
        <div>
          <a href="/">Home</a>
          <a href="/apps">Browse</a>
          <a href="/dev">Developer</a>
        </div>
      </div>

      <div class="hero">
        <h1>P31 Ecosystem Apps</h1>
        <p>Secure, sovereign, encrypted-first applications</p>
        <div class="search-box">
          <input type="text" id="search" placeholder="Search apps..." />
          <button onclick="search()">Search</button>
        </div>
      </div>

      <div class="category-filter">
        <button class="filter-btn active" onclick="filterByCategory('')">All</button>
        <button class="filter-btn" onclick="filterByCategory('marketplace')">🏪 Marketplace</button>
        <button class="filter-btn" onclick="filterByCategory('family')">👨‍👩‍👧‍👦 Family</button>
        <button class="filter-btn" onclick="filterByCategory('inventory')">📦 Inventory</button>
        <button class="filter-btn" onclick="filterByCategory('property')">🏞️ Property</button>
        <button class="filter-btn" onclick="filterByCategory('education')">🎓 Education</button>
      </div>

      <div class="apps-grid" id="apps-grid">
        Loading apps...
      </div>

      <footer>
        <p>P31 Labs, Inc. | <a href="https://p31ca.org" style="color: #667eea;">p31ca.org</a> | EIN: 42-1888158</p>
      </footer>

      <script>
        const statusColors = {
          'ready-for-launch': '#4CAF50',
          'ready-for-deployment': '#2196F3',
          'ready-for-customization': '#FF9800',
          'in-development': '#9C27B0',
        };

        async function loadApps(category = '') {
          const url = category ? '/api/apps?category=' + category : '/api/apps';
          const res = await fetch(url);
          const data = await res.json();

          const grid = document.getElementById('apps-grid');
          grid.innerHTML = data.apps.map(app => \`
            <div class="app-card" style="--color: \${app.color}; --status-bg: \${statusColors[app.status]}">
              <div class="app-header">
                <div class="app-icon">\${app.icon}</div>
                <div class="app-name">\${app.name}</div>
                <div class="app-tagline">\${app.tagline}</div>
              </div>
              <div class="app-body">
                <div class="app-status">\${app.status.replace(/-/g, ' ').toUpperCase()}</div>
                <div class="app-features">
                  \${app.features.slice(0, 3).map(f => '• ' + f).join('<br>')}
                </div>
                <div class="app-footer">
                  <a href="/app/\${app.id}" class="app-button primary">View</a>
                  <a href="\${app.url}" target="_blank" class="app-button">Launch</a>
                </div>
              </div>
            </div>
          \`).join('');
        }

        function filterByCategory(cat) {
          document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          event.target.classList.add('active');
          loadApps(cat);
        }

        function search() {
          const query = document.getElementById('search').value;
          if (query) window.location.href = '/apps?q=' + encodeURIComponent(query);
        }

        document.getElementById('search').addEventListener('keypress', (e) => {
          if (e.key === 'Enter') search();
        });

        loadApps();
      </script>
    </body>
    </html>
  `);
}

function handleAppsBrowse(searchParams: URLSearchParams): Response {
  const query = searchParams.get('q');
  const category = searchParams.get('category');

  return htmlResponse(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Browse Apps - P31 Hub</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 { margin-bottom: 2rem; }
        .app-list { display: flex; flex-direction: column; gap: 1rem; }
        .app-item {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          display: flex;
          gap: 1.5rem;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .app-item-icon { font-size: 3rem; }
        .app-item-content { flex: 1; }
        .app-item-name { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
        .app-item-desc { color: #666; margin-bottom: 0.5rem; }
        .app-item-meta { font-size: 0.9rem; color: #999; }
        .app-item-actions { display: flex; gap: 1rem; }
        .btn { padding: 0.75rem 1.5rem; border-radius: 4px; text-decoration: none; font-weight: bold; cursor: pointer; border: none; }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #e0e0e0; color: #333; }
      </style>
    </head>
    <body>
      <a href="/" style="text-decoration: none; color: #667eea; margin-bottom: 1rem; display: inline-block;">← Back to Hub</a>
      <h1>${query ? `Search Results for "${query}"` : 'Browse All Apps'}</h1>
      <div class="app-list" id="list">Loading...</div>

      <script>
        async function load() {
          const url = ${query ? "'/api/search?q=' + encodeURIComponent('" + query + "')" : "'/api/apps'"};
          const res = await fetch(url);
          const data = await res.json();

          const list = document.getElementById('list');
          list.innerHTML = (data.results || data.apps).map(app => \`
            <div class="app-item">
              <div class="app-item-icon">\${app.icon}</div>
              <div class="app-item-content">
                <div class="app-item-name">\${app.name}</div>
                <div class="app-item-desc">\${app.tagline}</div>
                <div class="app-item-meta">
                  \${app.pillar_status}/12 Pillars • \${app.tests || 0} Tests • \${app.status.replace(/-/g, ' ')}
                </div>
              </div>
              <div class="app-item-actions">
                <a href="/app/\${app.id}" class="btn btn-secondary">Details</a>
                <a href="\${app.url}" target="_blank" class="btn btn-primary">Launch</a>
              </div>
            </div>
          \`).join('');
        }
        load();
      </script>
    </body>
    </html>
  `);
}

function handleAppPage(appId: string): Response {
  const app = (appsData.apps as App[]).find(a => a.id === appId);

  if (!app) {
    return htmlResponse('<h1>App not found</h1>', 404);
  }

  return htmlResponse(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${app.name} - P31 Hub</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .header {
          background: linear-gradient(135deg, ${app.color} 0%, rgba(0,0,0,0.1) 100%);
          color: white;
          padding: 2rem;
          text-align: center;
        }
        .header-icon { font-size: 4rem; margin-bottom: 1rem; }
        .header-title { font-size: 2rem; margin-bottom: 0.5rem; }
        .header-tagline { font-size: 1.2rem; opacity: 0.9; }
        .container {
          max-width: 900px;
          margin: 2rem auto;
          padding: 0 1rem;
        }
        .section {
          background: white;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .section h2 { margin-top: 0; margin-bottom: 1rem; color: #333; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .feature { padding: 1rem; background: #f9f9f9; border-radius: 4px; }
        .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
        .meta-item { padding: 1rem; background: #f9f9f9; border-radius: 4px; }
        .meta-label { font-size: 0.85rem; color: #999; text-transform: uppercase; }
        .meta-value { font-weight: bold; margin-top: 0.5rem; }
        .buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          flex-wrap: wrap;
        }
        .btn {
          padding: 1rem 2rem;
          border-radius: 4px;
          text-decoration: none;
          font-weight: bold;
          text-align: center;
          border: none;
          cursor: pointer;
        }
        .btn-primary { background: ${app.color}; color: white; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .badge { display: inline-block; padding: 0.5rem 1rem; background: #667eea; color: white; border-radius: 20px; margin-right: 0.5rem; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-icon">${app.icon}</div>
        <div class="header-title">${app.name}</div>
        <div class="header-tagline">${app.tagline}</div>
      </div>

      <div class="container">
        <div class="section">
          <p>${app.description}</p>
          <div class="buttons">
            <a href="${app.url}" target="_blank" class="btn btn-primary">🚀 Launch App</a>
            <a href="https://github.com/p31labs/p31-andromeda/tree/main/${app.repo}" target="_blank" class="btn btn-secondary">📦 View Code</a>
            <a href="/" class="btn btn-secondary">← Back</a>
          </div>
        </div>

        <div class="section">
          <h2>Key Features</h2>
          <div class="features">
            ${app.features.map(f => `<div class="feature">✓ ${f}</div>`).join('')}
          </div>
        </div>

        <div class="section">
          <h2>Technical Details</h2>
          <div class="meta">
            <div class="meta-item">
              <div class="meta-label">Status</div>
              <div class="meta-value">${app.status.replace(/-/g, ' ')}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">12-Pillar Score</div>
              <div class="meta-value">${app.pillar_status}/12 ✓</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Test Suite</div>
              <div class="meta-value">${app.tests || 0} tests</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Category</div>
              <div class="meta-value">${app.category}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Deployment</div>
              <div class="meta-value">${app.deployment}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Owner</div>
              <div class="meta-value">${app.owner}</div>
            </div>
          </div>
          <div style="margin-top: 1.5rem;">
            <div class="badge">Post-Quantum Cryptography</div>
            <div class="badge">ML-KEM-768</div>
            <div class="badge">ML-DSA-65</div>
            <div class="badge">Offline-First</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
}

function handleDeveloperConsole(): Response {
  return htmlResponse(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Developer Console - P31 Hub</title>
      <style>
        body {
          font-family: 'Monaco', 'Courier New', monospace;
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 1rem;
          margin: 0;
        }
        .console {
          max-width: 1200px;
          margin: 0 auto;
          background: #252526;
          border-radius: 4px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        h1 { color: #4ec9b0; margin-top: 0; }
        h2 { color: #569cd6; margin-top: 1.5rem; }
        .endpoint {
          background: #1e1e1e;
          padding: 1rem;
          margin: 0.5rem 0;
          border-radius: 4px;
          border-left: 3px solid #4ec9b0;
          font-size: 0.9rem;
        }
        .method {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #264f78;
          color: #9cdcfe;
          margin-right: 0.5rem;
          border-radius: 2px;
        }
        code { color: #ce9178; }
        .status { color: #4ec9b0; }
        a { color: #4ec9b0; text-decoration: none; }
        a:hover { text-decoration: underline; }
        pre {
          background: #1e1e1e;
          padding: 1rem;
          border-radius: 4px;
          overflow-x: auto;
          color: #ce9178;
        }
      </style>
    </head>
    <body>
      <div class="console">
        <h1>🔷 P31 App Hub Developer Console</h1>
        <p>API endpoints and integration guide for developers</p>

        <h2>API Endpoints</h2>

        <div class="endpoint">
          <div class="method">GET</div>
          <code>/api/apps</code>
          <p style="margin: 0.5rem 0 0 0;">List all applications with optional filters</p>
          <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #858585;">
            Query: <code>?category=marketplace&status=ready-for-launch</code>
          </div>
        </div>

        <div class="endpoint">
          <div class="method">GET</div>
          <code>/api/apps/:id</code>
          <p style="margin: 0.5rem 0 0 0;">Get detailed app information</p>
          <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #858585;">
            Example: <code>/api/apps/retro-vault</code>
          </div>
        </div>

        <div class="endpoint">
          <div class="method">GET</div>
          <code>/api/search</code>
          <p style="margin: 0.5rem 0 0 0;">Search apps by name, description, or features</p>
          <div style="margin-top: 0.5rem; font-size: 0.85rem; color: #858585;">
            Query: <code>?q=encryption</code>
          </div>
        </div>

        <div class="endpoint">
          <div class="method">GET</div>
          <code>/api/health</code>
          <p style="margin: 0.5rem 0 0 0;">Check hub health status</p>
        </div>

        <h2>Example Integrations</h2>

        <h3>Get All Marketplace Apps</h3>
        <pre>fetch('/api/apps?category=marketplace&status=ready-for-launch')
  .then(r => r.json())
  .then(data => console.log(data.apps))</pre>

        <h3>Search for Encryption Features</h3>
        <pre>fetch('/api/search?q=encryption')
  .then(r => r.json())
  .then(data => console.log(\`Found \${data.count} apps\`))</pre>

        <h3>Get Retro-Vault Details</h3>
        <pre>fetch('/api/apps/retro-vault')
  .then(r => r.json())
  .then(app => console.log(app))</pre>

        <h2>Status Codes</h2>
        <div style="margin-top: 1rem;">
          <div><span class="status">✓ ready-for-launch</span> — Production ready, launched</div>
          <div><span class="status">→ ready-for-deployment</span> — Tested, ready to deploy</div>
          <div><span class="status">⚙ ready-for-customization</span> — Available for customization</div>
          <div><span class="status">🔨 in-development</span> — Currently under development</div>
        </div>

        <h2>Quick Links</h2>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/apps">Browse Apps</a></li>
          <li><a href="https://github.com/p31labs">GitHub</a></li>
          <li><a href="https://p31ca.org">P31 Labs</a></li>
        </ul>
      </div>
    </body>
    </html>
  `);
}

// === UTILITIES ===

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
