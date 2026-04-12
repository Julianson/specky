import { describe, it, expect } from "vitest";
import { DependencyGraph } from "../../src/services/dependency-graph.js";
import { Phase } from "../../src/constants.js";

describe("DependencyGraph", () => {
  describe("getParallelGroups", () => {
    it("returns sequential-only plan for Init phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Init);
      expect(result.sequential).toContain("sdd_init");
      expect(result.parallel_groups).toHaveLength(0);
    });

    it("returns parallel groups for Specify phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Specify);
      expect(result.sequential).toContain("sdd_write_spec");
      expect(result.parallel_groups.length).toBeGreaterThan(0);
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_validate_ears");
      expect(flat).toContain("sdd_import_transcript");
    });

    it("returns parallel groups for Analyze phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Analyze);
      expect(result.sequential).toContain("sdd_run_analysis");
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_cross_analyze");
      expect(flat).toContain("sdd_compliance_check");
      expect(flat).toContain("sdd_checklist");
    });

    it("returns sequential + parallel for Design phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Design);
      expect(result.sequential).toContain("sdd_write_design");
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_generate_all_diagrams");
    });

    it("returns sequential + parallel for Implement phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Implement);
      expect(result.sequential).toContain("sdd_implement");
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_generate_iac");
    });

    it("returns parallel groups for Release phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Release);
      expect(result.sequential).toContain("sdd_create_pr");
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_generate_all_docs");
    });

    it("returns parallel groups for Verify phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Verify);
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_generate_tests");
      expect(flat).toContain("sdd_generate_pbt");
      expect(flat).toContain("sdd_verify_tasks");
    });

    it("returns parallel groups for Tasks phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Tasks);
      expect(result.sequential).toContain("sdd_write_tasks");
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_export_work_items");
    });

    it("returns parallel groups for Discover phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Discover);
      expect(result.sequential).toContain("sdd_discover");
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_scan_codebase");
    });

    it("returns parallel groups for Clarify phase", () => {
      const result = DependencyGraph.getParallelGroups(Phase.Clarify);
      expect(result.sequential).toContain("sdd_clarify");
      const flat = result.parallel_groups.flat();
      expect(flat).toContain("sdd_validate_ears");
    });
  });

  describe("getDependencies", () => {
    it("sdd_init has no requirements and enables discover tools", () => {
      const dep = DependencyGraph.getDependencies("sdd_init");
      expect(dep.requires).toHaveLength(0);
      expect(dep.enables).toContain("sdd_discover");
      expect(dep.parallel_with).toHaveLength(0);
    });

    it("sdd_discover requires sdd_init and runs parallel with sdd_scan_codebase", () => {
      const dep = DependencyGraph.getDependencies("sdd_discover");
      expect(dep.requires).toContain("sdd_init");
      expect(dep.parallel_with).toContain("sdd_scan_codebase");
    });

    it("sdd_write_spec requires sdd_discover and enables clarify and validate_ears", () => {
      const dep = DependencyGraph.getDependencies("sdd_write_spec");
      expect(dep.requires).toContain("sdd_discover");
      expect(dep.enables).toContain("sdd_clarify");
      expect(dep.enables).toContain("sdd_validate_ears");
    });

    it("sdd_run_analysis enables implement, create_branch, and generate_iac", () => {
      const dep = DependencyGraph.getDependencies("sdd_run_analysis");
      expect(dep.enables).toContain("sdd_implement");
      expect(dep.enables).toContain("sdd_create_branch");
      expect(dep.enables).toContain("sdd_generate_iac");
      expect(dep.parallel_with).toContain("sdd_cross_analyze");
    });

    it("sdd_generate_tests and sdd_generate_pbt can run in parallel", () => {
      const testsDepend = DependencyGraph.getDependencies("sdd_generate_tests");
      expect(testsDepend.parallel_with).toContain("sdd_generate_pbt");

      const pbtDepend = DependencyGraph.getDependencies("sdd_generate_pbt");
      expect(pbtDepend.parallel_with).toContain("sdd_generate_tests");
    });

    it("sdd_create_pr requires sdd_verify_tasks", () => {
      const dep = DependencyGraph.getDependencies("sdd_create_pr");
      expect(dep.requires).toContain("sdd_verify_tasks");
      expect(dep.parallel_with).toContain("sdd_export_work_items");
    });

    it("returns empty arrays for unknown tool names", () => {
      const dep = DependencyGraph.getDependencies("sdd_nonexistent_tool");
      expect(dep.requires).toHaveLength(0);
      expect(dep.enables).toHaveLength(0);
      expect(dep.parallel_with).toHaveLength(0);
    });

    it("sdd_compliance_check requires sdd_write_spec", () => {
      const dep = DependencyGraph.getDependencies("sdd_compliance_check");
      expect(dep.requires).toContain("sdd_write_spec");
      expect(dep.parallel_with).toContain("sdd_cross_analyze");
    });

    it("sdd_generate_docs parallel_with doc tools", () => {
      const dep = DependencyGraph.getDependencies("sdd_generate_docs");
      expect(dep.parallel_with).toContain("sdd_generate_api_docs");
      expect(dep.parallel_with).toContain("sdd_generate_runbook");
    });

    it("sdd_turnkey_spec has no requirements and enables design tools", () => {
      const dep = DependencyGraph.getDependencies("sdd_turnkey_spec");
      expect(dep.requires).toHaveLength(0);
      expect(dep.enables).toContain("sdd_clarify");
    });

    it("sdd_checkpoint has no requirements", () => {
      const dep = DependencyGraph.getDependencies("sdd_checkpoint");
      expect(dep.requires).toHaveLength(0);
      expect(dep.enables).toHaveLength(0);
    });
  });

  describe("getExecutionPlan", () => {
    it("returns plan for Init phase with discover as first step", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Init);
      expect(plan.phase).toBe(Phase.Init);
      expect(plan.next_steps.length).toBeGreaterThan(0);
      expect(plan.next_steps[0].tools).toContain("sdd_discover");
      expect(plan.next_steps[0].parallel).toBe(false);
    });

    it("returns plan for Discover phase with write_spec as first step", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Discover);
      expect(plan.next_steps[0].tools).toContain("sdd_write_spec");
    });

    it("returns plan for Tasks phase with parallel quality checks", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Tasks);
      const parallelStep = plan.next_steps.find(s => s.parallel);
      expect(parallelStep).toBeDefined();
      expect(parallelStep?.tools).toContain("sdd_compliance_check");
    });

    it("returns plan for Analyze phase with branch creation first", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Analyze);
      expect(plan.next_steps[0].tools).toContain("sdd_create_branch");
      expect(plan.next_steps[0].parallel).toBe(false);
    });

    it("returns plan for Implement phase with parallel test generation", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Implement);
      const parallelStep = plan.next_steps.find(s => s.parallel);
      expect(parallelStep?.tools).toContain("sdd_generate_tests");
    });

    it("returns plan for Verify phase with parallel doc generation", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Verify);
      const parallelStep = plan.next_steps.find(s => s.parallel);
      expect(parallelStep?.tools).toContain("sdd_generate_docs");
    });

    it("returns empty next_steps for Release phase (terminal)", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Release);
      expect(plan.phase).toBe(Phase.Release);
      expect(plan.next_steps).toHaveLength(0);
    });

    it("returns a step number on each step", () => {
      const plan = DependencyGraph.getExecutionPlan(Phase.Specify);
      plan.next_steps.forEach((step, i) => {
        expect(step.step).toBe(i + 1);
      });
    });
  });
});
