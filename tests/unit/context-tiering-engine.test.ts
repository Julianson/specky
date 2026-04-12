import { describe, it, expect } from "vitest";
import { ContextTieringEngine } from "../../src/services/context-tiering-engine.js";

describe("ContextTieringEngine", () => {
  const engine = new ContextTieringEngine();

  describe("getTier() — tier assignment table", () => {
    it("CONSTITUTION.md is Hot", () => expect(engine.getTier("CONSTITUTION.md")).toBe("hot"));
    it("SPECIFICATION.md is Domain", () => expect(engine.getTier("SPECIFICATION.md")).toBe("domain"));
    it("DESIGN.md is Domain", () => expect(engine.getTier("DESIGN.md")).toBe("domain"));
    it("TASKS.md is Domain", () => expect(engine.getTier("TASKS.md")).toBe("domain"));
    it("ANALYSIS.md is Cold", () => expect(engine.getTier("ANALYSIS.md")).toBe("cold"));
    it("CHECKLIST.md is Cold", () => expect(engine.getTier("CHECKLIST.md")).toBe("cold"));
    it("VERIFICATION.md is Cold", () => expect(engine.getTier("VERIFICATION.md")).toBe("cold"));
    it("RESEARCH.md is Cold", () => expect(engine.getTier("RESEARCH.md")).toBe("cold"));
    it("COMPLIANCE.md is Cold", () => expect(engine.getTier("COMPLIANCE.md")).toBe("cold"));
    it("CROSS_ANALYSIS.md is Cold", () => expect(engine.getTier("CROSS_ANALYSIS.md")).toBe("cold"));

    it("unknown file defaults to Cold", () => expect(engine.getTier("UNKNOWN.md")).toBe("cold"));
  });

  describe("estimateTokens()", () => {
    it("empty string returns 0", () => expect(engine.estimateTokens("")).toBe(0));

    it("4-character string returns 1 token", () => expect(engine.estimateTokens("abcd")).toBe(1));

    it("large content: uses ceil(length / 4)", () => {
      const content = "x".repeat(4000);
      expect(engine.estimateTokens(content)).toBe(1000);
    });

    it("non-multiple: rounds up", () => {
      // 5 chars → ceil(5/4) = 2
      expect(engine.estimateTokens("abcde")).toBe(2);
    });

    it("realistic spec content gives reasonable estimate", () => {
      const spec = "# SPECIFICATION\n".repeat(200); // ~3400 chars
      const tokens = engine.estimateTokens(spec);
      expect(tokens).toBeGreaterThan(500);
      expect(tokens).toBeLessThan(2000);
    });
  });

  describe("buildContextLoadSummary()", () => {
    it("hot_loaded is always true", () => {
      const summary = engine.buildContextLoadSummary({
        domainFiles: [], coldFiles: [], domainContent: "", coldContent: "",
      });
      expect(summary.hot_loaded).toBe(true);
    });

    it("includes domain_files and cold_files lists", () => {
      const summary = engine.buildContextLoadSummary({
        domainFiles: ["SPECIFICATION.md", "DESIGN.md"],
        coldFiles: ["ANALYSIS.md"],
        domainContent: "x".repeat(1000),
        coldContent: "y".repeat(500),
      });
      expect(summary.domain_files).toEqual(["SPECIFICATION.md", "DESIGN.md"]);
      expect(summary.cold_files).toEqual(["ANALYSIS.md"]);
    });

    it("estimated_tokens > 0 when content is provided", () => {
      const summary = engine.buildContextLoadSummary({
        domainFiles: ["SPECIFICATION.md"],
        coldFiles: [],
        domainContent: "x".repeat(400),
        coldContent: "",
      });
      expect(summary.estimated_tokens).toBeGreaterThan(0);
    });

    it("vs_universal_tokens > estimated_tokens (tiered is cheaper)", () => {
      const summary = engine.buildContextLoadSummary({
        domainFiles: ["SPECIFICATION.md"],
        coldFiles: [],
        domainContent: "x".repeat(400),
        coldContent: "",
      });
      expect(summary.vs_universal_tokens).toBeGreaterThan(summary.estimated_tokens);
    });

    it("savings_percent is non-negative", () => {
      const summary = engine.buildContextLoadSummary({
        domainFiles: [], coldFiles: [], domainContent: "", coldContent: "",
      });
      expect(summary.savings_percent).toBeGreaterThanOrEqual(0);
    });
  });

  describe("buildHotOnlySummary()", () => {
    it("returns empty domain_files and cold_files", () => {
      const summary = engine.buildHotOnlySummary();
      expect(summary.domain_files).toEqual([]);
      expect(summary.cold_files).toEqual([]);
      expect(summary.hot_loaded).toBe(true);
    });
  });

  describe("getTierTable()", () => {
    it("returns exactly 10 entries", () => {
      expect(engine.getTierTable()).toHaveLength(10);
    });

    it("each entry has filename and tier", () => {
      for (const entry of engine.getTierTable()) {
        expect(typeof entry.filename).toBe("string");
        expect(["hot", "domain", "cold"]).toContain(entry.tier);
      }
    });

    it("exactly 1 Hot, 3 Domain, 6 Cold", () => {
      const table = engine.getTierTable();
      expect(table.filter((e) => e.tier === "hot")).toHaveLength(1);
      expect(table.filter((e) => e.tier === "domain")).toHaveLength(3);
      expect(table.filter((e) => e.tier === "cold")).toHaveLength(6);
    });
  });
});
