import { describe, it, expect } from "vitest";
import { IntentDriftEngine } from "../../src/services/intent-drift-engine.js";
import type { DriftSnapshot } from "../../src/types.js";

describe("IntentDriftEngine", () => {
  const engine = new IntentDriftEngine();

  const constitutionSample = `
# Project Constitution

## Article 1 — Security
### Authentication Required
All endpoints must require authentication.

### Input Validation
System validates all user inputs.

## Article 2 — Performance
### Response Time
System responds within 200ms.
  `;

  describe("extractPrinciples()", () => {
    it("extracts H3 headings under Article sections", () => {
      const principles = engine.extractPrinciples(constitutionSample);
      expect(principles).toHaveLength(3);
      expect(principles[0]?.heading).toBe("Authentication Required");
      expect(principles[1]?.heading).toBe("Input Validation");
      expect(principles[2]?.heading).toBe("Response Time");
    });

    it("assigns sequential IDs", () => {
      const principles = engine.extractPrinciples(constitutionSample);
      expect(principles[0]?.id).toBe("P-001");
      expect(principles[2]?.id).toBe("P-003");
    });

    it("returns empty array when no Article sections", () => {
      expect(engine.extractPrinciples("# No articles here\n### Some heading")).toHaveLength(0);
    });

    it("extracts keywords from headings", () => {
      const principles = engine.extractPrinciples(constitutionSample);
      expect(principles[0]?.keywords.length).toBeGreaterThan(0);
    });
  });

  describe("computeCoverage()", () => {
    const spec = "# Spec\nAuthentication validates user credentials.\nInput validation checks all inputs from users.";
    const tasks = "- Implement authentication module\n- Add input validation service\n- Response time optimization";

    it("marks principles covered when keywords appear in spec", () => {
      const principles = engine.extractPrinciples(constitutionSample);
      const report = engine.computeCoverage(principles, spec, tasks);
      expect(report.total_principles).toBe(3);
    });

    it("returns drift report with required fields", () => {
      const principles = engine.extractPrinciples(constitutionSample);
      const report = engine.computeCoverage(principles, spec, tasks);
      expect(typeof report.intent_drift_score).toBe("number");
      expect(["aligned", "minor_drift", "significant_drift"]).toContain(report.intent_drift_label);
      expect(Array.isArray(report.orphaned_principles)).toBe(true);
      expect(Array.isArray(report.unimplemented_principles)).toBe(true);
    });

    it("all orphaned when spec is empty", () => {
      const principles = engine.extractPrinciples(constitutionSample);
      const report = engine.computeCoverage(principles, "", "");
      expect(report.orphaned_principles).toHaveLength(3);
    });
  });

  describe("computeScore()", () => {
    it("returns 0 when no principles", () => {
      expect(engine.computeScore({ orphaned_count: 0, total_principles: 0 })).toBe(0);
    });
    it("returns 100 when all principles orphaned", () => {
      expect(engine.computeScore({ orphaned_count: 5, total_principles: 5 })).toBe(100);
    });
    it("50% score when half orphaned", () => {
      expect(engine.computeScore({ orphaned_count: 3, total_principles: 6 })).toBe(50);
    });
  });

  describe("computeTrend()", () => {
    it("returns stable when fewer than 3 snapshots", () => {
      const history: DriftSnapshot[] = [{ timestamp: "t", score: 50, orphaned_count: 2 }];
      expect(engine.computeTrend(history)).toBe("stable");
    });

    it("returns improving when scores decrease", () => {
      const history: DriftSnapshot[] = [
        { timestamp: "t1", score: 80, orphaned_count: 4 },
        { timestamp: "t2", score: 60, orphaned_count: 3 },
        { timestamp: "t3", score: 40, orphaned_count: 2 },
      ];
      expect(engine.computeTrend(history)).toBe("improving");
    });

    it("returns worsening when scores increase", () => {
      const history: DriftSnapshot[] = [
        { timestamp: "t1", score: 20, orphaned_count: 1 },
        { timestamp: "t2", score: 40, orphaned_count: 2 },
        { timestamp: "t3", score: 60, orphaned_count: 3 },
      ];
      expect(engine.computeTrend(history)).toBe("worsening");
    });

    it("returns stable when scores are mixed", () => {
      const history: DriftSnapshot[] = [
        { timestamp: "t1", score: 40, orphaned_count: 2 },
        { timestamp: "t2", score: 30, orphaned_count: 1 },
        { timestamp: "t3", score: 50, orphaned_count: 2 },
      ];
      expect(engine.computeTrend(history)).toBe("stable");
    });
  });
});
