import { describe, it, expect, vi } from "vitest";
import { TestGenerator } from "../../src/services/test-generator.js";
import type { TestFramework } from "../../src/services/test-generator.js";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SPEC_WITH_ACS = [
  "# SPECIFICATION",
  "",
  "## REQ-001: User Authentication",
  "The system shall authenticate users via OAuth 2.0.",
  "",
  "### Acceptance Criteria",
  "- AC-1: Verify that valid credentials return a JWT token",
  "- AC-2: Ensure expired tokens trigger re-authentication",
  "",
  "## REQ-002: Data Encryption",
  "The system shall encrypt all data at rest using AES-256.",
  "",
  "### Acceptance Criteria",
  "- AC-3: Check that stored data is encrypted",
].join("\n");

const SPEC_NO_ACS = [
  "# SPECIFICATION",
  "",
  "The system shall log all API requests.",
  "The system shall validate input before processing.",
  "The system must handle errors gracefully.",
].join("\n");

function makeFileManager(specContent: string, tasksContent = "") {
  return {
    readSpecFile: vi.fn((specDir: string, file: string) => {
      if (file.includes("SPECIFICATION")) return Promise.resolve(specContent);
      if (file.includes("TASKS")) return Promise.resolve(tasksContent);
      return Promise.reject(new Error("Not found"));
    }),
  };
}

// ── extractAcceptanceCriteria ──────────────────────────────────────────────────

describe("TestGenerator", () => {
  describe("extractAcceptanceCriteria", () => {
    it("falls back to shall/must lines when AC regex does not match", () => {
      const gen = new TestGenerator({} as never);
      const result = gen.extractAcceptanceCriteria(SPEC_WITH_ACS);

      // AC lines don't match the keyword-at-start regex, so fallback fires
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("REQ-001");
      expect(result[0].criterion).toContain("authenticate users");
      expect(result[1].id).toBe("REQ-002");
      expect(result[1].criterion).toContain("encrypt all data");
    });

    it("falls back to shall/must lines when no ACs found", () => {
      const gen = new TestGenerator({} as never);
      const result = gen.extractAcceptanceCriteria(SPEC_NO_ACS);

      expect(result.length).toBe(3);
      expect(result[0].id).toBe("REQ-001");
      expect(result[0].criterion).toContain("log all API");
      expect(result[1].criterion).toContain("validate input");
      expect(result[2].criterion).toContain("handle errors");
    });

    it("returns empty array for empty text", () => {
      const gen = new TestGenerator({} as never);
      const result = gen.extractAcceptanceCriteria("");
      expect(result).toHaveLength(0);
    });
  });

  // ── extractRequirements ───────────────────────────────────────────────────

  describe("extractRequirements", () => {
    it("extracts lines containing shall/must", () => {
      const gen = new TestGenerator({} as never);
      const reqs = gen.extractRequirements(SPEC_WITH_ACS);

      expect(reqs.length).toBe(2);
      expect(reqs[0]).toContain("authenticate users");
      expect(reqs[1]).toContain("encrypt all data");
    });

    it("skips short lines under 15 chars", () => {
      const gen = new TestGenerator({} as never);
      const reqs = gen.extractRequirements("It shall x.\nThe system shall authenticate users via OAuth.");
      expect(reqs.length).toBe(1);
      expect(reqs[0]).toContain("authenticate");
    });
  });

  // ── generate ──────────────────────────────────────────────────────────────

  describe("generate", () => {
    const frameworks: TestFramework[] = ["vitest", "jest", "playwright", "pytest", "junit", "xunit"];

    for (const fw of frameworks) {
      it(`generates stubs for ${fw}`, async () => {
        const fm = makeFileManager(SPEC_WITH_ACS);
        const gen = new TestGenerator(fm as never);

        const result = await gen.generate(".specs/001-auth", fw, "tests");

        expect(result.framework).toBe(fw);
        expect(result.total_tests).toBe(2);
        expect(result.stubs).toHaveLength(2);
        expect(result.output_file).toMatch(/^tests\//);
        expect(result.content.length).toBeGreaterThan(50);

        // Each stub has required fields
        for (const stub of result.stubs) {
          expect(stub.id).toMatch(/^TC-\d{3}$/);
          expect(stub.requirement_id).toMatch(/^REQ-\d{3}$/);
          expect(stub.description).toBeTruthy();
          expect(stub.test_code).toContain("TODO");
        }
      });
    }

    it("produces vitest-specific syntax", async () => {
      const fm = makeFileManager(SPEC_WITH_ACS);
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-auth", "vitest", "tests");

      expect(result.content).toContain('import { describe, it, expect } from "vitest"');
      expect(result.content).toContain("describe(");
      expect(result.content).toContain("it(");
      expect(result.content).toContain("expect(true).toBe(true)");
    });

    it("produces playwright-specific syntax", async () => {
      const fm = makeFileManager(SPEC_WITH_ACS);
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-auth", "playwright", "tests");

      expect(result.content).toContain("@playwright/test");
      expect(result.content).toContain("test.describe(");
      expect(result.content).toContain("async ({ page })");
    });

    it("produces pytest-specific syntax", async () => {
      const fm = makeFileManager(SPEC_WITH_ACS);
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-auth", "pytest", "tests");

      expect(result.content).toContain("import pytest");
      expect(result.content).toContain("class Test");
      expect(result.content).toContain("def test_");
      expect(result.content).toContain("assert True");
    });

    it("produces junit-specific syntax", async () => {
      const fm = makeFileManager(SPEC_WITH_ACS);
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-auth", "junit", "tests");

      expect(result.content).toContain("org.junit.jupiter");
      expect(result.content).toContain("@Test");
      expect(result.content).toContain("assertTrue(true)");
    });

    it("produces xunit-specific syntax", async () => {
      const fm = makeFileManager(SPEC_WITH_ACS);
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-auth", "xunit", "tests");

      expect(result.content).toContain("using Xunit");
      expect(result.content).toContain("[Fact]");
      expect(result.content).toContain("Assert.True(true)");
    });

    it("handles spec with no acceptance criteria via fallback", async () => {
      const fm = makeFileManager(SPEC_NO_ACS);
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-basic", "vitest", "tests");

      expect(result.total_tests).toBe(3);
      expect(result.stubs[0].requirement_id).toBe("REQ-001");
    });

    it("handles empty spec gracefully", async () => {
      const fm = makeFileManager("");
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-empty", "vitest", "tests");

      expect(result.total_tests).toBe(0);
      expect(result.stubs).toHaveLength(0);
      expect(result.content).toContain("describe(");
    });

    it("includes header with feature name and date", async () => {
      const fm = makeFileManager(SPEC_WITH_ACS);
      const gen = new TestGenerator(fm as never);
      const result = await gen.generate(".specs/001-auth", "vitest", "tests");

      expect(result.content).toContain("Auto-generated test stubs from Specky SDD");
      expect(result.content).toContain("Framework: vitest");
    });
  });
});
