/**
 * CWP-22: Reflective Chamber Workflow
 * 
 * Weekly synthesis workflow that:
 * 1. Queries D1 for past 7 days of telemetry
 * 2. Computes longitudinal metrics
 * 3. Persists synthesis to operator's DO
 * 4. Triggers check-in prompt if masking cost exceeds threshold
 */

export interface Env {
  DB: D1Database;
  OPERATOR_STATE: DurableObjectNamespace;
  MASKING_COST_THRESHOLD: string;
  WEEKLY_CHECKIN_ENABLED: string;
}

interface SynthesisResult {
  period: { start: number; end: number };
  avgFawnScore: number;
  fawnTriggers: number;
  fortressActivations: number;
  messageVolume: number;
  maskingCost: number;
  trend: "improving" | "stable" | "declining";
  checkInRequired: boolean;
}

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function computeMaskingCost(
  fawnScores: { adjusted: number; triggered: boolean }[],
  fortressCount: number,
  hrvTrend: number
): { cost: number; trend: "improving" | "stable" | "declining" } {
  const fawnWeight = fawnScores.reduce((sum, f) => sum + (f.triggered ? f.adjusted : 0), 0);
  const fortressWeight = fortressCount * 2;
  const hrvPenalty = hrvTrend < 0 ? 3 : 0;
  const cost = fawnWeight + fortressWeight + hrvPenalty;

  let trend: "improving" | "stable" | "declining" = "stable";
  if (hrvTrend > 0.05) trend = "improving";
  else if (hrvTrend < -0.05) trend = "declining";

  return { cost, trend };
}

export class ReflectiveChamber {
  constructor(private ctx: WorkflowSession, private env: Env) {}

  async run(event: WorkflowEvent): Promise<SynthesisResult> {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const telemetry = await this.ctx.wait Until(
      fetchTelemetry(this.env.DB, weekAgo)
    );

    const synthesis = await this.ctx.wait Until(
      computeSynthesis(telemetry)
    );

    await this.ctx.wait Until(
      persistSynthesis(synthesis, this.env.OPERATOR_STATE)
    );

    if (synthesis.checkInRequired && this.env.WEEKLY_CHECKIN_ENABLED === "true") {
      await this.ctx.wait Until(
        queueCheckIn(this.env.OPERATOR_STATE)
      );
    }

    return synthesis;
  }
}

async function fetchTelemetry(db: D1Database, since: number): Promise<unknown[]> {
  const stmt = db.prepare(
    "SELECT kind, payload, ts FROM telemetry WHERE ts > ? ORDER BY ts"
  );
  const result = await stmt.bind(since).all();
  return result.results ?? [];
}

async function computeSynthesis(telemetry: unknown[]): Promise<SynthesisResult> {
  const fawnScores = (telemetry as Array<{ kind: string; payload: string }>)
    .filter((r) => r.kind === "fawn_score")
    .map((r) => {
      try {
        const p = JSON.parse(r.payload);
        return { adjusted: p.adjusted ?? 0, triggered: p.triggered ?? false };
      } catch {
        return { adjusted: 0, triggered: false };
      }
    });

  const fortressCount = (telemetry as Array<{ kind: string }>).filter(
    (r) => r.kind === "fortress_activation"
  ).length;

  const messageVolume = (telemetry as Array<{ kind: string }>).filter(
    (r) => r.kind === "chat"
  ).length;

  const avgFawnScore = mean(fawnScores.map((f) => f.adjusted));
  const fawnTriggers = fawnScores.filter((f) => f.triggered).length;

  const hrvTrend = 0;
  const { cost: maskingCost, trend } = computeMaskingCost(fawnScores, fortressCount, hrvTrend);

  const threshold = parseFloat("5");
  const checkInRequired = maskingCost >= threshold;

  return {
    period: {
      start: Date.now() - 7 * 24 * 60 * 60 * 1000,
      end: Date.now(),
    },
    avgFawnScore,
    fawnTriggers,
    fortressActivations: fortressCount,
    messageVolume,
    maskingCost,
    trend,
    checkInRequired,
  };
}

async function persistSynthesis(
  synthesis: SynthesisResult,
  doNamespace: DurableObjectNamespace
): Promise<void> {
  const id = doNamespace.idFromName("will-personal");
  const stub = doNamespace.get(id);
  await stub.fetch("https://internal/synthesis", {
    method: "POST",
    body: JSON.stringify(synthesis),
  });
}

async function queueCheckIn(doNamespace: DurableObjectNamespace): Promise<void> {
  const id = doNamespace.idFromName("will-personal");
  const stub = doNamespace.get(id);
  await stub.fetch("https://internal/checkin-queue", {
    method: "POST",
    body: JSON.stringify({ scheduledFor: Date.now() + 24 * 60 * 60 * 1000 }),
  });
}

export default {
  async queue(batch: Batch<Env>, event: WorkflowEvent): Promise<void> {
    const session = batch.createSession();
    const workflow = new ReflectiveChamber(session, batch.env);
    await workflow.run(event);
  },
} satisfies ExportedHandler<Env>;