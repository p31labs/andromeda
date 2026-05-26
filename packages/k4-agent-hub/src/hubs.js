/**
 * Four hub Durable Object subclasses.
 *
 * Each subclass advertises its hubId and provides:
 *   - edgeBrief(fromHub, body) — pithy in-K₄ reply when a sibling pings
 *   - runSkill(skill, input)   — defaults to dispatcher; FORGE/SCHOLAR/COUNSEL
 *                                examples enrich a primary call with a
 *                                cross-edge brief from a sibling, demonstrating
 *                                the K₄ adjacency in action.
 */

import { HubBase } from "./hub-base.js";
import { dispatch } from "./dispatcher.js";

export class ForgeHub extends HubBase {
  get hubId() { return "forge"; }

  edgeBrief(fromHub, body) {
    const ask = body?.ask ?? "no ask";
    return {
      hub: "forge",
      verb: "make",
      to: fromHub,
      reply: `Forge can scaffold/patch for "${ask}". Provide repo + skill (ts-worker | esp-firmware | one-liner).`,
    };
  }

  async runSkill(skill, input) {
    if (skill.id === "ts-worker" && input?.askScholar) {
      const sibling = await this.edgeCall("scholar", { ask: input.askScholar });
      const main = await dispatch({ env: this.env, hubId: this.hubId, skill, input });
      return { ...main, edgeBrief: sibling };
    }
    return await dispatch({ env: this.env, hubId: this.hubId, skill, input });
  }
}

export class CounselHub extends HubBase {
  get hubId() { return "counsel"; }

  edgeBrief(fromHub, body) {
    const ask = body?.ask ?? "no ask";
    return {
      hub: "counsel",
      verb: "protect",
      to: fromHub,
      reply: `Counsel can flag exposure for "${ask}". No fabrication — needs jurisdiction + factual record.`,
    };
  }

  async runSkill(skill, input) {
    if (skill.id === "voltage-triage" && input?.fileWith === "scribe") {
      const main = await dispatch({ env: this.env, hubId: this.hubId, skill, input });
      const filed = await this.edgeCall("scribe", { ask: "file triage outcome", outcome: main });
      return { ...main, filedAt: filed };
    }
    return await dispatch({ env: this.env, hubId: this.hubId, skill, input });
  }
}

export class ScholarHub extends HubBase {
  get hubId() { return "scholar"; }

  edgeBrief(fromHub, body) {
    const ask = body?.ask ?? "no ask";
    return {
      hub: "scholar",
      verb: "understand",
      to: fromHub,
      reply: `Scholar can synthesize for "${ask}" against the 22-paper canon and any operator-supplied PDFs.`,
    };
  }

  async runSkill(skill, input) {
    if (skill.id === "grants-synthesis" && input?.publishVia === "scribe") {
      const main = await dispatch({ env: this.env, hubId: this.hubId, skill, input });
      const published = await this.edgeCall("scribe", { ask: "publish synthesis", synthesis: main });
      return { ...main, publishedAt: published };
    }
    return await dispatch({ env: this.env, hubId: this.hubId, skill, input });
  }
}

export class ScribeHub extends HubBase {
  get hubId() { return "scribe"; }

  edgeBrief(fromHub, body) {
    const ask = body?.ask ?? "no ask";
    return {
      hub: "scribe",
      verb: "remember",
      to: fromHub,
      reply: `Scribe will record "${ask}". Provide a stable id + structured payload to avoid duplicate rows.`,
    };
  }
}
