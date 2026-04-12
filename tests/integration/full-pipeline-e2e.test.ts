/**
 * Full Pipeline E2E Integration Test — All 10 phases
 * Uses real FileManager + StateMachine in temp directories — no mocks.
 * Validates: Init → Discover → Specify → Clarify → Design → Tasks → Analyze
 *            → Implement → Verify → Release
 * Also validates: gate enforcement (BLOCK prevents advance past Analyze),
 *                 missing required files block phase advancement.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { FileManager } from "../../src/services/file-manager.js";
import { StateMachine } from "../../src/services/state-machine.js";
import { Phase } from "../../src/constants.js";
import type { GateDecision } from "../../src/types.js";

let tempDir: string;
let fm: FileManager;
let sm: StateMachine;

const SPEC_DIR = ".specs";
const PROJECT = "full-pipeline-test";
const FEATURE_DIR = ".specs/001-full-pipeline-test";

// Minimal content for each required phase file
const CONSTITUTION = "# Constitution\nProject charter for full pipeline test.\n";
const SPECIFICATION = "# Specification\n\n### REQ-AUTH-001\nThe system authenticates users.\n\n### Acceptance Criteria\n- AC-1: Valid credentials return JWT.\n";
const DESIGN = "# Design\n\n## Architecture\nLayered service design.\n\n## API\nPOST /api/auth/login\n";
const TASKS = "# Tasks\n\n| T-001 | Implement login endpoint | M | — | REQ-AUTH-001 |\n";
const ANALYSIS = "# Analysis\n\npas_rate: 95\ncoverage: 95%\n\n## Gate Decision\nAPPROVE\n";
const CHECKLIST = "# Checklist\n\n- [x] All requirements have tests\n- [x] Security review complete\n";
const VERIFICATION = "# Verification\n\npass_rate: 95\n\n## Tasks Verified\n- [x] T-001: Login endpoint works\n";

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "specky-full-e2e-"));
  fm = new FileManager(tempDir);
  sm = new StateMachine(fm);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Full 10-phase Pipeline E2E", () => {
  // ── Phases 1-6: Init through Tasks ────────────────────────────────────

  it("advances Init → Discover → Specify → Clarify → Design → Tasks", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    await fm.writeSpecFile(FEATURE_DIR, "CONSTITUTION.md", CONSTITUTION, true);

    const initState = sm.createDefaultState(PROJECT);
    initState.features = [FEATURE_DIR];
    initState.phases[Phase.Init] = { status: "completed" };
    await sm.saveState(SPEC_DIR, initState);

    // Init → Discover
    let state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Discover);

    // Discover → Specify (no required files for Discover)
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Specify);

    // Write SPECIFICATION.md, advance Specify → Clarify
    await fm.writeSpecFile(FEATURE_DIR, "SPECIFICATION.md", SPECIFICATION, true);
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Clarify);

    // Clarify → Design (still needs SPECIFICATION.md — already written)
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Design);

    // Write DESIGN.md, advance Design → Tasks
    await fm.writeSpecFile(FEATURE_DIR, "DESIGN.md", DESIGN, true);
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Tasks);

    // Verify all 5 preceding phases are completed
    const finalState = await sm.loadState(SPEC_DIR);
    expect(finalState.phases[Phase.Init].status).toBe("completed");
    expect(finalState.phases[Phase.Discover].status).toBe("completed");
    expect(finalState.phases[Phase.Specify].status).toBe("completed");
    expect(finalState.phases[Phase.Clarify].status).toBe("completed");
    expect(finalState.phases[Phase.Design].status).toBe("completed");
    expect(finalState.phases[Phase.Tasks].status).toBe("in_progress");
  });

  // ── Phase 7: Analyze with gate enforcement ─────────────────────────────

  it("blocks advance past Analyze when gate_decision is null", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    await fm.writeSpecFile(FEATURE_DIR, "CONSTITUTION.md", CONSTITUTION, true);
    await fm.writeSpecFile(FEATURE_DIR, "SPECIFICATION.md", SPECIFICATION, true);
    await fm.writeSpecFile(FEATURE_DIR, "DESIGN.md", DESIGN, true);
    await fm.writeSpecFile(FEATURE_DIR, "TASKS.md", TASKS, true);
    await fm.writeSpecFile(FEATURE_DIR, "ANALYSIS.md", ANALYSIS, true);

    // Put pipeline at Analyze phase, no gate decision set
    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Analyze;
    state.phases[Phase.Init] = { status: "completed" };
    state.phases[Phase.Discover] = { status: "completed" };
    state.phases[Phase.Specify] = { status: "completed" };
    state.phases[Phase.Clarify] = { status: "completed" };
    state.phases[Phase.Design] = { status: "completed" };
    state.phases[Phase.Tasks] = { status: "completed" };
    state.phases[Phase.Analyze] = { status: "in_progress" };
    state.gate_decision = null;
    await sm.saveState(SPEC_DIR, state);

    await expect(sm.advancePhase(SPEC_DIR, "001")).rejects.toThrow(/gate decision/i);
  });

  it("blocks advance past Analyze when gate_decision is BLOCK", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    await fm.writeSpecFile(FEATURE_DIR, "CONSTITUTION.md", CONSTITUTION, true);
    await fm.writeSpecFile(FEATURE_DIR, "SPECIFICATION.md", SPECIFICATION, true);
    await fm.writeSpecFile(FEATURE_DIR, "DESIGN.md", DESIGN, true);
    await fm.writeSpecFile(FEATURE_DIR, "TASKS.md", TASKS, true);
    await fm.writeSpecFile(FEATURE_DIR, "ANALYSIS.md", ANALYSIS, true);

    const blockGate: GateDecision = {
      decision: "BLOCK",
      reasons: ["Critical requirements missing"],
      coverage_percent: 45,
      gaps: ["REQ-AUTH-001 has no design component"],
      decided_at: new Date().toISOString(),
    };

    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Analyze;
    state.phases[Phase.Init] = { status: "completed" };
    state.phases[Phase.Discover] = { status: "completed" };
    state.phases[Phase.Specify] = { status: "completed" };
    state.phases[Phase.Clarify] = { status: "completed" };
    state.phases[Phase.Design] = { status: "completed" };
    state.phases[Phase.Tasks] = { status: "completed" };
    state.phases[Phase.Analyze] = { status: "in_progress" };
    state.gate_decision = blockGate;
    await sm.saveState(SPEC_DIR, state);

    await expect(sm.advancePhase(SPEC_DIR, "001")).rejects.toThrow(/BLOCK/i);
  });

  it("blocks advance past Analyze when gate_decision is CHANGES_NEEDED", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    await fm.writeSpecFile(FEATURE_DIR, "CONSTITUTION.md", CONSTITUTION, true);
    await fm.writeSpecFile(FEATURE_DIR, "SPECIFICATION.md", SPECIFICATION, true);
    await fm.writeSpecFile(FEATURE_DIR, "DESIGN.md", DESIGN, true);
    await fm.writeSpecFile(FEATURE_DIR, "TASKS.md", TASKS, true);
    await fm.writeSpecFile(FEATURE_DIR, "ANALYSIS.md", ANALYSIS, true);

    const changesGate: GateDecision = {
      decision: "CHANGES_NEEDED",
      reasons: ["Coverage below 90%"],
      coverage_percent: 75,
      gaps: ["T-002 missing from TASKS.md"],
      decided_at: new Date().toISOString(),
    };

    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Analyze;
    state.phases[Phase.Init] = { status: "completed" };
    state.phases[Phase.Discover] = { status: "completed" };
    state.phases[Phase.Specify] = { status: "completed" };
    state.phases[Phase.Clarify] = { status: "completed" };
    state.phases[Phase.Design] = { status: "completed" };
    state.phases[Phase.Tasks] = { status: "completed" };
    state.phases[Phase.Analyze] = { status: "in_progress" };
    state.gate_decision = changesGate;
    await sm.saveState(SPEC_DIR, state);

    await expect(sm.advancePhase(SPEC_DIR, "001")).rejects.toThrow(/CHANGES_NEEDED/i);
  });

  it("advances past Analyze when gate_decision is APPROVE", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    await fm.writeSpecFile(FEATURE_DIR, "CONSTITUTION.md", CONSTITUTION, true);
    await fm.writeSpecFile(FEATURE_DIR, "SPECIFICATION.md", SPECIFICATION, true);
    await fm.writeSpecFile(FEATURE_DIR, "DESIGN.md", DESIGN, true);
    await fm.writeSpecFile(FEATURE_DIR, "TASKS.md", TASKS, true);
    await fm.writeSpecFile(FEATURE_DIR, "ANALYSIS.md", ANALYSIS, true);

    const approveGate: GateDecision = {
      decision: "APPROVE",
      reasons: ["All requirements traced to design and tasks"],
      coverage_percent: 95,
      gaps: [],
      decided_at: new Date().toISOString(),
    };

    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Analyze;
    state.phases[Phase.Init] = { status: "completed" };
    state.phases[Phase.Discover] = { status: "completed" };
    state.phases[Phase.Specify] = { status: "completed" };
    state.phases[Phase.Clarify] = { status: "completed" };
    state.phases[Phase.Design] = { status: "completed" };
    state.phases[Phase.Tasks] = { status: "completed" };
    state.phases[Phase.Analyze] = { status: "in_progress" };
    state.gate_decision = approveGate;
    await sm.saveState(SPEC_DIR, state);

    const newState = await sm.advancePhase(SPEC_DIR, "001");
    expect(newState.current_phase).toBe(Phase.Implement);
    expect(newState.phases[Phase.Analyze].status).toBe("completed");
  });

  // ── Phases 8-10: Implement → Verify → Release ─────────────────────────

  it("advances Implement → Verify → Release", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    await fm.writeSpecFile(FEATURE_DIR, "CONSTITUTION.md", CONSTITUTION, true);
    await fm.writeSpecFile(FEATURE_DIR, "SPECIFICATION.md", SPECIFICATION, true);
    await fm.writeSpecFile(FEATURE_DIR, "DESIGN.md", DESIGN, true);
    await fm.writeSpecFile(FEATURE_DIR, "TASKS.md", TASKS, true);
    await fm.writeSpecFile(FEATURE_DIR, "ANALYSIS.md", ANALYSIS, true);

    const approveGate: GateDecision = {
      decision: "APPROVE",
      reasons: ["Full coverage"],
      coverage_percent: 98,
      gaps: [],
      decided_at: new Date().toISOString(),
    };

    // Start at Implement phase
    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Implement;
    state.phases[Phase.Init] = { status: "completed" };
    state.phases[Phase.Discover] = { status: "completed" };
    state.phases[Phase.Specify] = { status: "completed" };
    state.phases[Phase.Clarify] = { status: "completed" };
    state.phases[Phase.Design] = { status: "completed" };
    state.phases[Phase.Tasks] = { status: "completed" };
    state.phases[Phase.Analyze] = { status: "completed" };
    state.phases[Phase.Implement] = { status: "in_progress" };
    state.gate_decision = approveGate;
    await sm.saveState(SPEC_DIR, state);

    // Write CHECKLIST.md (required for Implement → Verify)
    await fm.writeSpecFile(FEATURE_DIR, "CHECKLIST.md", CHECKLIST, true);

    // Implement → Verify
    let nextState = await sm.advancePhase(SPEC_DIR, "001");
    expect(nextState.current_phase).toBe(Phase.Verify);

    // Write VERIFICATION.md (required for Verify → Release)
    await fm.writeSpecFile(FEATURE_DIR, "VERIFICATION.md", VERIFICATION, true);

    // Verify → Release
    nextState = await sm.advancePhase(SPEC_DIR, "001");
    expect(nextState.current_phase).toBe(Phase.Release);
    expect(nextState.phases[Phase.Verify].status).toBe("completed");
  });

  it("blocks Implement → Verify when CHECKLIST.md is missing", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    // Do NOT write CHECKLIST.md

    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Implement;
    state.phases[Phase.Implement] = { status: "in_progress" };
    state.gate_decision = {
      decision: "APPROVE",
      reasons: [],
      coverage_percent: 95,
      gaps: [],
      decided_at: new Date().toISOString(),
    };
    await sm.saveState(SPEC_DIR, state);

    await expect(sm.advancePhase(SPEC_DIR, "001")).rejects.toThrow(/missing/i);
  });

  it("blocks Verify → Release when VERIFICATION.md is missing", async () => {
    await fm.ensureSpecDir(SPEC_DIR);
    // Do NOT write VERIFICATION.md

    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Verify;
    state.phases[Phase.Verify] = { status: "in_progress" };
    state.gate_decision = {
      decision: "APPROVE",
      reasons: [],
      coverage_percent: 95,
      gaps: [],
      decided_at: new Date().toISOString(),
    };
    await sm.saveState(SPEC_DIR, state);

    await expect(sm.advancePhase(SPEC_DIR, "001")).rejects.toThrow(/missing/i);
  });

  // ── Full 10-phase run ─────────────────────────────────────────────────

  it("completes all 10 phases end-to-end with APPROVE gate", async () => {
    await fm.ensureSpecDir(SPEC_DIR);

    // Phase 1: Init
    await fm.writeSpecFile(FEATURE_DIR, "CONSTITUTION.md", CONSTITUTION, true);
    const initState = sm.createDefaultState(PROJECT);
    initState.features = [FEATURE_DIR];
    initState.phases[Phase.Init] = { status: "completed" };
    await sm.saveState(SPEC_DIR, initState);

    // Phase 2: Init → Discover
    let state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Discover);

    // Phase 3: Discover → Specify
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Specify);

    // Phase 4: Specify → Clarify
    await fm.writeSpecFile(FEATURE_DIR, "SPECIFICATION.md", SPECIFICATION, true);
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Clarify);

    // Phase 5: Clarify → Design
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Design);

    // Phase 6: Design → Tasks
    await fm.writeSpecFile(FEATURE_DIR, "DESIGN.md", DESIGN, true);
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Tasks);

    // Phase 7: Tasks → Analyze
    await fm.writeSpecFile(FEATURE_DIR, "TASKS.md", TASKS, true);
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Analyze);

    // Record APPROVE gate decision (simulates sdd_run_analysis result)
    await fm.writeSpecFile(FEATURE_DIR, "ANALYSIS.md", ANALYSIS, true);
    const currentState = await sm.loadState(SPEC_DIR);
    currentState.gate_decision = {
      decision: "APPROVE",
      reasons: ["All 1 requirements traced to design and tasks"],
      coverage_percent: 100,
      gaps: [],
      decided_at: new Date().toISOString(),
    };
    await sm.saveState(SPEC_DIR, currentState);

    // Phase 8: Analyze → Implement
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Implement);

    // Phase 9: Implement → Verify
    await fm.writeSpecFile(FEATURE_DIR, "CHECKLIST.md", CHECKLIST, true);
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Verify);

    // Phase 10: Verify → Release
    await fm.writeSpecFile(FEATURE_DIR, "VERIFICATION.md", VERIFICATION, true);
    state = await sm.advancePhase(SPEC_DIR, "001");
    expect(state.current_phase).toBe(Phase.Release);

    // All 9 preceding phases must be completed
    const finalState = await sm.loadState(SPEC_DIR);
    for (const phase of [
      Phase.Init, Phase.Discover, Phase.Specify, Phase.Clarify,
      Phase.Design, Phase.Tasks, Phase.Analyze, Phase.Implement, Phase.Verify,
    ]) {
      expect(finalState.phases[phase].status).toBe("completed");
    }
    expect(finalState.phases[Phase.Release].status).toBe("in_progress");

    // All required files must exist
    const files = await fm.listSpecFiles(FEATURE_DIR);
    expect(files).toContain("CONSTITUTION.md");
    expect(files).toContain("SPECIFICATION.md");
    expect(files).toContain("DESIGN.md");
    expect(files).toContain("TASKS.md");
    expect(files).toContain("ANALYSIS.md");
    expect(files).toContain("CHECKLIST.md");
    expect(files).toContain("VERIFICATION.md");
  });

  // ── Terminal phase guard ───────────────────────────────────────────────

  it("throws when attempting to advance past Release (terminal phase)", async () => {
    await fm.ensureSpecDir(SPEC_DIR);

    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Release;
    state.phases[Phase.Release] = { status: "in_progress" };
    await sm.saveState(SPEC_DIR, state);

    await expect(sm.advancePhase(SPEC_DIR, "001")).rejects.toThrow(/terminal/i);
  });

  // ── State persistence across instances ────────────────────────────────

  it("gate decision and phase state survive across StateMachine instances", async () => {
    await fm.ensureSpecDir(SPEC_DIR);

    const gate: GateDecision = {
      decision: "APPROVE",
      reasons: ["Full coverage"],
      coverage_percent: 100,
      gaps: [],
      decided_at: "2026-04-12T10:00:00.000Z",
    };

    const state = sm.createDefaultState(PROJECT);
    state.features = [FEATURE_DIR];
    state.current_phase = Phase.Analyze;
    state.phases[Phase.Analyze] = { status: "in_progress" };
    state.gate_decision = gate;
    await sm.saveState(SPEC_DIR, state);

    // New instance, same FileManager
    const sm2 = new StateMachine(fm);
    const loaded = await sm2.loadState(SPEC_DIR);

    expect(loaded.current_phase).toBe(Phase.Analyze);
    expect(loaded.gate_decision).not.toBeNull();
    expect(loaded.gate_decision!.decision).toBe("APPROVE");
    expect(loaded.gate_decision!.coverage_percent).toBe(100);
    expect(loaded.gate_decision!.decided_at).toBe("2026-04-12T10:00:00.000Z");
  });
});
