/**
 * AuditLogger — Enterprise audit trail for SDD tool calls.
 * Appends JSONL entries to .specs/NNN/.audit.jsonl when audit_enabled=true.
 *
 * v3.2.0 enhancements:
 *   - Hash-chaining: each entry includes SHA-256 hash of the previous entry line
 *   - Log rotation: when file exceeds max_file_size_mb, rotates to .audit.jsonl.1
 *   - Export formats: jsonl (default), syslog (RFC 5424), otlp (stub)
 */

import { appendFile, mkdir, stat, rename, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";

export interface AuditEntry {
  timestamp: string;
  tool: string;
  spec_dir: string;
  feature_number?: string;
  phase?: string;
  result: "success" | "error";
  summary?: string;
  previous_hash: string;
}

/** Seed value for the first entry's previous_hash field */
const CHAIN_SEED = "specky-audit-v1";

/** Max rotated log files to keep */
const MAX_ROTATIONS = 3;

export class AuditLogger {
  private lastHash: string = CHAIN_SEED;

  constructor(
    private workspaceRoot: string,
    private enabled: boolean,
    private exportFormat: "jsonl" | "syslog" | "otlp" = "jsonl",
    private maxFileSizeMb: number = 10,
  ) {}

  /**
   * Log a tool call to the audit file.
   * No-ops when disabled. Never throws — audit failures must not break tool calls.
   */
  async log(entry: AuditEntry): Promise<void> {
    if (!this.enabled) return;

    try {
      const auditFile = this.resolveAuditFile(entry.spec_dir, entry.feature_number);
      await mkdir(dirname(auditFile), { recursive: true });

      // Rotate if needed before appending
      await this.rotateIfNeeded(auditFile);

      const line = JSON.stringify(entry) + "\n";

      if (this.exportFormat === "syslog") {
        await this.appendSyslog(auditFile, entry, line);
      } else if (this.exportFormat === "otlp") {
        console.error("[specky] OTLP export not yet implemented");
        await appendFile(auditFile, line, "utf-8");
      } else {
        await appendFile(auditFile, line, "utf-8");
      }

      // Advance chain: hash of the line just written
      this.lastHash = createHash("sha256").update(line.trimEnd()).digest("hex");
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
      previous_hash: this.lastHash,
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
      previous_hash: this.lastHash,
    });
  }

  /** Expose current chain hash (for testing and external verification) */
  get currentHash(): string {
    return this.lastHash;
  }

  /** Reset chain hash (for testing) */
  resetChain(): void {
    this.lastHash = CHAIN_SEED;
  }

  private resolveAuditFile(specDir: string, _featureNumber?: string): string {
    return join(this.workspaceRoot, specDir, ".audit.jsonl");
  }

  /** Rotate log files when size exceeds threshold */
  private async rotateIfNeeded(auditFile: string): Promise<void> {
    try {
      const fileStat = await stat(auditFile);
      const thresholdBytes = this.maxFileSizeMb * 1024 * 1024;
      if (fileStat.size <= thresholdBytes) return;

      // Rotate: .audit.jsonl.2 → .audit.jsonl.3, .1 → .2, current → .1
      for (let i = MAX_ROTATIONS - 1; i >= 1; i--) {
        const older = `${auditFile}.${i + 1}`;
        const newer = `${auditFile}.${i}`;
        try {
          await unlink(older);
        } catch {
          // file may not exist — ignore
        }
        try {
          await rename(newer, older);
        } catch {
          // file may not exist — ignore
        }
      }
      await rename(auditFile, `${auditFile}.1`);
    } catch {
      // File doesn't exist yet — nothing to rotate
    }
  }

  /** Write RFC 5424 syslog format to a parallel .audit.syslog file */
  private async appendSyslog(
    jsonlFile: string,
    entry: AuditEntry,
    jsonLine: string,
  ): Promise<void> {
    const syslogFile = jsonlFile.replace(".audit.jsonl", ".audit.syslog");
    // RFC 5424: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
    // PRI = facility(1=user) * 8 + severity(6=info, 3=error)
    const severity = entry.result === "error" ? 3 : 6;
    const pri = 1 * 8 + severity;
    const hostname = "specky";
    const appName = "specky-sdd";
    const procId = process.pid;
    const msgId = entry.tool;
    const msg = entry.summary ?? entry.result;
    const syslogLine =
      `<${pri}>1 ${entry.timestamp} ${hostname} ${appName} ${procId} ${msgId} - ${msg}\n`;

    await appendFile(syslogFile, syslogLine, "utf-8");
    // Also keep JSONL copy
    await appendFile(jsonlFile, jsonLine, "utf-8");
  }
}
