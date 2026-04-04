import { BaseAgent, type AgentEnv } from "./base-agent";
import { sendEmail, formatDeadlineAlert } from "../notify/index";

interface GrantRecord {
  id: string;
  title: string;
  funder: string;
  amount: number;
  deadline: string;
  status: "researching" | "assembling" | "submitted" | "awarded" | "rejected";
  requirements: string[];
  notes: string;
  alertDays: number[];
}

export class GrantAgentDO extends BaseAgent {
  protected async handleInit(request: Request): Promise<Response> {
    const body = await request.json<Partial<GrantRecord>>();
    const id = this.generateId();

    const grant: GrantRecord = {
      id,
      title: body.title ?? "Untitled Grant",
      funder: body.funder ?? "",
      amount: body.amount ?? 0,
      deadline: body.deadline ?? new Date().toISOString(),
      status: body.status ?? "researching",
      requirements: body.requirements ?? [],
      notes: body.notes ?? "",
      alertDays: body.alertDays ?? [14, 7, 3, 1],
    };

    await this.env.DB.prepare(
      `INSERT INTO deadlines (id, title, description, due_date, category, priority, status, alert_days, metadata)
       VALUES (?, ?, ?, ?, 'grant', ?, ?, ?, ?)`,
    )
      .bind(
        grant.id,
        grant.title,
        `${grant.funder} — $${grant.amount.toLocaleString()}`,
        grant.deadline,
        grant.amount >= 100000
          ? "critical"
          : grant.amount >= 25000
            ? "high"
            : "medium",
        grant.status === "awarded" || grant.status === "rejected"
          ? "completed"
          : "pending",
        JSON.stringify(grant.alertDays),
        JSON.stringify({
          funder: grant.funder,
          amount: grant.amount,
          status: grant.status,
          requirements: grant.requirements,
          notes: grant.notes,
        }),
      )
      .run();

    // Schedule alerts
    for (const days of grant.alertDays) {
      const alertDate = new Date(grant.deadline);
      alertDate.setDate(alertDate.getDate() - days);
      if (alertDate > new Date()) {
        await this.env.DB.prepare(
          `INSERT INTO alerts (id, deadline_id, type, scheduled_for, status, message)
           VALUES (?, ?, 'email', ?, 'scheduled', ?)`,
        )
          .bind(
            this.generateId(),
            grant.id,
            alertDate.toISOString(),
            `Grant deadline in ${days} day(s): ${grant.title} (${grant.funder})`,
          )
          .run();
      }
    }

    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  protected async handleRun(_request: Request): Promise<Response> {
    await this.setRunning();

    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // 1. Mark overdue grants
      const overdue = await this.env.DB.prepare(
        `UPDATE deadlines SET status = 'overdue', updated_at = datetime('now')
         WHERE category = 'grant' AND status = 'pending' AND due_date < ?`,
      )
        .bind(today)
        .run();

      // 2. Fire scheduled alerts
      const alerts = await this.env.DB.prepare(
        `SELECT a.*, d.title, d.due_date, d.priority, d.metadata
         FROM alerts a
         JOIN deadlines d ON a.deadline_id = d.id
         WHERE d.category = 'grant' AND a.status = 'scheduled' AND a.scheduled_for <= ?`,
      )
        .bind(now.toISOString())
        .all<Record<string, string>>();

      let sent = 0;
      let failed = 0;

      for (const alert of alerts.results ?? []) {
        const daysRemaining = Math.ceil(
          (new Date(alert.due_date).getTime() - now.getTime()) / 86400000,
        );

        const payload = formatDeadlineAlert(
          alert.title,
          alert.due_date,
          Math.max(0, daysRemaining),
          "GRANT",
        );
        payload.to = this.env.ALERT_EMAIL;

        const ok = await sendEmail(this.env, payload);
        if (ok) {
          await this.env.DB.prepare(
            `UPDATE alerts SET status = 'sent', sent_at = datetime('now') WHERE id = ?`,
          )
            .bind(alert.id)
            .run();
          sent++;
        } else {
          await this.env.DB.prepare(
            `UPDATE alerts SET status = 'failed' WHERE id = ?`,
          )
            .bind(alert.id)
            .run();
          failed++;
        }
      }

      // 3. Pipeline summary
      const pipeline = await this.env.DB.prepare(
        `SELECT id, title, due_date, priority, status, metadata
         FROM deadlines
         WHERE category = 'grant' AND status IN ('pending', 'in_progress')
         ORDER BY due_date ASC`,
      ).all<Record<string, string>>();

      // 4. Check for grants needing assembly (status = researching, deadline within 21 days)
      const needsAssembly = await this.env.DB.prepare(
        `SELECT id, title, due_date, metadata
         FROM deadlines
         WHERE category = 'grant' AND status = 'pending'
         AND due_date <= date('now', '+21 days')
         AND due_date >= date('now')`,
      ).all<Record<string, string>>();

      // Alert if grants are approaching that haven't been assembled
      if ((needsAssembly.results?.length ?? 0) > 0) {
        const assemblyList = (needsAssembly.results ?? [])
          .map((g) => `  • ${g.title} — due ${g.due_date}`)
          .join("\n");

        const payload = {
          to: this.env.ALERT_EMAIL,
          subject: `⚠️ GRANT ASSEMBLY NEEDED: ${needsAssembly.results?.length} grants approaching`,
          body: [
            `P31 CORTEX — GRANT PIPELINE ALERT`,
            `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
            ``,
            `The following grants have deadlines within 21 days:`,
            ``,
            assemblyList,
            ``,
            `Review artifact availability and begin assembly.`,
            `Existing artifacts: monograph, BONDING metrics, verification reports.`,
            ``,
            `It's okay to be a little wonky. 🔺`,
          ].join("\n"),
          priority: "high" as const,
        };

        await sendEmail(this.env, payload);
      }

      await this.setIdle();

      return new Response(
        JSON.stringify({
          ok: true,
          overdue: overdue.meta?.changes ?? 0,
          alertsSent: sent,
          alertsFailed: failed,
          pipeline: pipeline.results,
          needsAssembly: needsAssembly.results,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await this.setError(msg);
      throw err;
    }
  }
}
