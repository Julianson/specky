import { describe, it, expect, vi } from "vitest";
import { DocGenerator } from "../../src/services/doc-generator.js";

const SPEC = "# SPECIFICATION\n\n## REQ-001\nThe system shall authenticate users.\n\n## REQ-002\nThe system shall log requests.";
const DESIGN = "# DESIGN\n\n## Architecture\nMicroservices with API Gateway.\n\nGET /api/users\nPOST /api/auth/login\nDELETE /api/sessions/{id}";
const TASKS = "# TASKS\n\n- [x] T001 Implement auth\n- [ ] T002 Implement logging";

function makeFileManager(files: Record<string, string>) {
  return {
    readSpecFile: vi.fn((dir: string, file: string) => {
      const content = files[file];
      if (content !== undefined) return Promise.resolve(content);
      return Promise.reject(new Error("Not found"));
    }),
  };
}

describe("DocGenerator", () => {
  describe("generateFullDocs", () => {
    it("includes all sections when all artifacts exist", async () => {
      const fm = makeFileManager({ "SPECIFICATION.md": SPEC, "DESIGN.md": DESIGN, "TASKS.md": TASKS, "ANALYSIS.md": "# Analysis\nAll good." });
      const gen = new DocGenerator(fm as never);
      const result = await gen.generateFullDocs(".specs/001-auth", "001");

      expect(result.type).toBe("full");
      expect(result.sections).toContain("Specification");
      expect(result.sections).toContain("Architecture & Design");
      expect(result.sections).toContain("Implementation Plan");
      expect(result.sections).toContain("Quality Analysis");
      expect(result.sections).toContain("How It Was Built");
      expect(result.content).toContain("auth");
      expect(result.file_path).toContain("001");
    });

    it("gracefully handles missing artifacts", async () => {
      const fm = makeFileManager({});
      const gen = new DocGenerator(fm as never);
      const result = await gen.generateFullDocs(".specs/001-empty", "001");

      expect(result.sections).toContain("How It Was Built");
      expect(result.sections).not.toContain("Specification");
      expect(result.content).toContain("Spec-Driven Development");
    });
  });

  describe("generateApiDocs", () => {
    it("extracts endpoints from DESIGN.md", async () => {
      const fm = makeFileManager({ "DESIGN.md": DESIGN });
      const gen = new DocGenerator(fm as never);
      const result = await gen.generateApiDocs(".specs/001-auth", "001");

      expect(result.type).toBe("api");
      expect(result.sections.length).toBe(3);
      expect(result.sections).toContain("GET /api/users");
      expect(result.sections).toContain("POST /api/auth/login");
      expect(result.sections).toContain("DELETE /api/sessions/{id}");
      expect(result.file_path).toContain("api-001");
    });

    it("returns empty endpoints for missing design", async () => {
      const fm = makeFileManager({});
      const gen = new DocGenerator(fm as never);
      const result = await gen.generateApiDocs(".specs/001-auth", "001");

      expect(result.sections).toHaveLength(0);
      expect(result.content).toContain("API Documentation");
    });
  });

  describe("generateRunbook", () => {
    it("returns runbook with standard sections", async () => {
      const fm = makeFileManager({ "DESIGN.md": DESIGN });
      const gen = new DocGenerator(fm as never);
      const result = await gen.generateRunbook(".specs/001-auth", "001");

      expect(result.type).toBe("runbook");
      expect(result.sections).toEqual(["Deployment", "Monitoring", "Troubleshooting", "Rollback"]);
      expect(result.content).toContain("npm run build");
      expect(result.content).toContain("Health check");
      expect(result.file_path).toContain("runbook-001");
    });
  });

  describe("generateOnboarding", () => {
    it("includes spec and design summaries", async () => {
      const fm = makeFileManager({ "SPECIFICATION.md": SPEC, "DESIGN.md": DESIGN });
      const gen = new DocGenerator(fm as never);
      const result = await gen.generateOnboarding(".specs/001-auth", "001");

      expect(result.type).toBe("onboarding");
      expect(result.sections).toContain("What This Feature Does");
      expect(result.sections).toContain("Getting Started");
      expect(result.sections).toContain("Key Concepts");
      expect(result.content).toContain("EARS Notation");
      expect(result.content).toContain("npm install");
      expect(result.file_path).toContain("onboarding-001");
    });

    it("handles empty spec gracefully", async () => {
      const fm = makeFileManager({});
      const gen = new DocGenerator(fm as never);
      const result = await gen.generateOnboarding(".specs/001-auth", "001");

      expect(result.type).toBe("onboarding");
      expect(result.content).toContain("Getting Started");
    });
  });
});
