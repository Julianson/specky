/**
 * SpeckyConfig — Optional `.specky/config.yml` support.
 * Reads project-local configuration and merges with defaults.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface SpeckyConfig {
  templates_path?: string;
  default_framework?: string;
  compliance_frameworks?: string[];
  audit_enabled?: boolean;
  rate_limit?: {
    enabled?: boolean;
    max_requests_per_minute?: number;
    burst?: number;
  };
  audit?: {
    export_format?: "jsonl" | "syslog" | "otlp";
    max_file_size_mb?: number;
  };
  rbac?: {
    enabled?: boolean;
    default_role?: "viewer" | "contributor" | "admin";
  };
}

const DEFAULTS: Required<SpeckyConfig> = {
  templates_path: "",
  default_framework: "vitest",
  compliance_frameworks: ["general"],
  audit_enabled: false,
  rate_limit: { enabled: false, max_requests_per_minute: 60, burst: 10 },
  audit: { export_format: "jsonl", max_file_size_mb: 10 },
  rbac: { enabled: false, default_role: "contributor" },
};

/**
 * Load `.specky/config.yml` from workspace root. Returns defaults if not found.
 * Handles both flat keys (key: value) and nested blocks (key:\n  sub: value).
 */
export function loadConfig(workspaceRoot: string): Required<SpeckyConfig> {
  const configPath = join(workspaceRoot, ".specky", "config.yml");
  try {
    const raw = readFileSync(configPath, "utf-8");
    const flat = parseSimpleYaml(raw);
    return {
      templates_path:
        typeof flat["templates_path"] === "string"
          ? flat["templates_path"]
          : DEFAULTS.templates_path,
      default_framework:
        typeof flat["default_framework"] === "string"
          ? flat["default_framework"]
          : DEFAULTS.default_framework,
      compliance_frameworks:
        parseArrayValue(flat["compliance_frameworks"]) ||
        DEFAULTS.compliance_frameworks,
      audit_enabled:
        flat["audit_enabled"] === "true" || flat["audit_enabled"] === true
          ? true
          : DEFAULTS.audit_enabled,
      rate_limit: {
        enabled:
          flat["rate_limit.enabled"] === "true" ||
          flat["rate_limit.enabled"] === true
            ? true
            : DEFAULTS.rate_limit.enabled,
        max_requests_per_minute:
          typeof flat["rate_limit.max_requests_per_minute"] === "string"
            ? parseInt(flat["rate_limit.max_requests_per_minute"] as string, 10) ||
              DEFAULTS.rate_limit.max_requests_per_minute!
            : DEFAULTS.rate_limit.max_requests_per_minute,
        burst:
          typeof flat["rate_limit.burst"] === "string"
            ? parseInt(flat["rate_limit.burst"] as string, 10) ||
              DEFAULTS.rate_limit.burst!
            : DEFAULTS.rate_limit.burst,
      },
      audit: {
        export_format: isValidExportFormat(flat["audit.export_format"])
          ? (flat["audit.export_format"] as "jsonl" | "syslog" | "otlp")
          : DEFAULTS.audit.export_format,
        max_file_size_mb:
          typeof flat["audit.max_file_size_mb"] === "string"
            ? parseInt(flat["audit.max_file_size_mb"] as string, 10) ||
              DEFAULTS.audit.max_file_size_mb!
            : DEFAULTS.audit.max_file_size_mb,
      },
      rbac: {
        enabled:
          flat["rbac.enabled"] === "true" || flat["rbac.enabled"] === true
            ? true
            : DEFAULTS.rbac.enabled,
        default_role: isValidRole(flat["rbac.default_role"])
          ? (flat["rbac.default_role"] as "viewer" | "contributor" | "admin")
          : DEFAULTS.rbac.default_role,
      },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Parse simple YAML — flat key:value pairs plus indented blocks.
 * Indented child keys are flattened as "parent.child" dot-notation keys.
 */
function parseSimpleYaml(raw: string): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  let currentParent = "";

  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (indent === 0) {
      currentParent = key;
      if (value) {
        // Top-level key with value
        if (value === "true") result[key] = true;
        else if (value === "false") result[key] = false;
        else result[key] = value;
      }
      // else: this is a parent block key with no value — children follow
    } else {
      // Child key — store as "parent.child"
      const flatKey = `${currentParent}.${key}`;
      if (value === "true") result[flatKey] = true;
      else if (value === "false") result[flatKey] = false;
      else result[flatKey] = value;
    }
  }
  return result;
}

function isValidExportFormat(v: unknown): boolean {
  return v === "jsonl" || v === "syslog" || v === "otlp";
}

function isValidRole(v: unknown): boolean {
  return v === "viewer" || v === "contributor" || v === "admin";
}

function parseArrayValue(value: unknown): string[] | null {
  if (typeof value !== "string" || !value) return null;
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/"/g, ""))
      .filter(Boolean);
  }
  if (value.includes(",")) {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [value];
}
