import { describe, it, expect } from "vitest";
import { DocumentConverter } from "../../src/services/document-converter.js";

describe("DocumentConverter", () => {
  const converter = new DocumentConverter({} as never);

  // ── convertRawText (pure) ──────────────────────────────────────────────

  describe("convertRawText", () => {
    it("converts plain text with title", () => {
      const result = converter.convertRawText("Hello world.\nSecond line.", "My Document");

      expect(result.format).toBe("txt");
      expect(result.markdown).toContain("# My Document");
      expect(result.markdown).toContain("Hello world.");
      expect(result.metadata.title).toBe("My Document");
      expect(result.word_count).toBeGreaterThan(0);
    });

    it("converts plain text without title", () => {
      const result = converter.convertRawText("Just some text here.");

      expect(result.format).toBe("txt");
      expect(result.markdown).toBe("Just some text here.");
      expect(result.word_count).toBeGreaterThan(0);
    });

    it("handles empty text", () => {
      const result = converter.convertRawText("");

      expect(result.format).toBe("txt");
      expect(result.word_count).toBe(0);
    });

    it("extracts sections from markdown-like content", () => {
      const content = "# Introduction\nSome intro.\n## Details\nMore details.";
      const result = converter.convertRawText(content, "Test");

      expect(result.metadata.sections).toBeDefined();
      expect(result.metadata.sections!.length).toBeGreaterThan(0);
    });

    it("counts words correctly", () => {
      const result = converter.convertRawText("one two three four five");
      expect(result.word_count).toBe(5);
    });

    it("handles multiline content", () => {
      const text = "Line one.\nLine two.\nLine three.";
      const result = converter.convertRawText(text, "Multi");

      expect(result.markdown).toContain("# Multi");
      expect(result.markdown).toContain("Line one.");
      expect(result.markdown).toContain("Line three.");
    });
  });
});
