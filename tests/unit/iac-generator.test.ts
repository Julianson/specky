import { describe, it, expect, vi } from "vitest";
import { IacGenerator } from "../../src/services/iac-generator.js";

function makeFileManager(designContent = "") {
  return {
    readSpecFile: vi.fn(() => Promise.resolve(designContent)),
  };
}

describe("IacGenerator", () => {
  // ── generateDockerfile (pure) ──────────────────────────────────────────

  describe("generateDockerfile", () => {
    it("generates Node.js single-stage Dockerfile", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDockerfile(
        { language: "TypeScript", framework: "Express", runtime: "node" },
        false, false,
      );

      expect(result.type).toBe("docker");
      expect(result.files.length).toBe(2); // Dockerfile + .dockerignore
      const df = result.files.find(f => f.path === "Dockerfile")!;
      expect(df.content).toContain("node:22-slim");
      expect(df.content).toContain("npm ci");
      expect(df.content).not.toContain("AS builder");
    });

    it("generates Node.js multi-stage Dockerfile", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDockerfile(
        { language: "TypeScript", runtime: "node" },
        false, true,
      );

      const df = result.files.find(f => f.path === "Dockerfile")!;
      expect(df.content).toContain("AS builder");
      expect(df.content).toContain("COPY --from=builder");
    });

    it("generates Python Dockerfile", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDockerfile(
        { language: "Python", framework: "FastAPI", runtime: "python" },
        false, false,
      );

      const df = result.files.find(f => f.path === "Dockerfile")!;
      expect(df.content).toContain("python:3.12");
      expect(df.content).toContain("requirements.txt");
      expect(df.content).toContain("uvicorn");
    });

    it("includes docker-compose.yml when requested", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDockerfile(
        { language: "TypeScript", runtime: "node" },
        true, false,
      );

      expect(result.files.length).toBe(3); // Dockerfile + compose + .dockerignore
      const compose = result.files.find(f => f.path === "docker-compose.yml")!;
      expect(compose.content).toContain("services:");
      expect(compose.content).toContain("ports:");
    });

    it("always includes .dockerignore", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDockerfile(
        { language: "TypeScript", runtime: "node" },
        false, false,
      );

      const ignore = result.files.find(f => f.path === ".dockerignore")!;
      expect(ignore.content).toContain("node_modules");
      expect(ignore.content).toContain(".git");
    });

    it("falls back to generic Dockerfile for unknown languages", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDockerfile(
        { language: "Rust", runtime: "cargo" },
        false, false,
      );

      const df = result.files.find(f => f.path === "Dockerfile")!;
      expect(df.content).toContain("ubuntu:22.04");
    });
  });

  // ── generateDevcontainer (pure) ────────────────────────────────────────

  describe("generateDevcontainer", () => {
    it("generates TypeScript devcontainer", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDevcontainer({ language: "TypeScript" });

      expect(result.type).toBe("devcontainer");
      const configFile = result.files[0];
      expect(configFile.path).toBe(".devcontainer/devcontainer.json");

      const config = JSON.parse(configFile.content);
      expect(config.image).toContain("typescript-node");
      expect(config.customizations.vscode.extensions).toContain("dbaeumer.vscode-eslint");
      expect(config.postCreateCommand).toBe("npm install");
    });

    it("generates Python devcontainer", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDevcontainer({ language: "Python", framework: "Django" });

      const config = JSON.parse(result.files[0].content);
      expect(config.image).toContain("python:3.12");
      expect(config.customizations.vscode.extensions).toContain("ms-python.python");
      expect(config.postCreateCommand).toContain("pip install");
    });

    it("generates Go devcontainer", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDevcontainer({ language: "Go" });

      const config = JSON.parse(result.files[0].content);
      expect(config.image).toContain("go:1.22");
      expect(config.customizations.vscode.extensions).toContain("golang.go");
    });

    it("includes custom features and extensions", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateDevcontainer(
        { language: "TypeScript" },
        ["ghcr.io/devcontainers/features/docker-in-docker:2"],
        ["ms-azuretools.vscode-docker"],
      );

      const config = JSON.parse(result.files[0].content);
      expect(config.features).toHaveProperty("ghcr.io/devcontainers/features/docker-in-docker:2");
      expect(config.customizations.vscode.extensions).toContain("ms-azuretools.vscode-docker");
    });
  });

  // ── generateValidationPayload (pure) ───────────────────────────────────

  describe("generateValidationPayload", () => {
    it("generates terraform validation for Azure", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateValidationPayload("terraform", "azure");

      expect(result.provider).toBe("terraform");
      expect(result.cloud).toBe("azure");
      expect(result.routing_instructions.mcp_server).toBe("terraform");
      expect(result.routing_instructions.tool_name).toBe("plan");
    });

    it("generates bicep validation for Azure", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateValidationPayload("bicep", "azure");

      expect(result.provider).toBe("bicep");
      expect(result.routing_instructions.mcp_server).toBe("azure");
      expect(result.routing_instructions.tool_name).toBe("validate_template");
    });

    it("uses custom iac directory", () => {
      const gen = new IacGenerator({} as never);
      const result = gen.generateValidationPayload("terraform", "aws", "infra/");

      expect(result.payload.directory).toBe("infra/");
    });
  });

  // ── generateTerraform (async, needs FM) ────────────────────────────────

  describe("generateTerraform", () => {
    it("generates terraform files for Azure", async () => {
      const fm = makeFileManager("# DESIGN\n\n## Architecture\nAKS cluster with PostgreSQL database and Redis cache.\nLoad balancer with CDN.");
      const gen = new IacGenerator(fm as never);
      const result = await gen.generateTerraform(".specs/001-auth", "azure");

      expect(result.provider).toBe("terraform");
      expect(result.files.length).toBe(4); // main, variables, outputs, tfvars.example
      expect(result.files[0].path).toBe("terraform/main.tf");
      expect(result.files[0].content).toContain("azurerm");
      expect(result.variables.length).toBeGreaterThan(0);
      expect(result.variables.some(v => v.name === "location")).toBe(true);
    });

    it("generates terraform for AWS", async () => {
      const fm = makeFileManager("# DESIGN\nEC2 with S3 storage.");
      const gen = new IacGenerator(fm as never);
      const result = await gen.generateTerraform(".specs/001-infra", "aws");

      expect(result.files[0].content).toContain("hashicorp/aws");
      expect(result.variables.some(v => v.name === "region")).toBe(true);
    });

    it("detects modules from design content", async () => {
      const fm = makeFileManager("# DESIGN\nVPC networking with container cluster and metric alerts dashboard.");
      const gen = new IacGenerator(fm as never);
      const result = await gen.generateTerraform(".specs/001-infra", "azure");

      expect(result.explanation).toContain("networking");
      expect(result.explanation).toContain("compute");
      expect(result.explanation).toContain("monitoring");
    });

    it("falls back to default modules for empty design", async () => {
      const fm = makeFileManager("");
      const gen = new IacGenerator(fm as never);
      const result = await gen.generateTerraform(".specs/001-empty", "azure");

      expect(result.explanation).toContain("compute");
      expect(result.explanation).toContain("networking");
    });
  });
});
