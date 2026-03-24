import { describe, it, expect, vi } from "vitest";
import { GitManager } from "../../src/services/git-manager.js";

const SPEC = "# SPECIFICATION\n\n### REQ-AUTH-001\nThe system shall authenticate.\n\n### REQ-AUTH-002\nThe system shall authorize.";
const TASKS = "# TASKS\n\n- [x] Task 1\n- [ ] Task 2\n- [x] Task 3";

function makeFileManager(files: Record<string, string> = {}) {
  return {
    readSpecFile: vi.fn((dir: string, file: string) => {
      const content = files[file];
      if (content !== undefined) return Promise.resolve(content);
      return Promise.reject(new Error("Not found"));
    }),
  };
}

describe("GitManager", () => {
  // ── generateBranchInfo (pure) ──────────────────────────────────────────

  describe("generateBranchInfo", () => {
    it("generates branch with default prefix and base", () => {
      const gm = new GitManager({} as never);
      const info = gm.generateBranchInfo("001", "user-login");

      expect(info.name).toBe("feature/001-user-login");
      expect(info.feature_number).toBe("001");
      expect(info.convention).toBe("feature/<number>-<kebab-case-name>");
      expect(info.command_hint).toBe("git checkout -b feature/001-user-login main");
    });

    it("uses custom prefix", () => {
      const gm = new GitManager({} as never);
      const info = gm.generateBranchInfo("042", "payment-gateway", "fix/");

      expect(info.name).toBe("fix/042-payment-gateway");
      expect(info.command_hint).toContain("fix/042-payment-gateway");
    });

    it("uses custom base branch", () => {
      const gm = new GitManager({} as never);
      const info = gm.generateBranchInfo("007", "refactor", "feature/", "develop");

      expect(info.command_hint).toBe("git checkout -b feature/007-refactor develop");
    });

    it("preserves kebab-case feature names", () => {
      const gm = new GitManager({} as never);
      const info = gm.generateBranchInfo("003", "multi-word-feature-name");
      expect(info.name).toBe("feature/003-multi-word-feature-name");
    });
  });

  // ── generatePrPayload (async, needs FM) ────────────────────────────────

  describe("generatePrPayload", () => {
    it("generates PR with spec summary and requirements", async () => {
      const fm = makeFileManager({ "SPECIFICATION.md": SPEC, "TASKS.md": TASKS });
      const gm = new GitManager(fm as never);
      const pr = await gm.generatePrPayload(".specs/001-auth", "001", "main");

      expect(pr.title).toContain("001");
      expect(pr.title).toContain("auth");
      expect(pr.base_branch).toBe("main");
      expect(pr.head_branch).toBe("feature/001-auth");
      expect(pr.labels).toContain("sdd");
      expect(pr.requirements_covered).toContain("REQ-AUTH-001");
      expect(pr.requirements_covered).toContain("REQ-AUTH-002");
      expect(pr.body).toContain("Summary");
      expect(pr.body).toContain("Tasks:");
      expect(pr.routing_instructions.mcp_server).toBe("github");
    });

    it("uses provided head branch", async () => {
      const fm = makeFileManager({ "SPECIFICATION.md": SPEC, "TASKS.md": TASKS });
      const gm = new GitManager(fm as never);
      const pr = await gm.generatePrPayload(".specs/001-auth", "001", "main", "custom/branch");

      expect(pr.head_branch).toBe("custom/branch");
    });

    it("handles missing spec and tasks gracefully", async () => {
      const fm = makeFileManager({});
      const gm = new GitManager(fm as never);
      const pr = await gm.generatePrPayload(".specs/001-empty", "001", "main");

      expect(pr.requirements_covered).toHaveLength(0);
      expect(pr.spec_summary).toBe("");
      expect(pr.title).toContain("001");
    });
  });
});
