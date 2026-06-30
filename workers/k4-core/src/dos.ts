import { DurableObject } from 'cloudflare:workers';

const CORS_DO = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonDo(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_DO },
  });
}
function errDo(message: string, status = 400): Response {
  return jsonDo({ error: message, timestamp: new Date().toISOString() }, status);
}

const VOTE = { YES: 'yes', NO: 'no', ABSTAIN: 'abstain' } as const;
type VoteValue = typeof VOTE[keyof typeof VOTE];
const PROPOSAL_STATUS = { ACTIVE: 'active', PASSED: 'passed', REJECTED: 'rejected', EXECUTED: 'executed', VETOED: 'vetoed' } as const;
type ProposalStatus = typeof PROPOSAL_STATUS[keyof typeof PROPOSAL_STATUS];

const KV = {
  proposalList: (did: string) => `gov:proposals:${did}`,
  proposalDetail: (id: string) => `gov:proposal:${id}`,
  voteKey: (proposalId: string, voterDid: string) => `gov:vote:${proposalId}:${voterDid}`,
  tallyKey: (proposalId: string) => `gov:tally:${proposalId}`,
  vetoKey: (id: string) => `gov:veto:${id}`,
};

export class GovernanceEngineDO extends DurableObject {
  ctx: any;
  env: any;
  constructor(ctx: any, env: any) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_DO });
    if (path === '/health' && request.method === 'GET') return jsonDo({ ok: true, service: 'GovernanceEngineDO', ts: Date.now() });
    if (path === '/proposals' && request.method === 'POST') return this.createProposal(request);
    const proposalMatch = path.match(/^\/proposals\/([^/]+)$/);
    if (proposalMatch) {
      const id = proposalMatch[1];
      if (request.method === 'GET') return this.getProposal(id);
      if (request.method === 'DELETE') return this.deleteProposal(id, request);
    }
    const proposalActionMatch = path.match(/^\/proposals\/([^/]+)\/([^/]+)$/);
    if (proposalActionMatch) {
      const [, id, action] = proposalActionMatch;
      if (action === 'vote' && request.method === 'POST') return this.castVote(id, request);
      if (action === 'execute' && request.method === 'PATCH') return this.executeProposal(id);
      if (action === 'veto' && request.method === 'POST') return this.vetoProposal(id, request);
    }
    if (path.startsWith('/proposals') && request.method === 'GET' && path === '/proposals') return this.listProposals(request);
    if (path.startsWith('/delegations') && request.method === 'POST') return this.upsertDelegation(request);
    if (path.startsWith('/delegations') && request.method === 'GET') return this.getDelegation(request);
    return errDo('Not found', 404);
  }
  async createProposal(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const { title, description, param, target, creatorDid } = body;
    if (!title || !description || !param || !target || !creatorDid) return errDo('Missing fields: title, description, param, target, creatorDid');
    const votingDays = parseInt(this.env.GOVERNANCE_VOTING_DAYS || '7', 10);
    const vetoWindowMs = parseInt(this.env.GOVERNANCE_VETO_WINDOW_MS || '86400000', 10);
    const now = Date.now();
    const closesAt = now + votingDays * 86400000;
    const proposal = {
      id: crypto.randomUUID(), title: String(title), description: String(description), param: String(param), target: String(target), creatorDid: String(creatorDid),
      status: PROPOSAL_STATUS.ACTIVE, votesFor: 0, votesAgainst: 0, abstainCount: 0, totalStaked: 0, createdAt: now, closesAt, executedAt: null, vetoDeadline: now + vetoWindowMs,
    };
    await this.ctx.storage.put(KV.proposalDetail(proposal.id), JSON.stringify(proposal));
    await this.env.GOVERNANCE_KV.put(KV.proposalList(proposal.creatorDid), JSON.stringify([proposal.id]));
    try {
      await this.env.GOVERNANCE_DB.prepare('INSERT INTO governance_proposals (id, title, description, param, target, creator_did, status, votes_for, votes_against, created_at, closes_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(proposal.id, proposal.title, proposal.description, proposal.param, proposal.target, proposal.creatorDid, proposal.status, 0, 0, Math.floor(now / 1000), Math.floor(closesAt / 1000)).run();
    } catch (e) { console.error('[governance-engine] D1 insert failed (non-fatal):', e); }
    return jsonDo({ proposal }, 201);
  }
  async getProposal(id: string): Promise<Response> {
    const raw = await this.ctx.storage.get(KV.proposalDetail(id));
    if (!raw) return errDo('Proposal not found', 404);
    const proposal: any = JSON.parse(raw as string);
    const votes = await this.ctx.storage.list({ prefix: `gov:vote:${id}:` });
    const voteList = [...votes.values()].map((v) => JSON.parse(v as string));
    proposal.votes = voteList;
    proposal.voteCount = voteList.length;
    return jsonDo(proposal);
  }
  async deleteProposal(id: string, _request: Request): Promise<Response> {
    const raw = await this.ctx.storage.get(KV.proposalDetail(id));
    if (!raw) return errDo('Proposal not found', 404);
    const proposal: any = JSON.parse(raw as string);
    if (proposal.status !== PROPOSAL_STATUS.ACTIVE) return errDo('Only active proposals can be deleted');
    proposal.status = PROPOSAL_STATUS.REJECTED;
    proposal.executedAt = Date.now();
    await this.ctx.storage.put(KV.proposalDetail(id), JSON.stringify(proposal));
    return jsonDo({ ok: true, status: PROPOSAL_STATUS.REJECTED });
  }
  async castVote(proposalId: string, request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const { voterDid, vote, stakeAmount } = body;
    if (!voterDid || !vote) return errDo('Missing voterDid or vote');
    if (!Object.values(VOTE).includes(vote as VoteValue)) return errDo('Vote must be yes/no/abstain');
    const proposalRaw = await this.ctx.storage.get(KV.proposalDetail(proposalId));
    if (!proposalRaw) return errDo('Proposal not found', 404);
    const proposal: any = JSON.parse(proposalRaw as string);
    if (proposal.status !== PROPOSAL_STATUS.ACTIVE) return errDo('Proposal is not active');
    if (Date.now() > proposal.closesAt) return errDo('Voting period has ended');
    const voteKey = KV.voteKey(proposalId, String(voterDid));
    const existing = await this.ctx.storage.get(voteKey);
    if (existing) return errDo('Already voted on this proposal');
    let lockedStake = 0;
    if (this.env.LOVE_LEDGER_API && stakeAmount && Number(stakeAmount) > 0) {
      try {
        const resp = await fetch(`${this.env.LOVE_LEDGER_API}/ledger/spend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromDid: voterDid, amount: Number(stakeAmount), memo: `gov:${proposalId}` }) });
        if (resp.ok) lockedStake = Number(stakeAmount);
      } catch (e) { console.error('[governance-engine] Stake lock failed:', e); }
    }
    const voteRecord = { proposalId, voterDid: String(voterDid), vote: vote as VoteValue, stakeAmount: lockedStake, createdAt: Date.now() };
    await this.ctx.storage.put(voteKey, JSON.stringify(voteRecord));
    proposal.votesFor += vote === VOTE.YES ? 1 : 0;
    proposal.votesAgainst += vote === VOTE.NO ? 1 : 0;
    proposal.abstainCount += vote === VOTE.ABSTAIN ? 1 : 0;
    proposal.totalStaked += lockedStake;
    await this.ctx.storage.put(KV.proposalDetail(proposalId), JSON.stringify(proposal));
    return jsonDo({ ok: true, proposal, vote: voteRecord });
  }
  async executeProposal(id: string): Promise<Response> {
    const raw = await this.ctx.storage.get(KV.proposalDetail(id));
    if (!raw) return errDo('Proposal not found', 404);
    const proposal: any = JSON.parse(raw as string);
    if (proposal.status !== PROPOSAL_STATUS.ACTIVE) return errDo('Already resolved');
    const vetoRaw = await this.ctx.storage.get(KV.vetoKey(id));
    if (vetoRaw) {
      proposal.status = PROPOSAL_STATUS.VETOED;
      proposal.executedAt = Date.now();
      await this.ctx.storage.put(KV.proposalDetail(id), JSON.stringify(proposal));
      return jsonDo({ ok: true, status: PROPOSAL_STATUS.VETOED, proposal });
    }
    const majority = parseFloat(this.env.GOVERNANCE_MAJORITY || '0.66');
    const totalVotes = proposal.votesFor + proposal.votesAgainst + proposal.abstainCount;
    if (totalVotes >= 1 && proposal.votesFor / Math.max(1, totalVotes) >= majority) {
      proposal.status = PROPOSAL_STATUS.PASSED;
    } else {
      proposal.status = PROPOSAL_STATUS.REJECTED;
    }
    proposal.executedAt = Date.now();
    await this.ctx.storage.put(KV.proposalDetail(id), JSON.stringify(proposal));
    try {
      await this.env.GOVERNANCE_DB.prepare('UPDATE governance_proposals SET status = ?, votes_for = ?, votes_against = ? WHERE id = ?').bind(proposal.status, proposal.votesFor, proposal.votesAgainst, id).run();
    } catch (e) { console.error('[governance-engine] D1 update failed (non-fatal):', e); }
    return jsonDo({ ok: true, status: proposal.status, proposal });
  }
  async vetoProposal(id: string, _request: Request): Promise<Response> {
    const raw = await this.ctx.storage.get(KV.proposalDetail(id));
    if (!raw) return errDo('Proposal not found', 404);
    const proposal: any = JSON.parse(raw as string);
    if (Date.now() > proposal.vetoDeadline) return errDo('Veto window has expired');
    await this.ctx.storage.put(KV.vetoKey(id), JSON.stringify({ vetoedAt: Date.now() }));
    return jsonDo({ ok: true, vetoed: true, proposalId: id });
  }
  async upsertDelegation(request: Request): Promise<Response> {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const { delegatorDid, delegateDid, expiresAt } = body;
    if (!delegatorDid || !delegateDid) return errDo('Missing delegatorDid or delegateDid');
    const record = { delegatorDid: String(delegatorDid), delegateDid: String(delegateDid), createdAt: Date.now(), expiresAt: expiresAt ? Number(expiresAt) : null };
    await this.ctx.storage.put(`gov:delegation:${delegatorDid}`, JSON.stringify(record));
    try {
      await this.env.GOVERNANCE_DB.prepare('INSERT OR REPLACE INTO governance_delegations (delegator_did, delegate_did, expires_at) VALUES (?, ?, ?)').bind(delegatorDid, delegateDid, record.expiresAt ? Math.floor(record.expiresAt / 1000) : null).run();
    } catch (e) { console.error('[governance-engine] D1 delegation insert failed:', e); }
    return jsonDo({ ok: true, delegation: record });
  }
  async getDelegation(_request: Request): Promise<Response> {
    return jsonDo({ ok: true, note: 'Delegations are keyed by delegatorDid — use GET /delegations/:delegatorDid' });
  }
  async listProposals(_request: Request): Promise<Response> {
    const all = await this.ctx.storage.list({ prefix: 'gov:proposal:' });
    const proposals = [...all.values()].map((v) => JSON.parse(v as string)).sort((a: any, b: any) => b.createdAt - a.createdAt);
    return jsonDo({ proposals, count: proposals.length });
  }
}

export class LoveTransactionDO extends DurableObject {
  constructor(ctx: any, env: any) { super(ctx, env); }
  async fetch(_request: Request): Promise<Response> {
    return jsonDo({ ok: true, note: 'Legacy DO — logic migrated to Worker-level D1' });
  }
}
