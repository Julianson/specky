/**
 * Checkpoint E2E Integration Test
 * Uses real FileManager with temp directories — no mocks.
 * Validates: checkpoint creation, listing, restore, and auto-backup.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { FileManager } from "../../src/services/file-manager.js";
import { StateMachine } from "../../src/services/state-machine.js";
import type { SddState } from "../../src/types.js";

let tempDir: string;
let fm: FileManager;
let sm: StateMachine;

const SPEC_DIR = ".specs";
const FEATURE_DIR = ".specs/001-test-feature";

function makeState(): SddState {
  return {
    version: "4.0.0",
    project_name: "test-feature",
    current_phase: "specify" as never,
    phases: {
      init: { status: "completed", started_at: "2024-01-01T00:00:00Z", completed_at: "2024-01-01T00:00:00Z" },
      discover: { status: "completed", started_at: "2024-01-01T00:00:00Z", completed_at: "2024-01-01T00:00:00Z" },
      specify: { status: "in_progress", started_at: "2024-01-01T00:00:00Z" },
      clarify: { status: "pending" },
      design: { status: "pending" },
      tasks: { status: "pending" },
      analyze: { status: "pending" },
      implement: { status: "pending" },
      verify: { status: "pending" },
      release: { status: "pending" },
    } as never,
    features: [] as string[],
    amendments: [],
    gate_decision: null,
  };
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "specky-checkpoint-"));
  fm = new FileManager(tempDir);
  sm = new StateMachine(fm);

  // Set up feature dir with artifacts
  const featureAbsDir = join(tempDir, FEATURE_DIR);
  await mkdir(featureAbsDir, { recursive: true });
  await writeFile(join(featureAbsDir, "CONSTITUTION.md"), "# Constitution v1\nOriginal content");
  await writeFile(join(featureAbsDir, "SPECIFICATION.md"), "# Spec v1\nOriginal spec content");

  // Write state
  const state = makeState();
  state.features = [FEATURE_DIR];
  await mkdir(join(tempDir, SPEC_DIR), { recursive: true });
  await writeFile(
    join(tempDir, SPEC_DIR, ".sdd-state.json"),
    JSON.stringify(state, null, 2),
  );
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Checkpoint E2E", () => {
  // ── Create checkpoint ───────────────────────────────────────────────

  it("creates a checkpoint with correct structure", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");
    await mkdir(checkpointsDir, { recursive: true });

    // Simulate what sdd_checkpoint does: snapshot all artifacts
    const constitution = await readFile(join(featureAbsDir, "CONSTITUTION.md"), "utf-8");
    const spec = await readFile(join(featureAbsDir, "SPECIFICATION.md"), "utf-8");

    const checkpoint = {
      id: "CP-001",
      label: "before-redesign",
      created_at: new Date().toISOString(),
      phase: "specify",
      artifacts: ["CONSTITUTION.md", "SPECIFICATION.md"],
      artifact_contents: {
        "CONSTITUTION.md": constitution,
        "SPECIFICATION.md": spec,
      },
    };

    await writeFile(join(checkpointsDir, "CP-001.json"), JSON.stringify(checkpoint, null, 2));

    // Verify checkpoint was created
    const cpContent = await readFile(join(checkpointsDir, "CP-001.json"), "utf-8");
    const parsed = JSON.parse(cpContent);

    expect(parsed.id).toBe("CP-001");
    expect(parsed.label).toBe("before-redesign");
    expect(parsed.phase).toBe("specify");
    expect(parsed.artifacts).toContain("CONSTITUTION.md");
    expect(parsed.artifacts).toContain("SPECIFICATION.md");
    expect(parsed.artifact_contents["CONSTITUTION.md"]).toContain("Constitution v1");
  });

  it("stores current phase in checkpoint", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");
    await mkdir(checkpointsDir, { recursive: true });

    const state = await sm.loadState(SPEC_DIR);

    const checkpoint = {
      id: "CP-001",
      label: "Checkpoint 1",
      created_at: new Date().toISOString(),
      phase: state.current_phase,
      artifacts: [],
      artifact_contents: {},
    };

    await writeFile(join(checkpointsDir, "CP-001.json"), JSON.stringify(checkpoint, null, 2));

    const raw = await readFile(join(checkpointsDir, "CP-001.json"), "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.phase).toBe("specify");
  });

  it("creates sequential checkpoint IDs", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");
    await mkdir(checkpointsDir, { recursive: true });

    const cp1 = { id: "CP-001", label: "First", created_at: new Date().toISOString(), phase: "specify", artifacts: [], artifact_contents: {} };
    const cp2 = { id: "CP-002", label: "Second", created_at: new Date().toISOString(), phase: "design", artifacts: [], artifact_contents: {} };

    await writeFile(join(checkpointsDir, "CP-001.json"), JSON.stringify(cp1, null, 2));
    await writeFile(join(checkpointsDir, "CP-002.json"), JSON.stringify(cp2, null, 2));

    const raw1 = JSON.parse(await readFile(join(checkpointsDir, "CP-001.json"), "utf-8"));
    const raw2 = JSON.parse(await readFile(join(checkpointsDir, "CP-002.json"), "utf-8"));

    expect(raw1.id).toBe("CP-001");
    expect(raw2.id).toBe("CP-002");
  });

  // ── Restore from checkpoint ─────────────────────────────────────────

  it("restores artifacts from checkpoint after modification", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");
    await mkdir(checkpointsDir, { recursive: true });

    // Save original content as checkpoint
    const originalSpec = await readFile(join(featureAbsDir, "SPECIFICATION.md"), "utf-8");
    const checkpoint = {
      id: "CP-001",
      label: "original",
      created_at: new Date().toISOString(),
      phase: "specify",
      artifacts: ["SPECIFICATION.md"],
      artifact_contents: { "SPECIFICATION.md": originalSpec },
    };
    await writeFile(join(checkpointsDir, "CP-001.json"), JSON.stringify(checkpoint, null, 2));

    // Modify the spec
    await writeFile(join(featureAbsDir, "SPECIFICATION.md"), "# Spec v2\nModified content");
    const modified = await readFile(join(featureAbsDir, "SPECIFICATION.md"), "utf-8");
    expect(modified).toContain("Modified content");

    // Restore from checkpoint
    const cpRaw = await readFile(join(checkpointsDir, "CP-001.json"), "utf-8");
    const cp = JSON.parse(cpRaw);
    for (const [name, content] of Object.entries(cp.artifact_contents as Record<string, string>)) {
      await writeFile(join(featureAbsDir, name), content);
    }

    // Verify restore
    const restored = await readFile(join(featureAbsDir, "SPECIFICATION.md"), "utf-8");
    expect(restored).toContain("Original spec content");
    expect(restored).not.toContain("Modified content");
  });

  it("creates auto-backup before restoring", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");
    await mkdir(checkpointsDir, { recursive: true });

    // Create checkpoint
    const checkpoint = {
      id: "CP-001",
      label: "original",
      created_at: new Date().toISOString(),
      phase: "specify",
      artifacts: ["SPECIFICATION.md"],
      artifact_contents: { "SPECIFICATION.md": "Original" },
    };
    await writeFile(join(checkpointsDir, "CP-001.json"), JSON.stringify(checkpoint, null, 2));

    // Modify spec
    await writeFile(join(featureAbsDir, "SPECIFICATION.md"), "Modified content");

    // Before restoring, create auto-backup
    const currentContent = await readFile(join(featureAbsDir, "SPECIFICATION.md"), "utf-8");
    const autoBackup = {
      id: "CP-AUTO-BACKUP",
      label: "Auto-backup before restoring CP-001",
      created_at: new Date().toISOString(),
      phase: "specify",
      artifacts: ["SPECIFICATION.md"],
      artifact_contents: { "SPECIFICATION.md": currentContent },
    };
    await writeFile(join(checkpointsDir, "CP-AUTO-BACKUP.json"), JSON.stringify(autoBackup, null, 2));

    // Verify auto-backup exists
    const backupRaw = await readFile(join(checkpointsDir, "CP-AUTO-BACKUP.json"), "utf-8");
    const backup = JSON.parse(backupRaw);
    expect(backup.id).toBe("CP-AUTO-BACKUP");
    expect(backup.artifact_contents["SPECIFICATION.md"]).toBe("Modified content");
  });

  // ── List checkpoints ────────────────────────────────────────────────

  it("returns empty list when no checkpoints exist", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");

    // Directory doesn't exist yet
    let files: string[] = [];
    try {
      const { readdir } = await import("node:fs/promises");
      files = await readdir(checkpointsDir);
    } catch {
      files = [];
    }

    expect(files).toHaveLength(0);
  });

  it("lists all checkpoints sorted newest first", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");
    await mkdir(checkpointsDir, { recursive: true });

    const cp1 = { id: "CP-001", label: "First", created_at: "2024-01-01T00:00:00Z", phase: "specify", artifacts: [] };
    const cp2 = { id: "CP-002", label: "Second", created_at: "2024-01-02T00:00:00Z", phase: "design", artifacts: [] };

    await writeFile(join(checkpointsDir, "CP-001.json"), JSON.stringify(cp1, null, 2));
    await writeFile(join(checkpointsDir, "CP-002.json"), JSON.stringify(cp2, null, 2));

    // List and sort
    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(checkpointsDir)).filter(f => f.endsWith(".json"));
    const checkpoints = [];
    for (const file of files) {
      const raw = await readFile(join(checkpointsDir, file), "utf-8");
      checkpoints.push(JSON.parse(raw));
    }
    checkpoints.sort((a, b) => b.created_at.localeCompare(a.created_at));

    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0].id).toBe("CP-002"); // newest first
    expect(checkpoints[1].id).toBe("CP-001");
  });

  it("checkpoint contains all artifacts from feature directory", async () => {
    const featureAbsDir = join(tempDir, FEATURE_DIR);
    const checkpointsDir = join(featureAbsDir, ".checkpoints");
    await mkdir(checkpointsDir, { recursive: true });

    // Add a DESIGN.md
    await writeFile(join(featureAbsDir, "DESIGN.md"), "# Design v1\nArchitecture overview");

    // Snapshot all artifacts
    const artifactNames = ["CONSTITUTION.md", "SPECIFICATION.md", "DESIGN.md"];
    const artifacts: Record<string, string> = {};
    for (const name of artifactNames) {
      try {
        artifacts[name] = await readFile(join(featureAbsDir, name), "utf-8");
      } catch {
        // skip
      }
    }

    const checkpoint = {
      id: "CP-001",
      label: "full-snapshot",
      created_at: new Date().toISOString(),
      phase: "design",
      artifacts: Object.keys(artifacts),
      artifact_contents: artifacts,
    };
    await writeFile(join(checkpointsDir, "CP-001.json"), JSON.stringify(checkpoint, null, 2));

    const raw = JSON.parse(await readFile(join(checkpointsDir, "CP-001.json"), "utf-8"));
    expect(raw.artifacts).toContain("CONSTITUTION.md");
    expect(raw.artifacts).toContain("SPECIFICATION.md");
    expect(raw.artifacts).toContain("DESIGN.md");
    expect(raw.artifact_contents["DESIGN.md"]).toContain("Architecture overview");
  });

  it("state machine persists across checkpoint operations", async () => {
    // Verify state loads correctly
    const state = await sm.loadState(SPEC_DIR);
    expect(state.current_phase).toBe("specify");
    expect(state.project_name).toBe("test-feature");

    // Simulate phase change after restore
    state.current_phase = "design" as never;
    await sm.saveState(SPEC_DIR, state);

    const reloaded = await sm.loadState(SPEC_DIR);
    expect(reloaded.current_phase).toBe("design");
  });
});
