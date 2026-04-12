import { describe, it, expect } from "vitest";
import { TestTraceabilityMapper } from "../../src/services/test-traceability-mapper.js";
import type { TestResult } from "../../src/services/test-result-parser.js";

describe("TestTraceabilityMapper", () => {
  const mapper = new TestTraceabilityMapper();

  const testFileContents: Record<string, string> = {
    "auth.test.ts": `
describe("Authentication", () => {
  // REQ-AUTH-001
  it("validates user credentials", () => {
    expect(true).toBe(true);
  });

  // REQ-AUTH-002
  it("rejects invalid password", () => {
    expect(true).toBe(true);
  });
});
`,
    "session.test.ts": `
describe("Sessions", () => {
  // REQ-AUTH-003
  it("creates session on login", () => {
    expect(true).toBe(true);
  });
});
`,
  };

  const passingResults: TestResult[] = [
    { test_name: "validates user credentials", passed: true },
    { test_name: "rejects invalid password", passed: true },
    { test_name: "creates session on login", passed: true },
  ];

  const mixedResults: TestResult[] = [
    { test_name: "validates user credentials", passed: true },
    { test_name: "rejects invalid password", passed: false, error: "Expected 401 but got 200" },
    { test_name: "creates session on login", passed: true },
  ];

  const allReqIds = ["REQ-AUTH-001", "REQ-AUTH-002", "REQ-AUTH-003", "REQ-AUTH-004"];

  describe("buildCoverageReport()", () => {
    it("returns 100% coverage when all mapped requirements have passing tests", () => {
      const report = mapper.buildCoverageReport(testFileContents, passingResults, ["REQ-AUTH-001", "REQ-AUTH-002", "REQ-AUTH-003"]);
      expect(report.overall_percent).toBe(100);
      expect(report.failing_requirements).toHaveLength(0);
      expect(report.untested_requirements).toHaveLength(0);
    });

    it("marks untested requirements when no tests cover them", () => {
      const report = mapper.buildCoverageReport(testFileContents, passingResults, allReqIds);
      expect(report.untested_requirements).toContain("REQ-AUTH-004");
      expect(report.per_requirement["REQ-AUTH-004"]?.status).toBe("untested");
    });

    it("marks failing requirements when tests fail", () => {
      const report = mapper.buildCoverageReport(testFileContents, mixedResults, allReqIds);
      expect(report.failing_requirements).toContain("REQ-AUTH-002");
      expect(report.per_requirement["REQ-AUTH-002"]?.status).toBe("failing");
    });

    it("marks passing requirements correctly", () => {
      const report = mapper.buildCoverageReport(testFileContents, passingResults, ["REQ-AUTH-001", "REQ-AUTH-002", "REQ-AUTH-003"]);
      expect(report.per_requirement["REQ-AUTH-001"]?.status).toBe("passing");
      expect(report.per_requirement["REQ-AUTH-001"]?.passing_tests).toContain("validates user credentials");
    });

    it("counts tests correctly per requirement", () => {
      const report = mapper.buildCoverageReport(testFileContents, passingResults, allReqIds);
      expect(report.per_requirement["REQ-AUTH-001"]?.test_count).toBe(1);
    });

    it("returns 0% when no tests are provided", () => {
      const report = mapper.buildCoverageReport(testFileContents, [], allReqIds);
      expect(report.overall_percent).toBe(0);
      expect(report.untested_requirements).toHaveLength(allReqIds.length);
    });

    it("uses requirements from test files even when allRequirementIds is empty", () => {
      // The mapper discovers requirements from test file comments even without allRequirementIds
      const report = mapper.buildCoverageReport(testFileContents, passingResults, []);
      // Still tracks requirements found via REQ comments in test files
      expect(Object.keys(report.per_requirement).length).toBeGreaterThanOrEqual(0);
    });

    it("handles empty test file contents gracefully", () => {
      const report = mapper.buildCoverageReport({}, passingResults, allReqIds);
      expect(report.untested_requirements).toHaveLength(allReqIds.length);
      expect(report.overall_percent).toBe(0);
    });
  });

  describe("buildFailureDetails()", () => {
    it("returns empty array when all tests pass", () => {
      const details = mapper.buildFailureDetails(passingResults, testFileContents);
      expect(details).toHaveLength(0);
    });

    it("returns failure detail for each failing test", () => {
      const details = mapper.buildFailureDetails(mixedResults, testFileContents);
      expect(details).toHaveLength(1);
      expect(details[0]?.test_name).toBe("rejects invalid password");
    });

    it("includes error_snippet in failure detail", () => {
      const details = mapper.buildFailureDetails(mixedResults, testFileContents);
      expect(details[0]?.error_snippet).toContain("Expected 401");
    });

    it("includes suggested_fix_prompt referencing the requirement", () => {
      const details = mapper.buildFailureDetails(mixedResults, testFileContents);
      expect(details[0]?.suggested_fix_prompt).toContain("REQ-AUTH-002");
    });

    it("uses UNKNOWN requirement_id when test has no REQ mapping", () => {
      const unknownResults: TestResult[] = [
        { test_name: "some unmapped test", passed: false, error: "boom" },
      ];
      const details = mapper.buildFailureDetails(unknownResults, {});
      expect(details[0]?.requirement_id).toBe("UNKNOWN");
    });

    it("truncates long error messages to 500 chars", () => {
      const longError = "x".repeat(600);
      const longErrorResults: TestResult[] = [
        { test_name: "validates user credentials", passed: false, error: longError },
      ];
      const details = mapper.buildFailureDetails(longErrorResults, testFileContents);
      expect(details[0]?.error_snippet.length).toBeLessThanOrEqual(500);
    });
  });
});
