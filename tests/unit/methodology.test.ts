import { describe, it, expect } from "vitest";
import { MethodologyGuide } from "../../src/services/methodology.js";
import { Phase } from "../../src/constants.js";
import type { PhaseStatus } from "../../src/types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePhases(completedCount: number): Record<Phase, PhaseStatus> {
  const phases = {} as Record<Phase, PhaseStatus>;
  const order = [
    Phase.Init, Phase.Discover, Phase.Specify, Phase.Clarify,
    Phase.Design, Phase.Tasks, Phase.Analyze, Phase.Implement,
    Phase.Verify, Phase.Release,
  ];
  order.forEach((phase, i) => {
    phases[phase] = { status: i < completedCount ? "completed" : "pending" };
  });
  return phases;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MethodologyGuide", () => {
  describe("getPhaseExplanation", () => {
    it("returns explanation for Init phase with all required fields", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Init);
      expect(result.what).toBeTruthy();
      expect(result.why).toBeTruthy();
      expect(result.how).toBeTruthy();
      expect(result.anti_patterns.length).toBeGreaterThan(0);
      expect(result.best_practices.length).toBeGreaterThan(0);
      expect(result.sdd_principle).toBeTruthy();
      expect(result.how).toContain("sdd_init");
    });

    it("returns explanation for Specify phase mentioning EARS", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Specify);
      expect(result.what).toContain("EARS");
      expect(result.how).toContain("sdd_write_spec");
      expect(result.sdd_principle).toBeTruthy();
    });

    it("returns explanation for Design phase mentioning C4", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Design);
      expect(result.best_practices.some(p => p.includes("C4"))).toBe(true);
      expect(result.anti_patterns.some(p => p.toLowerCase().includes("security"))).toBe(true);
    });

    it("returns explanation for Analyze phase mentioning gate", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Analyze);
      expect(result.what).toContain("gate");
      expect(result.how).toContain("sdd_run_analysis");
    });

    it("returns explanation for Implement phase", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Implement);
      expect(result.how).toContain("sdd_implement");
      expect(result.sdd_principle).toBeTruthy();
    });

    it("returns explanation for Verify phase mentioning phantom", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Verify);
      expect(result.how).toContain("sdd_verify_tasks");
      expect(result.anti_patterns.some(p => p.toLowerCase().includes("task") || p.toLowerCase().includes("skip"))).toBe(true);
    });

    it("returns explanation for Release phase", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Release);
      expect(result.how).toContain("sdd_create_pr");
      expect(result.sdd_principle).toBeTruthy();
    });

    it("returns explanation for Clarify phase", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Clarify);
      expect(result.how).toContain("sdd_clarify");
      expect(result.why).toContain("10x");
    });

    it("returns explanation for Tasks phase", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Tasks);
      expect(result.how).toContain("sdd_write_tasks");
      expect(result.best_practices.some(p => p.includes("1-4 hours"))).toBe(true);
    });

    it("returns explanation for Discover phase", () => {
      const result = MethodologyGuide.getPhaseExplanation(Phase.Discover);
      expect(result.how).toContain("sdd_discover");
    });
  });

  describe("getProgressIndicator", () => {
    it("returns 0% when no phases completed", () => {
      const phases = makePhases(0);
      const result = MethodologyGuide.getProgressIndicator(Phase.Init, phases);
      expect(result.percent_complete).toBe(0);
      expect(result.completed_phases).toHaveLength(0);
      expect(result.remaining_phases).toHaveLength(10);
      expect(result.current_phase_name).toBe(Phase.Init);
    });

    it("returns 50% when 5 of 10 phases completed", () => {
      const phases = makePhases(5);
      const result = MethodologyGuide.getProgressIndicator(Phase.Analyze, phases);
      expect(result.percent_complete).toBe(50);
      expect(result.completed_phases).toHaveLength(5);
      expect(result.remaining_phases).toHaveLength(5);
    });

    it("returns 100% when all phases completed", () => {
      const phases = makePhases(10);
      const result = MethodologyGuide.getProgressIndicator(Phase.Release, phases);
      expect(result.percent_complete).toBe(100);
      expect(result.completed_phases).toHaveLength(10);
      expect(result.remaining_phases).toHaveLength(0);
    });

    it("returns a non-empty progress_bar string", () => {
      const phases = makePhases(3);
      const result = MethodologyGuide.getProgressIndicator(Phase.Design, phases);
      expect(result.progress_bar).toContain("[");
      expect(result.progress_bar).toContain("]");
      expect(result.progress_bar).toContain("3/10");
    });
  });

  describe("getToolExplanation", () => {
    it("returns explanation for sdd_init with all fields", () => {
      const result = MethodologyGuide.getToolExplanation("sdd_init");
      expect(result.what_it_does).toBeTruthy();
      expect(result.why_it_matters).toBeTruthy();
      expect(result.common_mistakes.length).toBeGreaterThan(0);
    });

    it("returns explanation for sdd_write_spec mentioning EARS", () => {
      const result = MethodologyGuide.getToolExplanation("sdd_write_spec");
      expect(result.what_it_does).toContain("EARS");
    });

    it("returns explanation for sdd_run_analysis mentioning gate", () => {
      const result = MethodologyGuide.getToolExplanation("sdd_run_analysis");
      expect(result.what_it_does).toContain("gate");
    });

    it("returns explanation for sdd_generate_diagram mentioning Mermaid", () => {
      const result = MethodologyGuide.getToolExplanation("sdd_generate_diagram");
      expect(result.what_it_does).toContain("Mermaid");
    });

    it("returns explanation for sdd_checkpoint mentioning snapshot", () => {
      const result = MethodologyGuide.getToolExplanation("sdd_checkpoint");
      expect(result.what_it_does).toContain("snapshot");
    });

    it("returns explanation for sdd_turnkey_spec", () => {
      const result = MethodologyGuide.getToolExplanation("sdd_turnkey_spec");
      expect(result.what_it_does).toBeTruthy();
    });

    it("returns a fallback for unknown tools", () => {
      const result = MethodologyGuide.getToolExplanation("sdd_unknown_tool_xyz");
      expect(result.what_it_does).toBeTruthy();
      expect(result.why_it_matters).toBeTruthy();
      expect(Array.isArray(result.common_mistakes)).toBe(true);
    });
  });
});
