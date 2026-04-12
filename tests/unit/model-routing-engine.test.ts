import { describe, it, expect } from "vitest";
import { ModelRoutingEngine } from "../../src/services/model-routing-engine.js";

describe("ModelRoutingEngine", () => {
  const engine = new ModelRoutingEngine();

  // arXiv ID format: arXiv:NNNN.NNNNN
  const ARXIV_RE = /^arXiv:\d{4}\.\d{4,5}$/;

  describe("getHint() — phase routing table", () => {
    const phases = ["init", "discover", "specify", "clarify", "design", "tasks", "analyze", "implement", "verify", "release"];

    for (const phase of phases) {
      it(`returns a valid hint for phase: ${phase}`, () => {
        const hint = engine.getHint(phase);
        expect(["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5", "gpt-4-5"]).toContain(hint.model);
        expect(["ask", "plan", "agent"]).toContain(hint.mode);
        expect(typeof hint.thinking).toBe("boolean");
        expect(hint.rationale.length).toBeGreaterThan(0);
        expect(hint.rationale.length).toBeLessThanOrEqual(150);
        expect(hint.evidence_id).toMatch(ARXIV_RE);
        expect(["3x", "1x", "0.33x"]).toContain(hint.premium_multiplier);
      });
    }

    it("init uses Haiku (cheapest, no ambiguity)", () => {
      expect(engine.getHint("init").model).toBe("claude-haiku-4-5");
      expect(engine.getHint("init").premium_multiplier).toBe("0.33x");
    });

    it("specify uses Opus + extended thinking (highest ambiguity)", () => {
      const hint = engine.getHint("specify");
      expect(hint.model).toBe("claude-opus-4-6");
      expect(hint.thinking).toBe(true);
    });

    it("clarify uses Opus + extended thinking", () => {
      const hint = engine.getHint("clarify");
      expect(hint.model).toBe("claude-opus-4-6");
      expect(hint.thinking).toBe(true);
    });

    it("design uses Opus + plan mode + extended thinking", () => {
      const hint = engine.getHint("design");
      expect(hint.model).toBe("claude-opus-4-6");
      expect(hint.mode).toBe("plan");
      expect(hint.thinking).toBe(true);
    });

    it("release uses Haiku (structured artifacts, no reasoning needed)", () => {
      expect(engine.getHint("release").model).toBe("claude-haiku-4-5");
    });
  });

  describe("implement never returns thinking: true", () => {
    it("base implement hint has thinking: false", () => {
      expect(engine.getHint("implement").thinking).toBe(false);
    });

    it("implement with large file_count does NOT enable thinking", () => {
      const hint = engine.getHint("implement", { file_count: 50 });
      expect(hint.thinking).toBe(false);
    });

    it("implement with any signals still has thinking: false", () => {
      expect(engine.getHint("implement", { spec_clarity: "ambiguous", has_feedback_loop: true }).thinking).toBe(false);
    });
  });

  describe("complexity override", () => {
    it("implement with file_count > 10 escalates to Opus", () => {
      const hint = engine.getHint("implement", { file_count: 11 });
      expect(hint.model).toBe("claude-opus-4-6");
      expect(hint.premium_multiplier).toBe("3x");
    });

    it("design with file_count > 10 escalates to Opus", () => {
      const hint = engine.getHint("design", { file_count: 15 });
      expect(hint.model).toBe("claude-opus-4-6");
    });

    it("implement with file_count <= 10 stays Sonnet", () => {
      expect(engine.getHint("implement", { file_count: 10 }).model).toBe("claude-sonnet-4-6");
    });

    it("specify with file_count > 10 is not overridden (already Opus)", () => {
      const hint = engine.getHint("specify", { file_count: 20 });
      expect(hint.model).toBe("claude-opus-4-6");
      // rationale unchanged (no complexity override for non-design/implement)
      expect(hint.rationale).not.toContain("Multi-file semantic complexity");
    });
  });

  describe("unknown phase fallback", () => {
    it("returns implement hint for unknown phase", () => {
      const hint = engine.getHint("nonexistent_phase");
      expect(hint.thinking).toBe(false);
      expect(hint.model).toBe("claude-sonnet-4-6");
    });
  });

  describe("getTable()", () => {
    it("returns all 10 phases", () => {
      expect(engine.getTable()).toHaveLength(10);
    });

    it("each entry has a phase field", () => {
      for (const entry of engine.getTable()) {
        expect(typeof entry.phase).toBe("string");
        expect(entry.phase.length).toBeGreaterThan(0);
      }
    });

    it("every evidence_id matches arXiv format", () => {
      for (const entry of engine.getTable()) {
        expect(entry.evidence_id).toMatch(ARXIV_RE);
      }
    });
  });

  describe("calculateCostSavings()", () => {
    it("returns savings_percent > 0 for any team size", () => {
      expect(engine.calculateCostSavings(1).savings_percent).toBeGreaterThan(0);
      expect(engine.calculateCostSavings(10).savings_percent).toBeGreaterThan(0);
      expect(engine.calculateCostSavings(100).savings_percent).toBeGreaterThan(0);
    });

    it("correct_routing_units < opus_only_units", () => {
      const result = engine.calculateCostSavings(10);
      expect(result.correct_routing_units).toBeLessThan(result.opus_only_units);
    });

    it("team_size is reflected in units (scales linearly)", () => {
      const r1 = engine.calculateCostSavings(1, 10);
      const r10 = engine.calculateCostSavings(10, 10);
      expect(r10.opus_only_units).toBe(r1.opus_only_units * 10);
    });

    it("savings_label contains the savings percentage", () => {
      const result = engine.calculateCostSavings(10);
      expect(result.savings_label).toContain(`${result.savings_percent}%`);
    });
  });
});
