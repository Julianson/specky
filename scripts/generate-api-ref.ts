#!/usr/bin/env node
/**
 * generate-api-ref.ts — Auto-generate docs/API_REFERENCE.md
 *
 * Reads all tool registration files in src/tools/, extracts tool names,
 * titles, descriptions, and input schemas, then writes a complete
 * Markdown table to docs/API_REFERENCE.md.
 *
 * Usage:
 *   npx tsx scripts/generate-api-ref.ts
 *   npx ts-node scripts/generate-api-ref.ts
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const toolsDir = join(rootDir, "src", "tools");
const outputPath = join(rootDir, "docs", "API_REFERENCE.md");

interface ToolEntry {
  name: string;
  title: string;
  description: string;
  inputs: string[];
  category: string;
}

function extractTools(source: string, fileName: string): ToolEntry[] {
  const tools: ToolEntry[] = [];
  // Match server.registerTool("name", { title, description, inputSchema }, handler)
  const toolRegex = /server\.registerTool\(\s*["']([^"']+)["']\s*,\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
  let match: RegExpExecArray | null;

  while ((match = toolRegex.exec(source)) !== null) {
    const name = match[1] ?? "";
    const body = match[2] ?? "";

    const titleMatch = body.match(/title:\s*["']([^"']+)["']/);
    const descMatch = body.match(/description:\s*\n?\s*["'`]([^"'`]+(?:\n[^"'`]+)*?)["'`]/s);
    const title = titleMatch ? titleMatch[1] : name;
    const description = descMatch
      ? descMatch[1].replace(/\s+\+\s*\n\s*["']/g, " ").replace(/["']\s*\+\s*/g, "").trim().replace(/\s+/g, " ")
      : "";

    // Extract input param names from inputSchema references
    const schemaRef = body.match(/inputSchema:\s*(\w+)/);
    const inputs = extractInputNames(source, schemaRef?.[1] ?? "");

    // Derive category from file name
    const category = categoryFromFile(fileName);

    tools.push({ name, title, description, inputs, category });
  }
  return tools;
}

function extractInputNames(source: string, schemaVarName: string): string[] {
  if (!schemaVarName) return [];
  // Find z.object({ ... }) for the named schema
  const schemaRegex = new RegExp(
    `(?:const|export const)\\s+${schemaVarName}\\s*=\\s*z\\.object\\(\\{([^}]+)\\}`,
    "s",
  );
  const m = source.match(schemaRegex);
  if (!m) return [];
  const body = m[1] ?? "";
  return [...body.matchAll(/^\s{2}(\w+):/gm)].map((x) => x[1] ?? "").filter(Boolean);
}

function categoryFromFile(fileName: string): string {
  const map: Record<string, string> = {
    "pipeline.ts": "Pipeline",
    "analysis.ts": "Pipeline",
    "utility.ts": "Utility",
    "transcript.ts": "Transcript",
    "input.ts": "Input & Conversion",
    "quality.ts": "Quality & Validation",
    "visualization.ts": "Visualization",
    "infrastructure.ts": "Infrastructure as Code",
    "environment.ts": "Dev Environment",
    "integration.ts": "Integration & Export",
    "documentation.ts": "Documentation",
    "testing.ts": "Testing",
    "pbt.ts": "Property-Based Testing",
    "turnkey.ts": "Turnkey",
    "checkpoint.ts": "Checkpointing",
    "metrics.ts": "Metrics",
  };
  return map[fileName] ?? "Other";
}

function buildMarkdown(tools: ToolEntry[]): string {
  const byCategory = new Map<string, ToolEntry[]>();
  for (const tool of tools) {
    const cat = byCategory.get(tool.category) ?? [];
    cat.push(tool);
    byCategory.set(tool.category, cat);
  }

  const lines: string[] = [
    "# Specky MCP Server — API Reference",
    "",
    `> Auto-generated on ${new Date().toISOString().slice(0, 10)} — do not edit manually.`,
    `> Source: \`scripts/generate-api-ref.ts\``,
    "",
    `**Total tools: ${tools.length}**`,
    "",
  ];

  // TOC
  lines.push("## Categories", "");
  for (const [cat, entries] of byCategory) {
    lines.push(`- [${cat}](#${cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}) (${entries.length} tools)`);
  }
  lines.push("");

  // Per-category tables
  for (const [cat, entries] of byCategory) {
    const anchor = cat.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    lines.push(`## ${cat} {#${anchor}}`, "");
    lines.push("| Tool | Title | Description | Inputs |");
    lines.push("|------|-------|-------------|--------|");
    for (const t of entries) {
      const desc = t.description.replace(/\|/g, "\\|").slice(0, 120) + (t.description.length > 120 ? "…" : "");
      const inputs = t.inputs.length > 0 ? `\`${t.inputs.join("`, `")}\`` : "—";
      lines.push(`| \`${t.name}\` | ${t.title} | ${desc} | ${inputs} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

const toolFiles = readdirSync(toolsDir)
  .filter((f) => f.endsWith(".ts") && f !== "response-builder.ts");

const allTools: ToolEntry[] = [];

for (const file of toolFiles) {
  const source = readFileSync(join(toolsDir, file), "utf8");
  const tools = extractTools(source, file);
  allTools.push(...tools);
}

// Sort by category, then by tool name
allTools.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

const markdown = buildMarkdown(allTools);
writeFileSync(outputPath, markdown, "utf8");

console.log(`API Reference written to docs/API_REFERENCE.md (${allTools.length} tools)`);
