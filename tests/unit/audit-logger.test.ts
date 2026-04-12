import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AuditLogger } from "../../src/services/audit-logger.js";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("AuditLogger", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "specky-audit-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("when audit is disabled", () => {
    it("does not write any file when disabled", async () => {
      const logger = new AuditLogger(tempDir, false);
      await logger.logSuccess("sdd_init", ".specs", "001", "init", "Initialized");

      const auditFile = join(tempDir, ".specs", ".audit.jsonl");
      expect(existsSync(auditFile)).toBe(false);
    });
  });

  describe("when audit is enabled", () => {
    it("creates audit file and writes JSONL entry for logSuccess", async () => {
      const logger = new AuditLogger(tempDir, true);
      await logger.logSuccess("sdd_write_spec", ".specs", "001", "specify", "Wrote SPECIFICATION.md");

      const auditFile = join(tempDir, ".specs", ".audit.jsonl");
      expect(existsSync(auditFile)).toBe(true);

      const line = readFileSync(auditFile, "utf-8").trim();
      const entry = JSON.parse(line);
      expect(entry.tool).toBe("sdd_write_spec");
      expect(entry.spec_dir).toBe(".specs");
      expect(entry.feature_number).toBe("001");
      expect(entry.phase).toBe("specify");
      expect(entry.result).toBe("success");
      expect(entry.summary).toBe("Wrote SPECIFICATION.md");
      expect(entry.timestamp).toBeTruthy();
    });

    it("creates audit file and writes JSONL entry for logError", async () => {
      const logger = new AuditLogger(tempDir, true);
      await logger.logError("sdd_write_design", ".specs", "001", "Missing SPECIFICATION.md");

      const auditFile = join(tempDir, ".specs", ".audit.jsonl");
      const line = readFileSync(auditFile, "utf-8").trim();
      const entry = JSON.parse(line);
      expect(entry.result).toBe("error");
      expect(entry.summary).toContain("Missing");
    });

    it("appends multiple entries as separate JSONL lines", async () => {
      const logger = new AuditLogger(tempDir, true);
      await logger.logSuccess("sdd_init", ".specs", "001", "init");
      await logger.logSuccess("sdd_discover", ".specs", "001", "discover");
      await logger.logSuccess("sdd_write_spec", ".specs", "001", "specify");

      const auditFile = join(tempDir, ".specs", ".audit.jsonl");
      const lines = readFileSync(auditFile, "utf-8").trim().split("\n");
      expect(lines).toHaveLength(3);

      const entries = lines.map(l => JSON.parse(l));
      expect(entries[0].tool).toBe("sdd_init");
      expect(entries[1].tool).toBe("sdd_discover");
      expect(entries[2].tool).toBe("sdd_write_spec");
    });

    it("works without feature_number (global audit)", async () => {
      const logger = new AuditLogger(tempDir, true);
      await logger.logSuccess("sdd_check_ecosystem", ".specs");

      const auditFile = join(tempDir, ".specs", ".audit.jsonl");
      expect(existsSync(auditFile)).toBe(true);

      const entry = JSON.parse(readFileSync(auditFile, "utf-8").trim());
      expect(entry.feature_number).toBeUndefined();
    });

    it("never throws even if directory creation fails", async () => {
      // Use an invalid path that will fail
      const logger = new AuditLogger("/nonexistent/root/that/cannot/be/created", true);
      // Should not throw
      await expect(logger.logSuccess("sdd_init", ".specs")).resolves.toBeUndefined();
    });
  });
});
