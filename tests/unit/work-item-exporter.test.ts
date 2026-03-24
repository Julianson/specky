import { describe, it, expect, vi } from "vitest";
import { WorkItemExporter } from "../../src/services/work-item-exporter.js";
import type { WorkItemPayload } from "../../src/types.js";

const TASKS_CONTENT = [
  "# TASKS",
  "",
  "- [x] T001 [US1] Implement user authentication REQ-AUTH-001",
  "- [ ] T002 [US1] Add password hashing",
  "- [ ] T003 [US2] Create logging middleware REQ-LOG-001",
].join("\n");

const SPEC_CONTENT = "# SPECIFICATION\n\n## REQ-AUTH-001\nThe system shall authenticate.";

const SAMPLE_ITEMS: WorkItemPayload[] = [
  { task_id: "T001", title: "Implement auth", description: "Auth implementation", traces_to: ["REQ-AUTH-001"], effort: "M", dependencies: [], acceptance_criteria: ["Users can log in", "JWT tokens are issued"] },
  { task_id: "T002", title: "Add logging", description: "Logging middleware", traces_to: ["REQ-LOG-001"], dependencies: ["T001"], acceptance_criteria: ["All requests logged"] },
];

function makeFileManager(files: Record<string, string> = {}) {
  return {
    readSpecFile: vi.fn((dir: string, file: string) => {
      const content = files[file];
      if (content !== undefined) return Promise.resolve(content);
      return Promise.reject(new Error("Not found"));
    }),
  };
}

describe("WorkItemExporter", () => {
  // ── toGitHubPayloads (pure) ────────────────────────────────────────────

  describe("toGitHubPayloads", () => {
    it("maps items to GitHub issue format", () => {
      const exp = new WorkItemExporter({} as never);
      const payloads = exp.toGitHubPayloads(SAMPLE_ITEMS, "001");

      expect(payloads).toHaveLength(2);
      expect(payloads[0].title).toBe("[T001] Implement auth");
      expect(payloads[0].body).toContain("Description");
      expect(payloads[0].body).toContain("Acceptance Criteria");
      expect(payloads[0].body).toContain("Users can log in");
      expect(payloads[0].labels).toContain("sdd");
      expect(payloads[0].labels).toContain("feature/001");
      expect(payloads[0].labels).toContain("effort:M");
    });

    it("includes traces_to in body", () => {
      const exp = new WorkItemExporter({} as never);
      const payloads = exp.toGitHubPayloads(SAMPLE_ITEMS, "001");
      expect(payloads[0].body).toContain("REQ-AUTH-001");
    });
  });

  // ── toAzureBoardsPayloads (pure) ───────────────────────────────────────

  describe("toAzureBoardsPayloads", () => {
    it("maps items to Azure Boards format", () => {
      const exp = new WorkItemExporter({} as never);
      const payloads = exp.toAzureBoardsPayloads(SAMPLE_ITEMS, "Project\\Team", "Sprint 1");

      expect(payloads).toHaveLength(2);
      expect(payloads[0].title).toBe("[T001] Implement auth");
      expect(payloads[0].work_item_type).toBe("Task");
      expect(payloads[0].area_path).toBe("Project\\Team");
      expect(payloads[0].iteration_path).toBe("Sprint 1");
      expect(payloads[0].tags).toContain("sdd");
      expect(payloads[0].description).toContain("REQ-AUTH-001");
    });

    it("includes acceptance criteria as HTML", () => {
      const exp = new WorkItemExporter({} as never);
      const payloads = exp.toAzureBoardsPayloads(SAMPLE_ITEMS);
      expect(payloads[0].acceptance_criteria).toContain("<li>Users can log in</li>");
    });
  });

  // ── toJiraPayloads (pure) ──────────────────────────────────────────────

  describe("toJiraPayloads", () => {
    it("maps items to Jira format", () => {
      const exp = new WorkItemExporter({} as never);
      const payloads = exp.toJiraPayloads(SAMPLE_ITEMS, "PROJ");

      expect(payloads).toHaveLength(2);
      expect(payloads[0].summary).toBe("[T001] Implement auth");
      expect(payloads[0].project_key).toBe("PROJ");
      expect(payloads[0].issue_type).toBe("Task");
      expect(payloads[0].priority).toBe("Medium");
      expect(payloads[0].labels).toContain("sdd");
      expect(payloads[0].description).toContain("h2. Description");
      expect(payloads[0].description).toContain("* Users can log in");
    });
  });

  // ── export (async, needs FM) ───────────────────────────────────────────

  describe("export", () => {
    it("exports GitHub items from TASKS.md", async () => {
      const fm = makeFileManager({ "TASKS.md": TASKS_CONTENT, "SPECIFICATION.md": SPEC_CONTENT });
      const exp = new WorkItemExporter(fm as never);
      const result = await exp.export("github", ".specs", ".specs/001-auth", false);

      expect(result.platform).toBe("github");
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.metadata.feature_number).toBe("001");
      expect(result.routing_instructions.mcp_server).toBe("github");
      expect(result.routing_instructions.tool_name).toBe("create_issue");
    });

    it("exports Azure Boards items", async () => {
      const fm = makeFileManager({ "TASKS.md": TASKS_CONTENT, "SPECIFICATION.md": SPEC_CONTENT });
      const exp = new WorkItemExporter(fm as never);
      const result = await exp.export("azure_boards", ".specs", ".specs/001-auth", false);

      expect(result.platform).toBe("azure_boards");
      expect(result.routing_instructions.mcp_server).toBe("azure-devops");
    });

    it("exports Jira items", async () => {
      const fm = makeFileManager({ "TASKS.md": TASKS_CONTENT, "SPECIFICATION.md": SPEC_CONTENT });
      const exp = new WorkItemExporter(fm as never);
      const result = await exp.export("jira", ".specs", ".specs/001-auth", false);

      expect(result.platform).toBe("jira");
      expect(result.routing_instructions.mcp_server).toBe("jira");
    });
  });
});
