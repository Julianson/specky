import { describe, it, expect } from "vitest";
import { TranscriptParser } from "../../src/services/transcript-parser.js";

const VTT_CONTENT = `WEBVTT

00:00:01.000 --> 00:00:05.000
Alice: Hello everyone, let's discuss the authentication feature.

00:00:05.500 --> 00:00:10.000
Bob: We need to support OAuth 2.0 and SAML.

00:00:10.500 --> 00:00:15.000
Alice: Agreed. We decided to use JWT tokens with 24-hour expiry.

00:00:15.500 --> 00:00:20.000
Bob: Action item: Alice will create the auth specification by Friday.

00:00:20.500 --> 00:00:25.000
Alice: The system must handle at least 1000 concurrent sessions.

00:00:25.500 --> 00:00:30.000
Bob: What about refresh tokens? Should we support them?`;

const SRT_CONTENT = `1
00:00:01,000 --> 00:00:05,000
Speaker One: We need a database migration strategy.

2
00:00:05,500 --> 00:00:10,000
Speaker Two: Let's use PostgreSQL with connection pooling.

3
00:00:10,500 --> 00:00:15,000
Speaker One: We decided to limit the API to 100 requests per minute.`;

const MD_CONTENT = `# Project Kickoff Meeting

## Attendees
- Alice
- Bob
- Charlie

## Discussion

Alice: We need to build the payment module.

Bob: The constraint is PCI-DSS compliance.

Charlie: Action item: Bob will research payment gateways.

## Decisions

- We will use Stripe as the payment provider
- The system should encrypt all card data at rest`;

const PLAIN_TEXT = `Meeting about deployment.
John: We need Docker containers.
Jane: The system must support auto-scaling.
John: Action item: Jane will set up the CI pipeline.
Let's decide: we'll use Kubernetes for orchestration.
Question: Should we use managed or self-hosted K8s?`;

describe("TranscriptParser", () => {
  const parser = new TranscriptParser({} as never);

  // ── parse VTT ──────────────────────────────────────────────────────────

  describe("parse — VTT format", () => {
    it("extracts segments with speakers and timestamps", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");

      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.segments[0].speaker).toBe("Alice");
      expect(result.segments[0].text).toContain("authentication");
      expect(result.segments[0].timestamp).toBeTruthy();
    });

    it("extracts participants", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");
      expect(result.participants).toContain("Alice");
      expect(result.participants).toContain("Bob");
    });

    it("extracts decisions", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");
      expect(result.decisions.length).toBeGreaterThan(0);
      expect(result.decisions.some(d => d.toLowerCase().includes("jwt") || d.toLowerCase().includes("decided"))).toBe(true);
    });

    it("extracts action items", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");
      expect(result.action_items.length).toBeGreaterThan(0);
    });

    it("extracts requirements", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");
      expect(result.requirements_raw.length).toBeGreaterThan(0);
      expect(result.requirements_raw.some(r => r.includes("must") || r.includes("1000"))).toBe(true);
    });

    it("extracts open questions", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");
      expect(result.open_questions.length).toBeGreaterThan(0);
    });

    it("has a title", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");
      expect(result.title).toBeTruthy();
    });
  });

  // ── parse SRT ──────────────────────────────────────────────────────────

  describe("parse — SRT format", () => {
    it("extracts segments from SRT", () => {
      const result = parser.parse(SRT_CONTENT, "srt");
      expect(result.segments.length).toBe(3);
      expect(result.segments[0].speaker).toContain("Speaker");
    });

    it("extracts decisions from SRT", () => {
      const result = parser.parse(SRT_CONTENT, "srt");
      expect(result.decisions.length).toBeGreaterThan(0);
    });
  });

  // ── parse MD ───────────────────────────────────────────────────────────

  describe("parse — Markdown format", () => {
    it("extracts segments from markdown", () => {
      const result = parser.parse(MD_CONTENT, "md");
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it("extracts constraints", () => {
      const result = parser.parse(MD_CONTENT, "md");
      expect(result.constraints_mentioned.length).toBeGreaterThan(0);
    });
  });

  // ── parse TXT ──────────────────────────────────────────────────────────

  describe("parse — plain text", () => {
    it("extracts segments from plain text", () => {
      const result = parser.parse(PLAIN_TEXT, "txt");
      expect(result.segments.length).toBeGreaterThan(0);
      expect(result.full_text.length).toBeGreaterThan(0);
    });

    it("extracts requirements from plain text", () => {
      const result = parser.parse(PLAIN_TEXT, "txt");
      expect(result.requirements_raw.length).toBeGreaterThan(0);
    });

    it("extracts action items from plain text", () => {
      const result = parser.parse(PLAIN_TEXT, "txt");
      expect(result.action_items.length).toBeGreaterThan(0);
    });
  });

  // ── toMarkdown ─────────────────────────────────────────────────────────

  describe("toMarkdown", () => {
    it("produces valid markdown output", () => {
      const analysis = parser.parse(VTT_CONTENT, "vtt");
      const md = parser.toMarkdown(analysis);

      expect(md).toContain("# Meeting Transcript:");
      expect(md).toContain("**Participants:**");
      expect(md).toContain("**Duration:**");
    });

    it("includes sections for extracted data", () => {
      const analysis = parser.parse(VTT_CONTENT, "vtt");
      const md = parser.toMarkdown(analysis);

      if (analysis.decisions.length > 0) expect(md).toContain("## Decisions");
      if (analysis.action_items.length > 0) expect(md).toContain("## Action Items");
      if (analysis.requirements_raw.length > 0) expect(md).toContain("## Requirements Identified");
      expect(md).toContain("## Full Transcript");
    });

    it("includes speaker names in transcript", () => {
      const analysis = parser.parse(VTT_CONTENT, "vtt");
      const md = parser.toMarkdown(analysis);
      expect(md).toContain("**Alice:**");
    });
  });

  // ── edge cases ─────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty content", () => {
      const result = parser.parse("", "txt");
      expect(result.segments).toBeDefined();
      expect(result.participants).toBeDefined();
      expect(result.title).toBeTruthy();
    });

    it("defaults to txt format", () => {
      const result = parser.parse("Some meeting text.");
      expect(result.segments.length).toBeGreaterThan(0);
    });
  });

  // ── Power Automate / Copilot Studio format ─────────────────────────────

  describe("parse — Power Automate MD format", () => {
    const POWER_AUTOMATE_MD = [
      "---",
      "title: Sprint Planning Meeting",
      "date: 2026-03-20",
      "author: Copilot Studio",
      "version: 1.0",
      "language: en",
      "tags: sprint, planning",
      "description: Weekly sprint planning",
      "---",
      "",
      "# Sprint Planning Meeting",
      "",
      "> This meeting covers sprint planning for the auth feature.",
      "",
      "## 1. Executive Summary",
      "",
      "- Team discussed authentication requirements",
      "- Decided on OAuth 2.0 approach",
      "",
      "## 2. Meeting Details",
      "",
      "| **Field** | **Value** |",
      "|-----------|-----------|",
      "| **Date** | 2026-03-20 |",
      "| **Participants** | Alice, Bob, Charlie |",
      "| **Organizer** | Dave |",
      "",
      "## 3. Main Topics",
      "",
      "- Authentication strategy",
      "- Token management",
      "",
      "## 4. Complete Transcription",
      "",
      "**Alice:** We need OAuth 2.0 for the login flow.",
      "**Bob:** Agreed, and we must support refresh tokens.",
      "",
      "## 5. Action Items",
      "",
      "- [ ] Alice will create the auth spec",
      "- [ ] Bob will research token storage",
    ].join("\n");

    it("extracts title from frontmatter", () => {
      const result = parser.parse(POWER_AUTOMATE_MD, "md");
      expect(result.title).toBe("Sprint Planning Meeting");
    });

    it("extracts participants from meeting details table", () => {
      const result = parser.parse(POWER_AUTOMATE_MD, "md");
      expect(result.participants.length).toBeGreaterThan(0);
    });

    it("extracts segments from transcription section", () => {
      const result = parser.parse(POWER_AUTOMATE_MD, "md");
      expect(result.segments.length).toBeGreaterThan(0);
    });

    it("extracts action items", () => {
      const result = parser.parse(POWER_AUTOMATE_MD, "md");
      expect(result.action_items.length).toBeGreaterThan(0);
    });

    it("handles simple format without frontmatter", () => {
      const simple = [
        "## Executive Summary",
        "Team discussed auth.",
        "",
        "## Action Items",
        "- [ ] Create spec",
      ].join("\n");
      const result = parser.parse(simple, "md");
      expect(result.segments.length).toBeGreaterThan(0);
    });
  });

  // ── Duration estimation ──────────────────────────────────────────────────

  describe("duration estimation", () => {
    it("estimates duration from VTT timestamps", () => {
      const result = parser.parse(VTT_CONTENT, "vtt");
      expect(result.duration_estimate).toBeTruthy();
      expect(result.duration_estimate).not.toBe("");
    });

    it("estimates duration from text volume when no timestamps", () => {
      const result = parser.parse(PLAIN_TEXT, "txt");
      expect(result.duration_estimate).toBeTruthy();
    });

    it("estimates duration from SRT timestamps", () => {
      const result = parser.parse(SRT_CONTENT, "srt");
      expect(result.duration_estimate).toBeTruthy();
    });
  });

  // ── Constraint extraction ─────────────────────────────────────────────

  describe("constraint extraction", () => {
    it("extracts constraints with constraint keywords", () => {
      const content = "Alice: The constraint is we have a maximum of 100ms response time. Bob: The limitation is 10GB storage.";
      const result = parser.parse(content, "txt");
      expect(result.constraints_mentioned.length).toBeGreaterThan(0);
    });

    it("extracts constraints from MD with PCI keyword", () => {
      const result = parser.parse(MD_CONTENT, "md");
      expect(result.constraints_mentioned.some(c => c.toLowerCase().includes("pci"))).toBe(true);
    });
  });

  // ── VTT with <v> tags ──────────────────────────────────────────────────

  describe("parse — VTT with v-tags", () => {
    it("extracts speakers from <v> tags", () => {
      const vttWithTags = [
        "WEBVTT",
        "",
        "00:00:01.000 --> 00:00:05.000",
        "<v Alice>Hello everyone.</v>",
        "",
        "00:00:05.500 --> 00:00:10.000",
        "<v Bob>Hi Alice, let's begin.</v>",
      ].join("\n");

      const result = parser.parse(vttWithTags, "vtt");
      expect(result.segments.length).toBe(2);
      expect(result.segments[0].speaker).toBe("Alice");
      expect(result.segments[1].speaker).toBe("Bob");
    });
  });
});
