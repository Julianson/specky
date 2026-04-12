import { describe, it, expect } from "vitest";
import { TestResultParser } from "../../src/services/test-result-parser.js";

describe("TestResultParser", () => {
  const parser = new TestResultParser();

  describe("Vitest JSON format", () => {
    const vitestJson = JSON.stringify({
      testResults: [{
        assertionResults: [
          { name: "test passes", status: "passed", duration: 5 },
          { name: "test fails", status: "failed", failureMessages: ["Expected 1 to be 2"], duration: 3 },
        ],
      }],
    });

    it("parses passing tests", () => {
      const results = parser.parse(vitestJson);
      const passing = results.find((r) => r.test_name === "test passes");
      expect(passing?.passed).toBe(true);
    });

    it("parses failing tests with error", () => {
      const results = parser.parse(vitestJson);
      const failing = results.find((r) => r.test_name === "test fails");
      expect(failing?.passed).toBe(false);
      expect(failing?.error).toContain("Expected 1 to be 2");
    });

    it("captures duration_ms", () => {
      const results = parser.parse(vitestJson);
      expect(results[0]?.duration_ms).toBe(5);
    });
  });

  describe("pytest JSON format", () => {
    const pytestJson = JSON.stringify({
      tests: [
        { nodeid: "test_login.py::test_valid_login", outcome: "passed", duration: 0.1 },
        { nodeid: "test_login.py::test_invalid", outcome: "failed", message: "AssertionError: False is not True" },
      ],
    });

    it("parses passing pytest tests", () => {
      const results = parser.parse(pytestJson);
      expect(results.find((r) => r.test_name.includes("test_valid_login"))?.passed).toBe(true);
    });

    it("parses failing pytest tests with error", () => {
      const results = parser.parse(pytestJson);
      const failing = results.find((r) => r.test_name.includes("test_invalid"));
      expect(failing?.passed).toBe(false);
      expect(failing?.error).toContain("AssertionError");
    });
  });

  describe("JUnit XML format", () => {
    const junitXml = `<testsuite>
      <testcase name="login test" classname="LoginTest" time="0.5"/>
      <testcase name="failing test" classname="LoginTest" time="0.1">
        <failure type="AssertionError">Expected true but got false</failure>
      </testcase>
    </testsuite>`;

    it("parses passing JUnit tests", () => {
      const results = parser.parse(junitXml);
      expect(results.find((r) => r.test_name === "login test")?.passed).toBe(true);
    });

    it("parses failing JUnit tests with error", () => {
      const results = parser.parse(junitXml);
      const failing = results.find((r) => r.test_name === "failing test");
      expect(failing?.passed).toBe(false);
      expect(failing?.error).toContain("Expected true but got false");
    });

    it("captures duration from time attribute", () => {
      const results = parser.parse(junitXml);
      expect(results.find((r) => r.test_name === "login test")?.duration_ms).toBe(500);
    });
  });

  describe("edge cases", () => {
    it("returns [] for empty string", () => expect(parser.parse("")).toEqual([]));
    it("returns [] for invalid JSON", () => expect(parser.parse("not json")).toEqual([]));
    it("returns [] for empty array", () => expect(parser.parse("[]")).toEqual([]));
  });
});
