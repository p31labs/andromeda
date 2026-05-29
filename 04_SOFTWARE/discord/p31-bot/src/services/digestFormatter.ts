import { EmbedBuilder } from "discord.js";
import { defaultRetryableFetch } from "./retryUtility";
import * as spoonLedger from "./spoonLedger";

const FERS_DEADLINE = new Date("2026-09-30T23:59:59-04:00");

interface FersDocument {
  id: string;
  label: string;
  complete: boolean;
  blocking: boolean;
}

const FERS_DOCUMENTS: FersDocument[] = [
  { id: "sf3112a", label: "SF-3112A (Applicant Statement)", complete: true, blocking: true },
  { id: "sf3112b", label: "SF-3112B (Supervisor Statement)", complete: true, blocking: true },
  { id: "sf3112c", label: "SF-3112C (Physician Statement)", complete: true, blocking: true },
  { id: "sf3112d", label: "SF-3112D (Agency Info)", complete: false, blocking: true },
  { id: "sf3112e", label: "SF-3112E (Agency Disability Data)", complete: false, blocking: true },
  { id: "sf3107", label: "SF-3107 (Disability Retirement App)", complete: false, blocking: true },
];

interface SystemEndpoint {
  name: string;
  url: string;
}

const SYSTEM_ENDPOINTS: SystemEndpoint[] = [
  { name: "Command Center", url: "https://command-center.trimtab-signal.workers.dev" },
  { name: "bonding.p31ca.org", url: "https://bonding.p31ca.org" },
  { name: "phosphorus31.org", url: "https://phosphorus31.org" },
  { name: "p31ca.org", url: "https://p31ca.org" },
];

interface SystemHealthResult {
  name: string;
  online: boolean;
  latency?: number;
}

function daysUntilFers(): number {
  const now = new Date();
  const diff = FERS_DEADLINE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function fersCompletion(): { percent: number; nextBlocking: string } {
  const total = FERS_DOCUMENTS.length;
  const done = FERS_DOCUMENTS.filter((d) => d.complete).length;
  const next = FERS_DOCUMENTS.find((d) => d.blocking && !d.complete);
  return {
    percent: Math.round((done / total) * 100),
    nextBlocking: next ? next.label : "All blocking docs complete",
  };
}

async function checkSystemHealth(): Promise<SystemHealthResult[]> {
  const results = await Promise.allSettled(
    SYSTEM_ENDPOINTS.map(async (ep) => {
      const start = Date.now();
      try {
        const resp = await defaultRetryableFetch.fetchWithRetry(
          ep.url,
          { method: "HEAD", signal: AbortSignal.timeout(5000) },
          ep.name
        );
        return {
          name: ep.name,
          online: resp.ok,
          latency: Date.now() - start,
        };
      } catch {
        return { name: ep.name, online: false };
      }
    })
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: SYSTEM_ENDPOINTS[i].name, online: false }
  );
}

export interface DigestData {
  date: string;
  spoonsEarned: number;
  fersDaysRemaining: number;
  fersCompletionPercent: number;
  fersNextAction: string;
  treasuryBalance: string;
  systemHealth: SystemHealthResult[];
  greenCount: number;
  totalSystemCount: number;
  needsAttention: string[];
}

export async function gatherDigestData(): Promise<DigestData> {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });

  const spoonEntry = spoonLedger.getEntry("will");
  const spoonsEarned = spoonEntry?.balance ?? 0;

  const fersDays = daysUntilFers();
  const fers = fersCompletion();

  const health = await checkSystemHealth();
  const greenCount = health.filter((h) => h.online).length;
  const offline = health.filter((h) => !h.online).map((h) => h.name);

  const needsAttention: string[] = [];
  if (fersDays <= 30) needsAttention.push(`FERS deadline (${fersDays} days)`);
  if (fersDays <= 0) needsAttention.push("FERS DEADLINE PASSED");
  for (const sys of offline) {
    needsAttention.push(`${sys} offline`);
  }

  return {
    date: dateStr,
    spoonsEarned,
    fersDaysRemaining: fersDays,
    fersCompletionPercent: fers.percent,
    fersNextAction: fers.nextBlocking,
    treasuryBalance: "TBD",
    systemHealth: health,
    greenCount,
    totalSystemCount: health.length,
    needsAttention,
  };
}

export function buildDigestEmbed(data: DigestData): EmbedBuilder {
  const overallColor = data.needsAttention.length === 0
    ? 0x00ff88
    : data.needsAttention.some((a) => a.includes("PASSED") || a.includes("offline"))
      ? 0xef4444
      : 0xf59e0b;

  const embed = new EmbedBuilder()
    .setTitle(`\u{1F305} P31 Morning Digest \u2014 ${data.date}`)
    .setColor(overallColor)
    .setTimestamp();

  embed.addFields({
    name: "\u26a1 Spoons",
    value: `${data.spoonsEarned}/200`,
    inline: true,
  });

  embed.addFields({
    name: "\u{1F48A} Next Med",
    value: "08:00 \u2014 Calcium + D3",
    inline: true,
  });

  embed.addFields({
    name: "\u{1F4C5} Calendar",
    value: "No upcoming events",
    inline: true,
  });

  const fersEmoji = data.fersDaysRemaining > 60 ? "\u{1F7E2}" : data.fersDaysRemaining > 30 ? "\u{1F7E1}" : "\u{1F534}";
  embed.addFields({
    name: `\u23F0 FERS Deadline`,
    value: `${fersEmoji} ${data.fersDaysRemaining} days \u2014 ${data.fersNextAction}`,
    inline: false,
  });

  embed.addFields({
    name: "\u{1F3E6} Treasury",
    value: `$${data.treasuryBalance}`,
    inline: true,
  });

  embed.addFields({
    name: "\u{1F4CA} FERS Completion",
    value: `${data.fersCompletionPercent}%`,
    inline: true,
  });

  embed.addFields({
    name: "\U0001f51f Streak",
    value: "Not tracked",
    inline: true,
  });

  const healthEmoji = data.greenCount === data.totalSystemCount
    ? "\u{1F7E2}"
    : data.greenCount > data.totalSystemCount / 2
      ? "\u{1F7E1}"
      : "\u{1F534}";
  embed.addFields({
    name: `${healthEmoji} Systems`,
    value: `${data.greenCount}/${data.totalSystemCount} green`,
    inline: false,
  });

  if (data.needsAttention.length > 0) {
    embed.addFields({
      name: "\u{1F534} Needs Attention",
      value: data.needsAttention.slice(0, 6).map((a) => `\u2022 ${a}`).join("\n") || "None",
      inline: false,
    });
  }

  embed.setFooter({ text: "P31 Oracle \u2022 Cognitive Accessibility Infrastructure \u26b2" });

  return embed;
}

export async function generateDigestMessage(): Promise<{ embeds: [EmbedBuilder] }> {
  const data = await gatherDigestData();
  const embed = buildDigestEmbed(data);
  return { embeds: [embed] };
}
