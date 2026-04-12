/**
 * AuditLogger — Enterprise audit trail for SDD tool calls.
 * Appends JSONL entries to .specs/NNN/.audit.jsonl when audit_enabled=true.
 * Each entry records: tool, timestamp, spec_dir, result summary, phase.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

export interface AuditEntry {
  timestamp: string;
  tool: string;
  spec_dir: string;
  feature_number?: string;
  phase?: string;
  result: "success" | "error";
  summary?: string;
}

export class AuditLogger {
  constructor(
    private workspaceRoot: string,
    private enabled: boolean,
  ) {}

  /**
   * Log a tool call to .specs/NNN/.audit.jsonl.
   * No-ops when audit is disabled. Never throws — audit failures must not break tool calls.
   */
  async log(entry: AuditEntry): Promise<void> {
    if (!this.enabled) return;

    try {
      const auditFile = this.resolveAuditFile(entry.spec_dir, entry.feature_number);
      await mkdir(dirname(auditFile), { recursive: true });
      const line = JSON.stringify(entry) + "\n";
      await appendFile(auditFile, line, "utf-8");
    } catch {
      // Audit failures must never break the tool call — silently ignore
    }
  }

  /** Convenience: log a successful tool call */
  async logSuccess(
    tool: string,
    specDir: string,
    featureNumber?: string,
    phase?: string,
    summary?: string,
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      tool,
      spec_dir: specDir,
      feature_number: featureNumber,
      phase,
      result: "success",
      summary,
    });
  }

  /** Convenience: log a failed tool call */
  async logError(
    tool: string,
    specDir: string,
    featureNumber?: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      tool,
      spec_dir: specDir,
      feature_number: featureNumber,
      result: "error",
      summary: errorMessage,
    });
  }

  private resolveAuditFile(specDir: string, featureNumber?: string): string {
    if (featureNumber) {
      // Feature-scoped: .specs/001-feature/.audit.jsonl
      return join(this.workspaceRoot, specDir, `.audit.jsonl`);
    }
    // Global fallback: .specs/.audit.jsonl
    return join(this.workspaceRoot, specDir, ".audit.jsonl");
  }
}
