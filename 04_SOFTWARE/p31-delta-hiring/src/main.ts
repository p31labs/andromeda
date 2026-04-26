import './style.css';
import roleData from './data/role-packets.json';
import workData from './data/work-samples.json';
import type {
  RolePacket,
  RolePacketsData,
  WorkSamplesData,
  ProofRecord,
  ProofArtifact
} from './types';
import { parseHash, escapeHtml, setHashPath } from './utils';
import {
  listProofs,
  getProof,
  upsertProof,
  deleteProof,
  newProofTemplate,
  makeArtifact
} from './storage';

const packets = roleData as unknown as RolePacketsData;
const samples = workData as unknown as WorkSamplesData;

const app = document.getElementById('app')!;

function priorityClass(p: RolePacket['priority']): string {
  if (p === 'high') return 'pill pill-high';
  if (p === 'medium') return 'pill pill-med';
  return 'pill pill-low';
}

function navLink(
  name: string,
  label: string,
  current: string
): string {
  const active = name === current ? ' is-active' : '';
  return `<a class="${active}" href="#/${name === 'home' ? '' : name}">${escapeHtml(
    label
  )}</a>`;
}

function headerHtml(routeName: string): string {
  return `
  <header class="app-header">
    <a href="#/" class="brand" style="text-decoration:none;color:inherit">
      <div class="brand-mark" aria-hidden="true">Δ</div>
      <div>
        <h1>P31 Delta · Hiring</h1>
        <p>Role packets · Rubrics · Portable proof</p>
      </div>
    </a>
    <nav aria-label="Primary">
      ${navLink('home', 'Home', routeName)}
      ${navLink('roles', 'Open roles', routeName)}
      ${navLink('portfolio', 'My proofs', routeName)}
      ${navLink('governance', 'Governance', routeName)}
    </nav>
  </header>`;
}

function footerHtml(): string {
  return `<footer class="site">Proof records stay in your browser until you export. This is a candidate-side tool, not a cloud ATS.</footer>`;
}

function renderHome(): void {
  const body = `
    <main class="layout">
      <div class="card">
        <h2>Proof-of-competence, with provenance</h2>
        <p>Traditional hiring optimizes for proxies (titles, keyword resumes). This space publishes <strong>role packets</strong> (outcomes, constraints, rubric weights), maps each role to a <strong>bounded work sample</strong> (WCD), and lets you build a <strong>portable <code class="muted">p31.proofRecord</code></strong> you can download as JSON. Reviewers are still human; the system makes criteria visible before you invest time.</p>
        <p class="muted">L.O.V.E. rewards in your docs are a motivation layer, not a substitute for labor law, anti-discrimination rules, or paid-work rules for real production tasks. See Governance.</p>
        <p style="margin-top:1rem">
          <a class="btn primary" href="#/roles">Browse open roles</a>
          <a class="btn" href="#/portfolio" style="margin-left:0.5rem">My proofs</a>
        </p>
      </div>
      <div class="card">
        <h2>Equity tiers (from Delta canon)</h2>
        <div class="weights">
        ${escapeHtml('')}
        ${packets.org.equityTiers
          .map(
            (t) =>
              `<span><strong>${escapeHtml(String(t.label))}</strong> — ${escapeHtml(
                String(t.tokensRequired)
              )} L.O.V.E. · ${escapeHtml(String(t.equityPercent))}%</span>`
          )
          .join('')}
        </div>
      </div>
    </main>
  `;
  app.innerHTML = headerHtml('home') + body + footerHtml();
}

function renderRoles(): void {
  const cards = packets.roles
    .map((r) => {
      return `
    <div class="card job-card" role="link" tabindex="0" data-role="${escapeHtml(r.id)}"
      data-nav="1">
      <div style="display:flex;justify-content:space-between;align-items:start;gap:0.5rem;flex-wrap:wrap">
        <div>
          <h2 style="margin:0 0 0.25rem;font-size:1.05rem">${escapeHtml(r.title)}</h2>
          <p class="muted" style="margin:0;font-size:0.8rem">${escapeHtml(
            r.guild
          )} · ${escapeHtml(r.location)}</p>
        </div>
        <span class="${priorityClass(r.priority)}">${escapeHtml(r.priority).toUpperCase()}</span>
      </div>
      <p style="color:#94a3b8;font-size:0.9rem;margin:0.5rem 0 0">${escapeHtml(r.summary)}</p>
      <div class="tag-row">${r.tags
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join('')}</div>
    </div>`;
    })
    .join('');

  app.innerHTML =
    headerHtml('roles') +
    `<main class="layout">
      <p class="muted" style="margin:0 0 1rem">${
        packets.roles.length
      } open roles · updated ${escapeHtml(packets.updated)}</p>
      ${cards}
    </main>` +
    footerHtml();

  app.querySelectorAll<HTMLDivElement>('.job-card').forEach((el) => {
    const go = () => {
      const id = el.getAttribute('data-role');
      if (id) setHashPath(['roles', id]);
    };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  });
}

function renderRoleDetail(id: string): void {
  const r = packets.roles.find((x) => x.id === id);
  if (!r) {
    app.innerHTML = headerHtml('roles') + `<main class="layout"><p>Role not found.</p><a href="#/roles">Back</a></main>` + footerHtml();
    return;
  }
  const ws = samples.samples[r.workSample.wcdId];
  const weights = Object.entries(r.evaluationWeights)
    .map(([k, v]) => `${escapeHtml(k)}: ${(v * 100).toFixed(0)}%`)
    .join(' · ');

  const rubric = ws
    ? ws.rubric
        .map(
          (row) => `<li><strong>${escapeHtml(row.label)}</strong> (weight ${(row.weight * 100).toFixed(0)}%)</li>`
        )
        .join('')
    : '';

  const body = `
    <main class="layout">
      <p class="muted"><a href="#/roles">← All roles</a></p>
      <div class="card">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:0.5rem;align-items:start">
          <h2 style="margin:0">${escapeHtml(r.title)}</h2>
          <span class="${priorityClass(r.priority)}">${escapeHtml(r.priority).toUpperCase()}</span>
        </div>
        <p>${escapeHtml(r.summary)}</p>
        <div class="tag-row">${r.tags
          .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
          .join('')}</div>
      </div>
      <div class="card">
        <h2>Outcomes (by window)</h2>
        ${r.monthOutcomes
          .map(
            (m) => `<p class="muted" style="margin:0.5rem 0 0.15rem"><strong>${escapeHtml(
              m.window
            )}</strong></p><ul class="compact">${m.items
              .map((i) => `<li>${escapeHtml(i)}</li>`)
              .join('')}</ul>`
          )
          .join('')}
      </div>
      <div class="card">
        <h2>Constraints</h2>
        <ul class="compact">
        ${Object.entries(r.constraints)
          .map(
            ([k, v]) =>
              `<li><strong>${escapeHtml(k)}</strong>: ${escapeHtml(
                Array.isArray(v) ? v.join(', ') : String(v)
              )}</li>`
          )
          .join('')}
        </ul>
      </div>
      <div class="card">
        <h2>Evaluation weights (role packet)</h2>
        <p class="muted">${weights}</p>
        <h2 class="muted" style="font-size:0.8rem;margin:0.8rem 0 0.25rem">Accommodation & review</h2>
        <p class="muted" style="margin:0;font-size:0.88rem">${escapeHtml(
          r.accommodation
        )}</p>
      </div>
      <div class="card">
        <h2>Work sample: ${ws ? escapeHtml(ws.title) : escapeHtml(r.workSample.wcdId)}</h2>
        <p class="muted">WCD <code>${escapeHtml(r.workSample.wcdId)}</code> · +${r.workSample.loveReward} L.O.V.E. · diff ${r.workSample.difficulty}/5</p>
        ${
          ws
            ? `<p>${escapeHtml(ws.summary)}</p>
        <p class="muted" style="font-size:0.85rem">Time box: <strong>${ws.timeBoundHours}h</strong> · ${escapeHtml(
                samples.defaults.allowResources
              )}</p>
        <h3 class="muted" style="font-size:0.85rem">Deliverables</h3>
        <ul class="compact">${ws.deliverables
          .map((d) => `<li>${escapeHtml(d)}</li>`)
          .join('')}</ul>
        <h3 class="muted" style="font-size:0.85rem">Rubric (review plane)</h3>
        <ul class="compact">${rubric}</ul>`
            : '<p class="muted">No extended sample in catalog.</p>'
        }
        <p style="margin-top:1rem">
          <a class="btn primary" href="#/proof/new/${r.id}">Start proof record for this role</a>
        </p>
      </div>
    </main>
  `;
  app.innerHTML = headerHtml('roles') + body + footerHtml();
}

function renderGovernance(): void {
  const body = `
    <main class="layout">
      <div class="card">
        <h2>Governance (non-optional in real hiring)</h2>
        <ul class="compact">
          <li>This app does <strong>not</strong> store data on a server. Export is candidate-controlled.</li>
          <li>Equity, pay, and job classification are legal matters. Tokens are not a substitute for payroll law.</li>
          <li>Reasonable accommodation: the role packet calls out default async review; request alternatives in your cover note to the org.</li>
          <li>Blind review and calibration are org-side processes. This tool surfaces rubric dimensions to align expectations.</li>
        </ul>
      </div>
    </main>
  `;
  app.innerHTML = headerHtml('governance') + body + footerHtml();
}

function downloadJson(name: string, data: object): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function renderPortfolio(): void {
  const list = listProofs();
  const rows = list
    .map(
      (p) => {
        const role = packets.roles.find((r) => r.id === p.roleId);
        const title = role ? role.title : p.roleId;
        return `<tr>
        <td><a href="#/proof/${p.id}">${escapeHtml(p.id.slice(0, 8))}…</a></td>
        <td>${escapeHtml(title)}</td>
        <td class="muted">${escapeHtml(p.updated.slice(0, 10))}</td>
        <td>
          <button type="button" class="export-btn" data-id="${escapeHtml(p.id)}">Export</button>
          <button type="button" class="del-btn" data-id="${escapeHtml(p.id)}">Delete</button>
        </td>
      </tr>`;
      }
    )
    .join('');

  app.innerHTML =
    headerHtml('portfolio') +
    `<main class="layout">
      <div class="card">
        <h2>My proofs</h2>
        <p class="muted">Stored locally in this browser. Export JSON to back up or submit through an official channel when P31 provides one.</p>
        <p class="muted">Count: <strong>${list.length}</strong></p>
        ${
          list.length
            ? `<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:0.9rem">
          <thead><tr><th align="left">Id</th><th align="left">Role</th><th align="left">Updated</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`
            : '<p class="muted">No proofs yet. Open a role and click “Start proof record.”</p>'
        }
        <a class="btn" href="#/roles" style="margin-top:0.75rem">Browse roles</a>
      </div>
    </main>` +
    footerHtml();

  app.querySelectorAll<HTMLButtonElement>('.export-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id')!;
      const p = getProof(id);
      if (p) downloadJson(`p31-proof-${id.slice(0, 8)}.json`, p);
    });
  });
  app.querySelectorAll<HTMLButtonElement>('.del-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id')!;
      if (confirm('Delete this proof from local storage?')) {
        deleteProof(id);
        render();
      }
    });
  });
}

function formProofEditor(proof: ProofRecord, isNew: boolean): void {
  const role = packets.roles.find((r) => r.id === proof.roleId);
  const title = role ? role.title : proof.roleId;
  const ws = samples.samples[proof.wcdId];
  const rbt = ws?.rubric ?? [];

  const artHtml =
    proof.artifacts
      .map(
        (a) => `<div class="artifact-row" data-art="${escapeHtml(a.id)}">
      <header><strong>${escapeHtml(a.label)}</strong> <span class="muted">(${escapeHtml(
        a.kind
      )})</span>
        <button type="button" class="rem-art" data-art="${escapeHtml(a.id)}">Remove</button>
      </header>
      <a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(
        a.url
      )}</a>
      ${
        a.notes
          ? `<p class="muted" style="margin:0.35rem 0 0;font-size:0.85rem">${escapeHtml(
              a.notes
            )}</p>`
          : ''
      }
    </div>`
      )
      .join('') || '<p class="muted">No artifacts yet.</p>';

  const selfHtml = rbt
    .map((row) => {
      const v = proof.selfAssessment[row.id] ?? 3;
      return `<div class="rubric-dim">
      <label for="sa-${row.id}">${escapeHtml(row.label)} — ${(row.weight * 100).toFixed(
        0
      )}% (self, 1–5)</label>
      <input type="range" min="1" max="5" step="1" id="sa-${row.id}" name="sa-${
        row.id
      }" value="${v}" />
      <span class="muted sa-val" data-sa="${row.id}">Value: ${v}</span>
    </div>`;
    })
    .join('');

  const body = `
  <main class="layout">
    <p class="muted"><a href="#/portfolio">← Proofs</a> · <a href="#/roles/${proof.roleId}">Role packet</a></p>
    <div class="card">
      <h2 style="margin:0">${isNew ? 'New proof' : 'Edit proof'}</h2>
      <p class="muted">${escapeHtml(title)} · <code>${escapeHtml(proof.wcdId)}</code></p>
      <p class="muted" style="font-size:0.8rem">Record id: <code>${escapeHtml(
        proof.id
      )}</code></p>
    </div>
    <form id="proof-form" class="card" data-id="${escapeHtml(proof.id)}">
      <h3>Consent (export requires both)</h3>
      <label class="muted" style="display:flex;gap:0.5rem;align-items:center">
        <input type="checkbox" name="cp" ${
          proof.consent.dataProcessing ? 'checked' : ''
        } />
        I understand this tool stores drafts locally and export is my responsibility
      </label>
      <label class="muted" style="display:flex;gap:0.5rem;align-items:center;margin-top:0.5rem">
        <input type="checkbox" name="cs" ${
          proof.consent.shareWithReviewers ? 'checked' : ''
        } />
        I consent to share exported proof with reviewers if I submit it through an official P31 channel
      </label>

      <h3 style="margin-top:1.25rem">Artifacts (links to repo, file host, or PDF)</h3>
      <div id="artifact-list">${artHtml}</div>
      <div class="grid-2" style="margin-top:0.5rem">
        <div>
          <label for="a-kind">Kind</label>
          <select id="a-kind" name="a-kind">
            <option value="repo">repo</option>
            <option value="url">url</option>
            <option value="file">file</option>
            <option value="other">other</option>
          </select>
        </div>
        <div>
          <label for="a-label">Label</label>
          <input id="a-label" name="a-label" type="text" placeholder="My submission" />
        </div>
      </div>
      <label for="a-url">URL</label>
      <input id="a-url" name="a-url" type="url" placeholder="https://…" />
      <label for="a-notes">Notes (optional)</label>
      <textarea id="a-notes" name="a-notes" placeholder="Branch name, test commands…"></textarea>
      <button type="button" class="btn" id="add-art" style="margin-top:0.5rem">Add artifact</button>

      <h3 style="margin-top:1.25rem">Rubric (self assessment)</h3>
      ${selfHtml || '<p class="muted">No rubric in catalog for this WCD.</p>'}

      <h3>Candidate notes to reviewers</h3>
      <textarea name="cnotes" rows="5" placeholder="Accommodations, time taken, what you’d do next…">${escapeHtml(
        proof.candidateNotes
      )}</textarea>

      <div style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:0.5rem">
        <button type="submit" class="btn primary">Save</button>
        <button type="button" class="btn" id="btn-export">Export JSON</button>
        <button type="button" class="btn" id="btn-delete">Delete</button>
      </div>
    </form>
  </main>`;

  app.innerHTML = headerHtml('portfolio') + body + footerHtml();

  const form = document.getElementById('proof-form') as HTMLFormElement;
  const pr = { ...proof };

  form.querySelectorAll('input[type="range"]').forEach((el) => {
    el.addEventListener('input', () => {
      const id = (el as HTMLInputElement).id.replace('sa-', '');
      const span = app.querySelector(`.sa-val[data-sa="${id}"]`);
      if (span) span.textContent = `Value: ${(el as HTMLInputElement).value}`;
    });
  });

  app.querySelectorAll<HTMLButtonElement>('.rem-art').forEach((b) => {
    b.addEventListener('click', () => {
      const aid = b.getAttribute('data-art')!;
      pr.artifacts = pr.artifacts.filter((x) => x.id !== aid);
      formProofEditor(pr, false);
    });
  });

  document.getElementById('add-art')?.addEventListener('click', () => {
    const kind = (document.getElementById('a-kind') as HTMLSelectElement)
      .value as ProofArtifact['kind'];
    const label = (document.getElementById('a-label') as HTMLInputElement).value.trim();
    const url = (document.getElementById('a-url') as HTMLInputElement).value.trim();
    const notes = (document.getElementById('a-notes') as HTMLTextAreaElement).value.trim();
    if (!label || !url) {
      alert('Label and URL are required to add an artifact.');
      return;
    }
    pr.artifacts = [...pr.artifacts, makeArtifact(kind, label, url, notes || undefined)];
    (document.getElementById('a-label') as HTMLInputElement).value = '';
    (document.getElementById('a-url') as HTMLInputElement).value = '';
    (document.getElementById('a-notes') as HTMLTextAreaElement).value = '';
    formProofEditor(pr, false);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const dataProcessing = form.querySelector<HTMLInputElement>(
      'input[name="cp"]'
    )!.checked;
    const share = form.querySelector<HTMLInputElement>(
      'input[name="cs"]'
    )!.checked;
    pr.consent = { dataProcessing, shareWithReviewers: share, version: '1.0.0' };
    pr.candidateNotes = String(fd.get('cnotes') ?? '').slice(0, 8000);
    pr.selfAssessment = {};
    rbt.forEach((row) => {
      const raw = String(fd.get(`sa-${row.id}`) ?? '3');
      const v = parseInt(raw, 10);
      pr.selfAssessment[row.id] = Math.min(5, Math.max(1, Number.isFinite(v) ? v : 3));
    });
    pr.updated = new Date().toISOString();
    upsertProof(pr);
    formProofEditor(getProof(proof.id)!, false);
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    if (!pr.consent.dataProcessing || !pr.consent.shareWithReviewers) {
      alert('Check both consent boxes to export a coherent proof packet.');
      return;
    }
    if (pr.artifacts.length === 0) {
      if (!confirm('No artifacts. Export anyway?')) return;
    }
    downloadJson(`p31-proof-${pr.id}.json`, pr);
  });

  document.getElementById('btn-delete')?.addEventListener('click', () => {
    if (confirm('Delete this proof?')) {
      deleteProof(proof.id);
      setHashPath(['portfolio']);
      render();
    }
  });
}

function renderNewProof(roleId: string): void {
  const role = packets.roles.find((r) => r.id === roleId);
  if (!role) {
    app.innerHTML = headerHtml('portfolio') + `<main class="layout"><p>Role not found</p></main>` + footerHtml();
    return;
  }
  const base = newProofTemplate(roleId, role.workSample.wcdId);
  upsertProof(base);
  formProofEditor(base, true);
}

function renderEditProof(proofId: string): void {
  const p = getProof(proofId);
  if (!p) {
    app.innerHTML = headerHtml('portfolio') + `<main class="layout"><p>Not found. <a href="#/portfolio">Back</a></p></main>` + footerHtml();
    return;
  }
  formProofEditor(p, false);
}

function render(): void {
  const h = parseHash();
  if (h.name === 'home') return renderHome();
  if (h.name === 'roles' && h.id) return renderRoleDetail(h.id!);
  if (h.name === 'roles') return renderRoles();
  if (h.name === 'governance') return renderGovernance();
  if (h.name === 'portfolio') return renderPortfolio();
  if (h.name === 'proof-new' && h.id) return renderNewProof(h.id!);
  if (h.name === 'proof-edit' && h.id) return renderEditProof(h.id!);
  renderHome();
}

window.addEventListener('hashchange', () => render());
render();
