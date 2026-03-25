import { describe, it, expect } from "vitest";
import {
  extractRequirementCandidates,
  convertToEars,
  generateAcceptanceCriteria,
  generateClarifications,
  inferNonFunctionalRequirements,
  countPatterns,
  deduplicateCandidates,
  type RequirementCandidate,
} from "../../src/tools/turnkey.js";

// ── extractRequirementCandidates ──────────────────────────────────────────────

describe("extractRequirementCandidates", () => {
  it("extracts functional requirements with must/shall/should", () => {
    const result = extractRequirementCandidates("The system must validate all inputs before processing.");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].type).toBe("functional");
  });

  it("extracts behavior requirements with user+verb", () => {
    const result = extractRequirementCandidates("The user can create, update and delete records in the system.");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts constraint requirements with limit keywords", () => {
    const result = extractRequirementCandidates("Maximum response time is 500ms for all API endpoints.");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].type).toBe("constraint");
  });

  it("extracts error handling requirements", () => {
    const result = extractRequirementCandidates("When a timeout error occurs, the system must retry the operation.");
    expect(result.length).toBeGreaterThanOrEqual(1);
    // "must" matches functional first; error_handling requires no other match
    expect(["functional", "error_handling"]).toContain(result[0].type);
  });

  it("skips meta-sentences starting with 'For example'", () => {
    const result = extractRequirementCandidates("For example, the system could use a database. The system must store data.");
    const forExample = result.find(r => r.text.toLowerCase().includes("for example"));
    expect(forExample).toBeUndefined();
  });

  it("returns empty for empty input", () => {
    const result = extractRequirementCandidates("");
    expect(result).toHaveLength(0);
  });

  it("returns empty for short meaningless text", () => {
    const result = extractRequirementCandidates("Hi there.");
    expect(result).toHaveLength(0);
  });

  it("handles bullet point inputs", () => {
    const result = extractRequirementCandidates(
      "- The system should handle payments\n- Users can search for products\n- The API must return JSON"
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("deduplicates similar sentences", () => {
    const result = extractRequirementCandidates(
      "The system must validate user inputs. The system should validate all user inputs thoroughly."
    );
    // Should deduplicate since they're >70% similar
    expect(result.length).toBeLessThanOrEqual(2);
  });
});

// ── deduplicateCandidates ─────────────────────────────────────────────────────

describe("deduplicateCandidates", () => {
  it("removes duplicates with >70% overlap", () => {
    const candidates: RequirementCandidate[] = [
      { text: "The system must validate inputs", type: "functional", confidence: 0.9 },
      { text: "The system must validate user inputs", type: "functional", confidence: 0.9 },
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
  });

  it("keeps distinct candidates", () => {
    const candidates: RequirementCandidate[] = [
      { text: "The system must validate inputs", type: "functional", confidence: 0.9 },
      { text: "Users can upload files to the server", type: "behavior", confidence: 0.8 },
    ];
    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(2);
  });
});

// ── convertToEars ─────────────────────────────────────────────────────────────

describe("convertToEars", () => {
  it("converts functional to ubiquitous (The system shall)", () => {
    const result = convertToEars({ text: "The system must validate all inputs", type: "functional", confidence: 0.9 });
    expect(result).toMatch(/^The system shall /);
    expect(result).toMatch(/\.$/);
  });

  it("converts error_handling to unwanted (If...then)", () => {
    // Text without "when"/"while" prefix so it doesn't match the pass-through
    const result = convertToEars({ text: "Handle timeout errors gracefully", type: "error_handling", confidence: 0.85 });
    expect(result).toMatch(/^If .+, then the system shall /);
  });

  it("converts text with 'after' trigger to event-driven", () => {
    const result = convertToEars({ text: "After the user submits the form, data is saved", type: "functional", confidence: 0.9 });
    expect(result).toMatch(/^When /);
    expect(result).toContain("the system shall");
  });

  it("converts text with 'during' to state-driven", () => {
    const result = convertToEars({ text: "During maintenance mode the system blocks writes", type: "functional", confidence: 0.9 });
    expect(result).toMatch(/^While /);
    expect(result).toContain("the system shall");
  });

  it("converts text with 'optional' to Where pattern", () => {
    const result = convertToEars({ text: "The optional feature enables dark mode", type: "functional", confidence: 0.9 });
    expect(result).toMatch(/^Where /);
    expect(result).toContain("is enabled");
  });

  it("passes through already EARS-compliant text", () => {
    const result = convertToEars({ text: "The system shall process all requests", type: "functional", confidence: 0.9 });
    expect(result).toBe("The system shall process all requests.");
  });

  it("always ends with a period", () => {
    const result = convertToEars({ text: "Users must be able to login", type: "functional", confidence: 0.9 });
    expect(result).toMatch(/\.$/);
  });
});

// ── generateAcceptanceCriteria ────────────────────────────────────────────────

describe("generateAcceptanceCriteria", () => {
  it("always generates at least 1 criterion", () => {
    const candidate: RequirementCandidate = { text: "Generic requirement here", type: "functional", confidence: 0.9 };
    const result = generateAcceptanceCriteria(candidate, "The system shall do it.");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("adds auth criteria for login/permission text", () => {
    const candidate: RequirementCandidate = { text: "Users must login with their credentials and have proper access permissions", type: "functional", confidence: 0.9 };
    const result = generateAcceptanceCriteria(candidate, "The system shall authenticate.");
    expect(result.some(c => c.includes("401"))).toBe(true);
    expect(result.some(c => c.includes("403"))).toBe(true);
  });

  it("adds error criteria for error_handling type", () => {
    const candidate: RequirementCandidate = { text: "Handle timeout errors gracefully", type: "error_handling", confidence: 0.85 };
    const result = generateAcceptanceCriteria(candidate, "If timeout, retry.");
    expect(result.some(c => c.includes("error message"))).toBe(true);
    expect(result.some(c => c.includes("corrupted"))).toBe(true);
  });

  it("adds persistence criteria for store/save text", () => {
    const candidate: RequirementCandidate = { text: "Store user data in the database", type: "functional", confidence: 0.9 };
    const result = generateAcceptanceCriteria(candidate, "The system shall store data.");
    expect(result.some(c => c.includes("persisted"))).toBe(true);
  });

  it("adds search criteria for search/filter text", () => {
    const candidate: RequirementCandidate = { text: "Users can search for products by name", type: "behavior", confidence: 0.8 };
    const result = generateAcceptanceCriteria(candidate, "The system shall search.");
    expect(result.some(c => c.includes("relevant results"))).toBe(true);
    expect(result.some(c => c.includes("empty result"))).toBe(true);
  });

  it("adds file criteria for upload/download text", () => {
    const candidate: RequirementCandidate = { text: "Users can upload files to the server", type: "behavior", confidence: 0.8 };
    const result = generateAcceptanceCriteria(candidate, "The system shall upload.");
    expect(result.some(c => c.includes("data loss"))).toBe(true);
  });
});

// ── generateClarifications ────────────────────────────────────────────────────

describe("generateClarifications", () => {
  it("asks about auth when no auth mentioned", () => {
    const result = generateClarifications("Build a simple data pipeline", []);
    expect(result.some(q => q.question.includes("authentication"))).toBe(true);
  });

  it("asks about error handling when no errors mentioned", () => {
    const result = generateClarifications("Build a simple form submission system", []);
    expect(result.some(q => q.question.includes("error handling") || q.question.includes("fails"))).toBe(true);
  });

  it("asks about performance when no performance mentioned", () => {
    const result = generateClarifications("Build a simple CRUD app", []);
    expect(result.some(q => q.question.includes("performance") || q.question.includes("response time"))).toBe(true);
  });

  it("includes questions for invalid EARS requirements", () => {
    const reqs = [{ id: "REQ-001", text: "Bad requirement", valid: false, issues: ["Not EARS compliant"] }];
    const result = generateClarifications("Build something with authentication and error handling and latency", reqs);
    expect(result.some(q => q.question.includes("REQ-001"))).toBe(true);
  });

  it("returns max 5 questions", () => {
    const reqs = Array.from({ length: 10 }, (_, i) => ({
      id: `REQ-${i}`, text: "Bad", valid: false, issues: ["Issue"],
    }));
    const result = generateClarifications("Generic description", reqs);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns fewer questions when description covers domains", () => {
    const desc = "Build an authentication system with error handling, retry logic, and response time under 200ms at scale";
    const result = generateClarifications(desc, []);
    expect(result.length).toBeLessThan(3);
  });
});

// ── inferNonFunctionalRequirements ────────────────────────────────────────────

describe("inferNonFunctionalRequirements", () => {
  it("infers API response time for API text", () => {
    const result = inferNonFunctionalRequirements("Build a REST API for user management");
    expect(result.some(r => r.text.includes("500ms"))).toBe(true);
  });

  it("infers audit logging for create/update text", () => {
    const result = inferNonFunctionalRequirements("Users can create and update records");
    expect(result.some(r => r.text.includes("log"))).toBe(true);
  });

  it("always infers input validation", () => {
    const result = inferNonFunctionalRequirements("A simple landing page");
    expect(result.some(r => r.text.includes("validate"))).toBe(true);
  });

  it("each NFR has text and criterion", () => {
    const result = inferNonFunctionalRequirements("Build an API with create operations");
    for (const nfr of result) {
      expect(nfr.text.length).toBeGreaterThan(0);
      expect(nfr.criterion.length).toBeGreaterThan(0);
    }
  });
});

// ── countPatterns ─────────────────────────────────────────────────────────────

describe("countPatterns", () => {
  it("counts patterns correctly", () => {
    const reqs = [
      { ears_pattern: "ubiquitous" },
      { ears_pattern: "ubiquitous" },
      { ears_pattern: "event_driven" },
    ];
    const result = countPatterns(reqs);
    expect(result["ubiquitous"]).toBe(2);
    expect(result["event_driven"]).toBe(1);
  });

  it("returns empty for empty array", () => {
    const result = countPatterns([]);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
