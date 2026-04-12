import { describe, it, expect } from "vitest";
import { CognitiveDebtEngine } from "../../src/services/cognitive-debt-engine.js";
import type { GateHistoryEntry } from "../../src/types.js";

function makeEntry(phase: string, wasModified: boolean, reqCount?: number): GateHistoryEntry {
  return {
    phase,
    timestamp: new Date().toISOString(),
    artifact: `/spec/${phase}.md`,
    was_modified: wasModified,
    ...(reqCount !== undefined ? { req_count: reqCount } : {}),
  };
}

describe("CognitiveDebtEngine", () => {
  const engine = new CognitiveDebtEngine();

  describe("computeMetrics() — empty history", () => {
    it("returns zeros and healthy label for empty gate history", () => {
      const result = engine.computeMetrics([]);
      expect(result.lgtm_without_modification_rate).toBe(0);
      expect(result.spec_to_implementation_delta).toBe(0);
      expect(result.cognitive_debt_score).toBe(0);
      expect(result.cognitive_debt_label).toBe("healthy");
      expect(result.total_gates).toBe(0);
      expect(result.unmodified_gates).toBe(0);
    });
  });

  describe("lgtm_without_modification_rate", () => {
    it("100% when all gates unmodified", () => {
      const history = [
        makeEntry("specify", false),
        makeEntry("design", false),
        makeEntry("tasks", false),
      ];
      expect(engine.computeMetrics(history).lgtm_without_modification_rate).toBe(100);
    });

    it("0% when all gates modified", () => {
      const history = [
        makeEntry("specify", true),
        makeEntry("design", true),
      ];
      expect(engine.computeMetrics(history).lgtm_without_modification_rate).toBe(0);
    });

    it("50% when half modified", () => {
      const history = [
        makeEntry("specify", false),
        makeEntry("design", true),
      ];
      expect(engine.computeMetrics(history).lgtm_without_modification_rate).toBe(50);
    });
  });

  describe("spec_to_implementation_delta", () => {
    it("delta 0 when spec and verify have same req count", () => {
      const history = [
        makeEntry("specify", true, 10),
        makeEntry("verify", true, 10),
      ];
      expect(engine.computeMetrics(history).spec_to_implementation_delta).toBe(0);
    });

    it("delta = abs(specify - verify)", () => {
      const history = [
        makeEntry("specify", true, 12),
        makeEntry("verify", true, 9),
      ];
      expect(engine.computeMetrics(history).spec_to_implementation_delta).toBe(3);
    });

    it("delta 0 when no specify or verify entries", () => {
      const history = [makeEntry("design", true)];
      expect(engine.computeMetrics(history).spec_to_implementation_delta).toBe(0);
    });
  });

  describe("cognitive_debt_score and label", () => {
    it("score 0 → label healthy", () => {
      const result = engine.computeMetrics([makeEntry("specify", true)]);
      expect(result.cognitive_debt_label).toBe("healthy");
    });

    it("score boundary: 30 is healthy, 31 is caution", () => {
      // Force rate: 50% unmodified (lgtm_rate=50, delta=0 → score = 50*0.6 = 30)
      const history = [makeEntry("specify", false), makeEntry("design", true)];
      const result = engine.computeMetrics(history);
      expect(result.cognitive_debt_score).toBe(30);
      expect(result.cognitive_debt_label).toBe("healthy");
    });

    it("high unmodified rate → caution or high_risk label", () => {
      const history = Array.from({ length: 8 }, (_, i) => makeEntry(`phase${i}`, false));
      const result = engine.computeMetrics(history);
      expect(["caution", "high_risk"]).toContain(result.cognitive_debt_label);
    });

    it("100% unmodified with large delta → high_risk label", () => {
      // lgtm_rate=100, delta=20 on specCount=20 → delta_normalized=100 → score=100*0.6+100*0.4=100
      const history = [
        makeEntry("specify", false, 20),
        makeEntry("verify", false, 40), // delta=20, normalized=100%
        makeEntry("design", false),
        makeEntry("tasks", false),
      ];
      const result = engine.computeMetrics(history);
      expect(result.cognitive_debt_label).toBe("high_risk");
    });
  });
});
