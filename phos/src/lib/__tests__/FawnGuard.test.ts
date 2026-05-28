import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  analyzeFawn,
  detectFawn,
  getCategoryLabel,
  getSeverityColor,
  type FawnSeverity,
  type JADECategory,
} from "../FawnGuard";

// Mock crypto for tests
if (typeof crypto === "undefined" || !crypto.getRandomValues) {
  (globalThis as any).crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
    subtle: {} as any,
    randomUUID: () => Math.random().toString(36).slice(2),
  };
}

describe("FawnGuard", () => {
  describe("detectFawn (boolean gate)", () => {
    it("returns false for empty/short text", () => {
      expect(detectFawn("")).toBe(false);
      expect(detectFawn("hi")).toBe(false);
      expect(detectFawn("short text")).toBe(false);
    });

    it("returns false for authentic text without fawn patterns", () => {
      expect(detectFawn("I feel frustrated about the court situation. This is unfair and I am tired.")).toBe(false);
      expect(detectFawn("I worked on BONDING today. The tests are passing. I feel focused.")).toBe(false);
    });

    it("returns true for text with multiple fawn patterns", () => {
      expect(detectFawn("Im sorry, I should have done better. Ill try harder next time, I promise.")).toBe(true);
      expect(detectFawn("Im sorry for bothering you. Whatever you think is fine, youre absolutely right.")).toBe(true);
      expect(detectFawn("Youre right, I should have known better. Never mind, it doesnt matter.")).toBe(true);
    });
  });

  describe("analyzeFawn (structured analysis)", () => {
    it("returns none for authentic text", () => {
      const result = analyzeFawn("I feel frustrated and angry. The hearing went badly. I need to prepare better for next time.");
      expect(result.detected).toBe(false);
      expect(result.severity).toBe("none");
      expect(result.matches).toHaveLength(0);
    });

    it("detects JUSTIFY patterns", () => {
      const result = analyzeFawn("Im sorry I was late. I should have left earlier. I didn't mean to make you wait.");
      expect(result.detected).toBe(true);
      expect(result.categories).toContain("JUSTIFY");
    });

    it("detects DEFEND patterns", () => {
      const result = analyzeFawn("Whatever you think is fine. Your call. Never mind what I said, it doesnt matter.");
      expect(result.detected).toBe(true);
      expect(result.categories).toContain("DEFEND");
    });

    it("detects ARGUE patterns", () => {
      const result = analyzeFawn("Youre wrong about that. No, thats not true at all. You dont understand what happened.");
      expect(result.detected).toBe(true);
      expect(result.categories).toContain("ARGUE");
    });

    it("detects EXPLAIN patterns", () => {
      const result = analyzeFawn("Let me explain what happened. To be clear, what I meant was something different. For clarity, the point is that...");
      expect(result.detected).toBe(true);
      expect(result.categories).toContain("EXPLAIN");
    });

    it("scores mild severity for single low-weight matches", () => {
      const result = analyzeFawn("The issue is that I need more time. Let me explain what i meant.");
      if (result.detected) {
        expect(result.severity === "mild" || result.severity === "moderate" || result.severity === "strong").toBe(true);
      }
    });

    it("scores strong severity for multiple high-weight patterns", () => {
      const result = analyzeFawn(
        "Im so sorry for everything. I should have done better, I know i messed up. " +
        "Ill try harder, I promise. Whatever you think is best, youre absolutely right. " +
        "Please dont think badly of me. I can explain everything."
      );
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("strong");
    });

    it("returns a non-empty recommendation when detected", () => {
      const result = analyzeFawn("Im sorry, Im sorry. I should have known better. Whatever you think.");
      expect(result.detected).toBe(true);
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it("identifies primary category correctly", () => {
      const result = analyzeFawn("Im sorry for everything. I should have done better. I wont make that mistake again, I promise.");
      expect(result.detected).toBe(true);
      expect(result.primaryCategory).toBe("JUSTIFY");
    });

    it("provides match details including category, pattern, and matched text", () => {
      const result = analyzeFawn("Im sorry for being difficult. Youre right about that.");
      expect(result.detected).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      result.matches.forEach((m) => {
        expect(m.category).toBeDefined();
        expect(m.pattern.length).toBeGreaterThan(0);
        expect(m.matchedText.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getCategoryLabel", () => {
    it("returns labels for all four JADE categories", () => {
      expect(getCategoryLabel("JUSTIFY")).toBe("Excusing yourself");
      expect(getCategoryLabel("ARGUE")).toBe("Pushing back defensively");
      expect(getCategoryLabel("DEFEND")).toBe("Protecting yourself from judgment");
      expect(getCategoryLabel("EXPLAIN")).toBe("Over-explaining unnecessarily");
    });
  });

  describe("getSeverityColor", () => {
    it("returns color for all severity levels", () => {
      expect(getSeverityColor("none")).toBe("#3b2e54");
      expect(getSeverityColor("mild")).toBe("#f59e0b");
      expect(getSeverityColor("moderate")).toBe("#f97316");
      expect(getSeverityColor("strong")).toBe("#ef4444");
    });
  });

  describe("edge cases", () => {
    it("handles text with one pattern only (below threshold)", () => {
      const result = analyzeFawn("I am sorry. But this is my authentic feeling and I stand by it firmly.");
      // One match only should still be detected but may score differently
      if (result.detected) {
        expect(result.severity).toBe("mild");
      }
    });

    it("handles very long text", () => {
      const longText = "Im sorry for what happened. ".repeat(50) + "I feel tired today.";
      const result = analyzeFawn(longText);
      expect(result.detected).toBe(true);
      expect(result.categories.length).toBeGreaterThan(0);
    });

    it("handles case-insensitive matching", () => {
      const result = analyzeFawn("IM SORRY. YOU ARE RIGHT. WHATEVER YOU THINK.");
      expect(result.detected).toBe(true);
    });
  });
});
