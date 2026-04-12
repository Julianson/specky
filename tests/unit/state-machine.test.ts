import { describe, it, expect, beforeEach, vi } from "vitest";
import { StateMachine } from "../../src/services/state-machine.js";
import { Phase } from "../../src/constants.js";
import type { SddState } from "../../src/types.js";

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeState(currentPhase: Phase): SddState {
  return {
    version: "4.0.0",
    current_phase: currentPhase,
    features: [],
    phases: {
      [Phase.Init]: { status: "completed" },
      [Phase.Discover]: { status: "pending" },
      [Phase.Specify]: { status: "pending" },
      [Phase.Clarify]: { status: "pending" },
      [Phase.Design]: { status: "pending" },
      [Phase.Tasks]: { status: "pending" },
      [Phase.Analyze]: { status: "pending" },
      [Phase.Implement]: { status: "pending" },
      [Phase.Verify]: { status: "pending" },
      [Phase.Release]: { status: "pending" },
    },
  };
}

function makeFileManager(state?: SddState) {
  const stateJson = state ? JSON.stringify(state) : "{}";
  return {
    readProjectFile: vi.fn().mockResolvedValue(stateJson),
    writeSpecFile: vi.fn().mockResolvedValue(undefined),
    readSpecFile: vi.fn().mockResolvedValue(""),
    fileExists: vi.fn().mockResolvedValue(true),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("StateMachine", () => {
  let sm: StateMachine;

  // ── loadState ───────────────────────────────────────────────────────────
  describe("loadState", () => {
    it("returns parsed state from file manager", async () => {
      const state = makeState(Phase.Specify);
      sm = new StateMachine(makeFileManager(state) as never);

      const loaded = await sm.loadState(".specs");
      expect(loaded.current_phase).toBe(Phase.Specify);
    });

    it("returns default state when file read fails (no init yet)", async () => {
      const fm = {
        readProjectFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
        writeSpecFile: vi.fn().mockResolvedValue(undefined),
        fileExists: vi.fn().mockResolvedValue(true),
      };
      sm = new StateMachine(fm as never);

      const loaded = await sm.loadState(".specs");
      expect(loaded.current_phase).toBe(Phase.Init);
    });

    it("migrates v3 state to v4 by adding missing phases", async () => {
      const v3State = {
        version: "3.0.0",
        current_phase: Phase.Specify,
        features: [],
        phases: {
          [Phase.Init]: { status: "completed" },
          [Phase.Discover]: { status: "completed" },
          [Phase.Specify]: { status: "in_progress" },
        },
      };
      const fm = makeFileManager(v3State as never);
      sm = new StateMachine(fm as never);

      const loaded = await sm.loadState(".specs");
      expect(loaded.version).toBe("4.0.0");
      expect(loaded.phases[Phase.Implement]).toBeDefined();
      expect(loaded.phases[Phase.Release]).toBeDefined();
      // Migration auto-saves the new state
      expect(fm.writeSpecFile).toHaveBeenCalled();
    });
  });

  // ── getCurrentPhase ──────────────────────────────────────────────────────
  describe("getCurrentPhase", () => {
    it("returns the current phase from persisted state", async () => {
      const state = makeState(Phase.Design);
      sm = new StateMachine(makeFileManager(state) as never);

      const phase = await sm.getCurrentPhase(".specs");
      expect(phase).toBe(Phase.Design);
    });
  });

  // ── canTransition ─────────────────────────────────────────────────────────
  describe("canTransition", () => {
    it("allows transition to the immediately next phase", async () => {
      const state = makeState(Phase.Init);
      const fm = makeFileManager(state);
      fm.fileExists.mockResolvedValue(true); // required files exist
      sm = new StateMachine(fm as never);

      const result = await sm.canTransition(".specs", Phase.Discover);
      expect(result.allowed).toBe(true);
      expect(result.from_phase).toBe(Phase.Init);
      expect(result.to_phase).toBe(Phase.Discover);
    });

    it("rejects skipping a phase", async () => {
      const state = makeState(Phase.Init);
      sm = new StateMachine(makeFileManager(state) as never);

      const result = await sm.canTransition(".specs", Phase.Specify);
      expect(result.allowed).toBe(false);
      expect(result.error_message).toMatch(/discover/i);
    });

    it("rejects going backwards", async () => {
      const state = makeState(Phase.Design);
      sm = new StateMachine(makeFileManager(state) as never);

      const result = await sm.canTransition(".specs", Phase.Init);
      expect(result.allowed).toBe(false);
    });

    it("blocks transition when required files are missing", async () => {
      const state = makeState(Phase.Specify);
      state.features = [".specs/features/001"];
      const fm = makeFileManager(state);
      fm.fileExists.mockResolvedValue(false);
      sm = new StateMachine(fm as never);

      const result = await sm.canTransition(".specs", Phase.Clarify);
      expect(result.allowed).toBe(false);
      expect(result.missing_files?.length).toBeGreaterThan(0);
    });
  });

  // ── advancePhase ─────────────────────────────────────────────────────────
  describe("advancePhase", () => {
    it("throws when already at terminal phase (Release)", async () => {
      const state = makeState(Phase.Release);
      sm = new StateMachine(makeFileManager(state) as never);

      await expect(sm.advancePhase(".specs", "001")).rejects.toThrow(/terminal phase/i);
    });

    it("advances from Init to Discover with timestamps", async () => {
      const state = makeState(Phase.Init);
      state.features = [".specs/001-test"];
      const fm = makeFileManager(state);
      fm.fileExists.mockResolvedValue(true);
      sm = new StateMachine(fm as never);

      const result = await sm.advancePhase(".specs", "001");
      expect(result.current_phase).toBe(Phase.Discover);
      expect(result.phases[Phase.Init].status).toBe("completed");
      expect(result.phases[Phase.Init].completed_at).toBeDefined();
      expect(result.phases[Phase.Discover].status).toBe("in_progress");
      expect(result.phases[Phase.Discover].started_at).toBeDefined();
    });

    it("rejects advance when required files are missing", async () => {
      const state = makeState(Phase.Specify);
      state.features = [".specs/001-test"];
      const fm = makeFileManager(state);
      fm.fileExists.mockResolvedValue(false);
      sm = new StateMachine(fm as never);

      await expect(sm.advancePhase(".specs", "001")).rejects.toThrow(/missing/i);
    });
  });

  // ── recordPhaseStart / recordPhaseComplete ──────────────────────────────
  describe("recordPhaseStart", () => {
    it("sets phase to in_progress with started_at timestamp", async () => {
      const state = makeState(Phase.Design);
      const fm = makeFileManager(state);
      sm = new StateMachine(fm as never);

      await sm.recordPhaseStart(".specs", Phase.Design);

      const savedJson = fm.writeSpecFile.mock.calls[0][2];
      const saved = JSON.parse(savedJson);
      expect(saved.phases[Phase.Design].status).toBe("in_progress");
      expect(saved.phases[Phase.Design].started_at).toBeDefined();
      expect(saved.current_phase).toBe(Phase.Design);
    });
  });

  describe("recordPhaseComplete", () => {
    it("sets phase to completed with completed_at timestamp", async () => {
      const state = makeState(Phase.Design);
      const fm = makeFileManager(state);
      sm = new StateMachine(fm as never);

      await sm.recordPhaseComplete(".specs", Phase.Design);

      const savedJson = fm.writeSpecFile.mock.calls[0][2];
      const saved = JSON.parse(savedJson);
      expect(saved.phases[Phase.Design].status).toBe("completed");
      expect(saved.phases[Phase.Design].completed_at).toBeDefined();
    });
  });

  // ── getPhaseOrder / getRequiredFiles ────────────────────────────────────
  describe("getPhaseOrder / getRequiredFiles", () => {
    it("returns ordered phases array", () => {
      sm = new StateMachine(makeFileManager() as never);
      const order = sm.getPhaseOrder();
      expect(order[0]).toBe(Phase.Init);
      expect(order[order.length - 1]).toBe(Phase.Release);
      expect(order.length).toBe(10);
    });

    it("returns required files for Specify phase", () => {
      sm = new StateMachine(makeFileManager() as never);
      const files = sm.getRequiredFiles(Phase.Specify);
      expect(files).toContain("SPECIFICATION.md");
    });

    it("returns empty array for Discover phase", () => {
      sm = new StateMachine(makeFileManager() as never);
      const files = sm.getRequiredFiles(Phase.Discover);
      expect(files).toHaveLength(0);
    });
  });

  // ── saveState ─────────────────────────────────────────────────────────────
  describe("saveState", () => {
    it("calls writeSpecFile with JSON-serialised state", async () => {
      const fm = makeFileManager();
      sm = new StateMachine(fm as never);

      const state = makeState(Phase.Clarify);
      await sm.saveState(".specs", state);

      // saveState now writes 2 files: .sdd-state.json + .sdd-state.json.sig
      expect(fm.writeSpecFile).toHaveBeenCalledTimes(2);
      const [, , json] = fm.writeSpecFile.mock.calls[0];
      const parsed = JSON.parse(json);
      expect(parsed.current_phase).toBe(Phase.Clarify);
    });
  });
});
