import { describe, it, expect, vi } from "vitest";
import { CodebaseScanner } from "../../src/services/codebase-scanner.js";

// ── Helpers ────────────────────────────────────────────────────────────────────
function makeFileManager(manifests: Record<string, string> = {}) {
  return {
    readProjectFile: vi.fn().mockImplementation((file: string) => {
      const content = manifests[file];
      if (content !== undefined) return Promise.resolve(content);
      throw new Error(`ENOENT: no such file: ${file}`);
    }),
    scanDirectory: vi.fn().mockResolvedValue({ name: ".", type: "dir", children: [] }),
  };
}

const PKG_TS = JSON.stringify({
  dependencies: { typescript: "^5.0.0", express: "^4.0.0" },
  devDependencies: {},
});

const PKG_JS_REACT = JSON.stringify({
  dependencies: { react: "^18.0.0" },
  devDependencies: {},
});

const PKG_JS_NEXT = JSON.stringify({
  dependencies: { next: "^14.0.0" },
  devDependencies: {},
});

const REQUIREMENTS_TXT = "flask==3.0.0\nrequests>=2.28";
const PYPROJECT_TOML = '[tool.poetry]\nname = "myapp"\n[tool.poetry.dependencies]\npython = "^3.11"';
const GO_MOD = "module github.com/example/myapp\n\ngo 1.21";

// ── Tests ──────────────────────────────────────────────────────────────────────
describe("CodebaseScanner", () => {
  // ── detectTechStack — package.json ─────────────────────────────────────────
  describe("detectTechStack — TypeScript / Node.js (package.json)", () => {
    it("detects TypeScript when typescript is in dependencies", async () => {
      const scanner = new CodebaseScanner(makeFileManager({ "package.json": PKG_TS }) as never);
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("TypeScript");
      expect(stack.runtime).toBe("Node.js");
      expect(stack.package_manager).toBe("npm");
    });

    it("detects Express framework alongside TypeScript", async () => {
      const scanner = new CodebaseScanner(makeFileManager({ "package.json": PKG_TS }) as never);
      const stack = await scanner.detectTechStack();
      expect(stack.framework).toBe("Express");
    });

    it("detects React for JS project with react dependency", async () => {
      const scanner = new CodebaseScanner(makeFileManager({ "package.json": PKG_JS_REACT }) as never);
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("JavaScript");
      expect(stack.framework).toBe("React");
    });

    it("detects Next.js framework", async () => {
      const scanner = new CodebaseScanner(makeFileManager({ "package.json": PKG_JS_NEXT }) as never);
      const stack = await scanner.detectTechStack();
      expect(stack.framework).toBe("Next.js");
    });

    it("handles malformed package.json gracefully — falls back to JavaScript", async () => {
      const scanner = new CodebaseScanner(
        makeFileManager({ "package.json": "not_valid_json{" }) as never
      );
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("JavaScript");
    });
  });

  // ── detectTechStack — Python ───────────────────────────────────────────────
  describe("detectTechStack — Python (requirements.txt / pyproject.toml)", () => {
    it("detects Python from requirements.txt", async () => {
      const scanner = new CodebaseScanner(
        makeFileManager({ "requirements.txt": REQUIREMENTS_TXT }) as never
      );
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("Python");
    });

    it("detects Python from pyproject.toml", async () => {
      const scanner = new CodebaseScanner(
        makeFileManager({ "pyproject.toml": PYPROJECT_TOML }) as never
      );
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("Python");
    });
  });

  // ── detectTechStack — Go ───────────────────────────────────────────────────
  describe("detectTechStack — Go (go.mod)", () => {
    it("detects Go from go.mod", async () => {
      const scanner = new CodebaseScanner(makeFileManager({ "go.mod": GO_MOD }) as never);
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("Go");
    });
  });

  // ── detectTechStack — Rust / Java ─────────────────────────────────────────
  describe("detectTechStack — Rust and Java manifests", () => {
    it("detects Rust from Cargo.toml", async () => {
      const scanner = new CodebaseScanner(
        makeFileManager({ "Cargo.toml": '[package]\nname = "app"' }) as never
      );
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("Rust");
      expect(stack.package_manager).toBe("cargo");
    });

    it("detects Java (maven) from pom.xml", async () => {
      const scanner = new CodebaseScanner(
        makeFileManager({ "pom.xml": "<project></project>" }) as never
      );
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("Java");
      expect(stack.package_manager).toBe("maven");
    });

    it("detects Java (gradle) from build.gradle", async () => {
      const scanner = new CodebaseScanner(
        makeFileManager({ "build.gradle": "apply plugin: 'java'" }) as never
      );
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("Java");
      expect(stack.package_manager).toBe("gradle");
    });
  });

  // ── detectTechStack — unknown ──────────────────────────────────────────────
  describe("detectTechStack — unknown project", () => {
    it("returns unknown when no manifest files are found", async () => {
      const scanner = new CodebaseScanner(makeFileManager() as never);
      const stack = await scanner.detectTechStack();
      expect(stack.language).toBe("unknown");
      expect(stack.package_manager).toBe("unknown");
      expect(stack.runtime).toBe("unknown");
    });
  });

  // ── scan ───────────────────────────────────────────────────────────────────
  describe("scan", () => {
    it("returns a summary with total_files and total_dirs", async () => {
      const fm = makeFileManager({ "package.json": PKG_TS });
      fm.scanDirectory = vi.fn().mockResolvedValue({
        name: ".",
        type: "dir",
        children: [
          { name: "src", type: "dir", children: [{ name: "index.ts", type: "file" }] },
          { name: "README.md", type: "file" },
        ],
      });
      const scanner = new CodebaseScanner(fm as never);
      const summary = await scanner.scan();

      expect(summary).toHaveProperty("tree");
      expect(summary).toHaveProperty("tech_stack");
      expect(typeof summary.total_files).toBe("number");
      expect(typeof summary.total_dirs).toBe("number");
      expect(summary.total_files).toBeGreaterThan(0);
    });
  });
});
