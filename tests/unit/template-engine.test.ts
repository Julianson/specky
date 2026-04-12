import { describe, it, expect } from "vitest";
import { TemplateEngine } from "../../src/services/template-engine.js";

// TemplateEngine requires a FileManager in the constructor but the pure methods
// under test here never call it, so we pass a dummy object.
const dummyFm = {} as never;

describe("TemplateEngine", () => {
  let engine: TemplateEngine;

  // ── replaceVariables ───────────────────────────────────────────────────────
  describe("replaceVariables", () => {
    beforeEach(() => {
      engine = new TemplateEngine(dummyFm);
    });

    it("replaces a simple {{variable}} placeholder", () => {
      const result = engine.replaceVariables("Hello {{name}}!", { name: "World" });
      expect(result).toBe("Hello World!");
    });

    it("replaces multiple distinct placeholders", () => {
      const result = engine.replaceVariables("{{a}} + {{b}} = {{c}}", { a: "1", b: "2", c: "3" });
      expect(result).toBe("1 + 2 = 3");
    });

    it("replaces the same placeholder appearing more than once", () => {
      const result = engine.replaceVariables("{{x}} and {{x}}", { x: "foo" });
      expect(result).toBe("foo and foo");
    });

    it("emits [TODO: key] for missing variables", () => {
      const result = engine.replaceVariables("{{missing}}", {});
      expect(result).toBe("[TODO: missing]");
    });

    it("joins array values with ', ' for simple {{var}} syntax", () => {
      const result = engine.replaceVariables("Tags: {{tags}}", { tags: ["a", "b", "c"] });
      expect(result).toBe("Tags: a, b, c");
    });

    it("handles {{#each key}}{{this}}{{/each}} blocks with an array", () => {
      const template = "{{#each items}}- {{this}}\n{{/each}}";
      const result = engine.replaceVariables(template, { items: ["one", "two", "three"] });
      expect(result).toContain("- one");
      expect(result).toContain("- two");
      expect(result).toContain("- three");
    });

    it("emits [TODO: key] in #each block when value is not an array", () => {
      const template = "{{#each steps}}{{this}}{{/each}}";
      const result = engine.replaceVariables(template, { steps: "not-an-array" });
      expect(result).toBe("[TODO: steps]");
    });

    it("returns template unchanged when context is empty and no placeholders", () => {
      const template = "No placeholders here.";
      expect(engine.replaceVariables(template, {})).toBe("No placeholders here.");
    });
  });

  // ── generateFrontmatter ────────────────────────────────────────────────────
  describe("generateFrontmatter", () => {
    beforeEach(() => {
      engine = new TemplateEngine(dummyFm);
    });

    it("starts and ends with ---", () => {
      const fm = engine.generateFrontmatter({ title: "My Spec", feature_id: "F-001" });
      expect(fm).toMatch(/^---\n/);
      expect(fm).toMatch(/\n---$/);
    });

    it("includes title and feature_id when provided", () => {
      const fm = engine.generateFrontmatter({ title: "Auth Service", feature_id: "F-002" });
      expect(fm).toContain('title: "Auth Service"');
      expect(fm).toContain('feature_id: "F-002"');
    });

    it("defaults version to 1.0.0 when not provided", () => {
      const fm = engine.generateFrontmatter({ title: "X" });
      expect(fm).toContain('version: "1.0.0"');
    });

    it("uses provided version when specified", () => {
      const fm = engine.generateFrontmatter({ title: "X", version: "2.3.1" });
      expect(fm).toContain('version: "2.3.1"');
    });

    it("defaults author to 'SDD Pipeline' when not provided", () => {
      const fm = engine.generateFrontmatter({ title: "X" });
      expect(fm).toContain('author: "SDD Pipeline"');
    });

    it("uses provided author when specified", () => {
      const fm = engine.generateFrontmatter({ title: "X", author: "Alice" });
      expect(fm).toContain('author: "Alice"');
    });

    it("defaults status to 'Draft' when not provided", () => {
      const fm = engine.generateFrontmatter({ title: "X" });
      expect(fm).toContain('status: "Draft"');
    });

    it("includes a date field", () => {
      const fm = engine.generateFrontmatter({ title: "X" });
      expect(fm).toContain("date:");
    });

    it("handles array values in frontmatter (e.g. tags)", () => {
      const fm = engine.generateFrontmatter({
        title: "X",
        tags: ["auth", "api"] as unknown as string,
      });
      // Array should be serialised in some valid form — confirm no crash
      expect(typeof fm).toBe("string");
    });
  });

  // ── Custom templates (T-066) ──────────────────────────────────────────────
  describe("custom templates directory (T-066)", () => {
    it("accepts a custom templates path in constructor without throwing", () => {
      const fm = {
        workspaceRoot: "/tmp/test-workspace",
      } as never;
      // Should not throw even if path doesn't exist (errors only occur on render)
      expect(() => new TemplateEngine(fm, ".specky/templates")).not.toThrow();
    });

    it("uses built-in templates when no custom path is set", () => {
      const fm = { workspaceRoot: "/tmp" } as never;
      const eng = new TemplateEngine(fm);
      // No custom path — should load from built-in templates directory normally
      // This indirectly verifies the constructor default branch
      expect(eng).toBeInstanceOf(TemplateEngine);
    });

    it("uses built-in templates when custom path is empty string", () => {
      const fm = { workspaceRoot: "/tmp" } as never;
      const eng = new TemplateEngine(fm, "");
      expect(eng).toBeInstanceOf(TemplateEngine);
    });
  });
});
