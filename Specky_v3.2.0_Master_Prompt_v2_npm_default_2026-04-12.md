---
title: "Specky v3.2.0 — Master Implementation Prompt for Claude Code (v2)"
description: "Complete prompt for Claude Code: documentation fixes, npm install -g as default, enterprise security improvements, MCP best practices."
author: "Paula Silva"
date: "2026-04-12"
version: "2.0.0"
status: "ready-to-execute"
tags: ["specky", "claude-code", "enterprise", "security", "MCP", "npm"]
target_version: "3.2.0"
change_from_v1: "npm install -g is now the recommended default. npx demoted to convenience/CI option. All MCP config examples updated."
---

# Specky v3.2.0 — Master Implementation Prompt (v2)

> **Key change from v1:** `npm install -g specky-sdd` is now the recommended default.
> `npx` is documented as a convenience alternative, not the primary path.
>
> Copy everything between `---START---` and `---END---` into Claude Code.

---

## ---START---

```
You are working in the paulasilvatech/specky repository. Current version is 3.1.0 (published 2026-04-12).

This prompt has TWO PARTS executed in sequence:
- PART A: Fix documentation inconsistencies + migrate default from npx to npm install -g
- PART B: Implement enterprise security improvements for v3.2.0 (code + docs + tests)

Read CLAUDE.md and CONTRIBUTING.md FIRST to understand the codebase conventions before writing any code.

═══════════════════════════════════════════════════════════════
PART A — DOCUMENTATION FIXES + NPM DEFAULT MIGRATION
═══════════════════════════════════════════════════════════════

GROUND TRUTH numbers for v3.1.0:
- Tools: 56 | Services: 26 | Tests: 507 | Test files: 30
- Hooks: 10 | Phases: 10 | Templates: 22 | Commands: 12 | Agents: 5

CRITICAL CHANGE: The default installation method is now `npm install -g specky-sdd`.
npx is still supported but is NO LONGER the primary recommended method.

Reason: npx downloads and executes from the registry on every invocation with no lockfile
and no hash verification. For enterprise supply chain compliance (CoSAI, OWASP MCP Top 10,
npm security best practices by Liran Tal/Snyk), version-pinned global install is safer.

Fix ALL stale references. DO NOT modify CHANGELOG.md (historical record) or source code (.ts).

───────────────────────────────────────────────────────────────
A1–A7: STALE NUMBER FIXES
───────────────────────────────────────────────────────────────

FIX A1: README.md
- "53 validated tools" → "56 validated tools" (What is Specky? section)
- "[All 56 Tools](#all-53-tools)" → "[All 56 Tools](#all-56-tools)" (TOC anchor + heading)
- "321 unit tests" → "507 unit tests" (Quality Gates section)
- "292 tests coverage" → "507 tests" (Development section comment)
- "### v3.0 (current)" → "### v3.1 (current)" (Roadmap)
- In v3.1 current table, "321 unit tests" → "507 unit tests"
- Add to v3.1 current table:
  | Intelligence layer: model routing hints on all tools | Stable |
  | Context tiering: Hot/Domain/Cold with token savings | Stable |
  | Cognitive debt metrics at LGTM gates | Stable |
  | Test traceability: REQ-ID → test coverage mapping | Stable |
  | Intent drift detection with amendment suggestions | Stable |
  | 10 automation hooks (2 blocking) | Stable |
  | SBOM + cosign signing on Docker image | Stable |
  | JSONL audit logger (optional) | Stable |
- Rename "### v3.1+ (planned)" → "### v3.2+ (planned)"
- Remove shipped items from planned. Keep: HTTP auth, Observability, i18n, RBAC, Centralized audit, Multi-tenant, Rate limiting, SSO/SAML

FIX A2: CLAUDE.md
- "includes 24 services" → "includes 26 services" (Section 1)
- "7 executable automation hooks" → "10 executable automation hooks" (Section 1)

FIX A3: GETTING-STARTED.md
- "Specky v2.3.1 provides 52 MCP tools" → "Specky v3.1.0 provides 56 MCP tools"

FIX A4: ONBOARDING.md
- "all 52 tools" → "all 56 tools"

FIX A5: CONTRIBUTING.md
- Any "53 tools" → "56 tools"

FIX A6: PUBLISH.md
- "specky-sdd-2.3.1.tgz" → "specky-sdd-3.1.0.tgz" (both occurrences)

FIX A7: SYSTEM-DESIGN.md
- "53 MCP tools" → "56 MCP tools" (footer)

───────────────────────────────────────────────────────────────
A8: MIGRATE DEFAULT FROM NPX TO NPM INSTALL -G
───────────────────────────────────────────────────────────────

This is the most impactful documentation change. Apply consistently across ALL files.

The new installation hierarchy is:
  1. npm install -g specky-sdd  (RECOMMENDED — pinned version, offline after install)
  2. npx -y specky-sdd          (convenience — auto-latest, requires internet)
  3. Docker                      (CI/CD, shared servers, no Node.js required)

=== README.md ===

In the Quick Start section, restructure so npm install -g comes FIRST:

The Quick Start "Per-repo" expandable section currently shows npx as primary.
Change it so the FIRST visible recommendation is:

```bash
# Install (once)
npm install -g specky-sdd
```

Then show the MCP config examples with the installed binary:

**For VS Code with GitHub Copilot** create `.vscode/mcp.json`:
```json
{
  "servers": {
    "specky": {
      "command": "specky-sdd",
      "env": {
        "SDD_WORKSPACE": "${workspaceFolder}"
      }
    }
  }
}
```

**For Claude Code:**
```bash
claude mcp add specky -- specky-sdd
```

**For Cursor** (Settings > MCP Servers):
```json
{
  "specky": {
    "command": "specky-sdd"
  }
}
```

Then show npx as an ALTERNATIVE (not primary):

> **Alternative: npx (no install required)**
> If you prefer not to install globally, you can use npx which downloads on demand:
> ```json
> {
>   "servers": {
>     "specky": {
>       "command": "npx",
>       "args": ["-y", "specky-sdd"],
>       "env": { "SDD_WORKSPACE": "${workspaceFolder}" }
>     }
>   }
> }
> ```
> Note: npx fetches from the registry on every invocation. For enterprise environments with supply chain policies, use the global install or Docker.

In the "Global" expandable section — this is now the RECOMMENDED method. Update the text to say "Recommended" instead of treating it as secondary.

=== GETTING-STARTED.md ===

Section "4. Installing Specky":
- Swap Option A and Option B:
  - Option A: Global npm install (recommended)
    ```bash
    npm install -g specky-sdd
    ```
  - Option B: npx (no install, convenience)
    ```bash
    npx specky-sdd
    ```
  - Option C: Docker (unchanged)

Section "5. Configuring in VS Code with GitHub Copilot":
- Update .vscode/mcp.json to:
  ```json
  {
    "servers": {
      "specky": {
        "command": "specky-sdd",
        "env": {
          "SDD_WORKSPACE": "${workspaceFolder}"
        }
      }
    }
  }
  ```
- Update the "What each field does" table:
  | command | The Specky executable. Requires `npm install -g specky-sdd` first. |
  | env.SDD_WORKSPACE | Tells Specky where your project root is. |
- Remove the "-y auto-confirms the npx install prompt" explanation

Section "6. Configuring in Claude Code":
- Quick setup: `claude mcp add specky -- specky-sdd`
  (remove the `npx -y` from the command)
- Manual config: change command from "npx" to "specky-sdd", remove args ["-y", "specky-sdd"]

Claude Desktop config: same change — command "specky-sdd", no args needed.

=== SYSTEM-DESIGN.md ===

"Local Installation" section:
- Change comment from "# npm (recommended)" next to npx line
- Make it:
  ```bash
  # Global install (recommended)
  npm install -g specky-sdd
  specky-sdd

  # Or use npx (downloads on each run)
  npx -y specky-sdd
  ```

"Claude Code Integration" and "VS Code / Copilot Integration" JSON blocks:
- Change "command": "npx" → "command": "specky-sdd"
- Remove "args": ["-y", "specky-sdd"]

=== CLAUDE.md ===

If there are any MCP config examples in CLAUDE.md using npx, update them to specky-sdd.

=== ONBOARDING.md ===

Quick install:
```bash
# Install (recommended)
npm install -g specky-sdd

# Or use npx (no install)
npx specky-sdd
```

=== SECURITY.md ===

"Security Best Practices for Users" table:
- "Use stdio mode by default" row: change example from `npx specky-sdd` to `specky-sdd` (after global install)
- Keep the HTTP Deployment Checklist unchanged

=== BUILD_PROMPT.md ===

DO NOT MODIFY — this is a v1.0.0 historical artifact.

───────────────────────────────────────────────────────────────
A9: VERIFICATION
───────────────────────────────────────────────────────────────

After all Part A changes, run:

```bash
echo "=== Stale numbers ==="
grep -rn "53 tools\|53 MCP\|53 validated\|52 tools\|52 MCP" *.md docs/*.md 2>/dev/null | grep -v CHANGELOG | grep -v "was 5[23]"
grep -rn "321 unit\|292 tests" *.md docs/*.md 2>/dev/null | grep -v CHANGELOG | grep -v "was 3[12]"
grep -rn "24 services" *.md docs/*.md 2>/dev/null | grep -v CHANGELOG
grep -rn "7 executable\|7 automation" *.md docs/*.md 2>/dev/null | grep -v CHANGELOG | grep -v "was [67]"
grep -rn "specky-sdd-2\." *.md docs/*.md 2>/dev/null | grep -v CHANGELOG

echo ""
echo "=== npx still as primary (should be zero or only in 'Alternative' context) ==="
grep -rn '"command": "npx"' *.md docs/*.md 2>/dev/null | grep -v CHANGELOG | grep -v BUILD_PROMPT | grep -v "Alternative\|alternative\|convenience\|npx ("
echo ""
echo "=== Verify specky-sdd as command ==="
grep -rn '"command": "specky-sdd"' *.md docs/*.md 2>/dev/null | head -20
echo "=== Done ==="
```

Fix any remaining hits where npx is still shown as the PRIMARY method (not as an alternative).

═══════════════════════════════════════════════════════════════
PART B — ENTERPRISE SECURITY IMPROVEMENTS (v3.2.0)
═══════════════════════════════════════════════════════════════

Grounded in: CoSAI (Jan 2026), OWASP Agentic Top 10 (Dec 2025), OWASP MCP Top 10,
MCP 2026 Roadmap, IBM Enterprise Blueprint, arXiv:2503.23278, arXiv:2511.20920.

Architecture: Thin Tools / Fat Services. No new runtime dependencies.
All schemas Zod .strict(). All new tools call buildToolResponse().
Unit tests for every new service. Config opt-in via .specky/config.yml.

───────────────────────────────────────────────────────────────
B1: RATE LIMITER SERVICE (CoSAI T-01, arXiv:2503.23278)
───────────────────────────────────────────────────────────────

Create src/services/rate-limiter.ts:
- Token bucket algorithm (no new deps — pure TypeScript)
- Config: rate_limit.enabled (bool, default false), rate_limit.max_requests_per_minute (number, default 60), rate_limit.burst (number, default 10)
- checkRateLimit(clientId: string): { allowed: boolean; retry_after_ms?: number }
- resetLimits(): void
- stdio: clientId = "stdio-local" (effectively no limit)
- HTTP: clientId = IP or auth subject

Create src/tests/unit/rate-limiter.test.ts (≥10 tests)

Wire in src/index.ts: active only when rate_limit.enabled AND HTTP transport.

───────────────────────────────────────────────────────────────
B2: STATE FILE INTEGRITY (CoSAI T-12, IBM blueprint)
───────────────────────────────────────────────────────────────

Enhance src/services/state-machine.ts:
- After every write: HMAC-SHA256 of JSON content → .specs/.sdd-state.json.sig
- HMAC key: SDD_STATE_KEY env var, fallback to deterministic key from workspace path
- On every read: verify HMAC. Mismatch → stderr warning + tamper_warning in response
- Never blocks pipeline — informational only

Create src/tests/unit/state-integrity.test.ts (≥8 tests)

───────────────────────────────────────────────────────────────
B3: ENHANCED AUDIT LOGGER (CoSAI T-10, IBM blueprint)
───────────────────────────────────────────────────────────────

Enhance existing src/services/audit-logger.ts:

a) Hash-chaining: each entry includes SHA-256 of previous entry
   - Seed: "specky-audit-v1". Field: previous_hash

b) Syslog export stub:
   - Config: audit.export_format ("jsonl" | "syslog" | "otlp")
   - "syslog": RFC 5424 format to .audit.syslog
   - "otlp": placeholder log "OTLP not yet implemented"

c) Rotation:
   - Config: audit.max_file_size_mb (default 10)
   - Rotate to .audit.jsonl.1, keep max 3

Create src/tests/unit/audit-enhanced.test.ts (≥12 tests)

───────────────────────────────────────────────────────────────
B4: RBAC FOUNDATION (CoSAI T-02, IBM blueprint, OWASP MCP)
───────────────────────────────────────────────────────────────

Create src/services/rbac-engine.ts:
- Roles: "viewer" (read-only tools), "contributor" (all except release), "admin" (all)
- Config in .specky/config.yml:
  rbac:
    enabled: false  # opt-in
    default_role: contributor
- checkAccess(role: string, toolName: string): { allowed: boolean; reason?: string }
- Role from SDD_ROLE env var, fallback to default_role

Create src/tools/rbac.ts: sdd_check_access tool (thin tool pattern)

Create src/tests/unit/rbac-engine.test.ts (≥15 tests)

Wire in src/index.ts: when rbac.enabled, wrap all handlers with checkAccess.

───────────────────────────────────────────────────────────────
B5: SUPPLY CHAIN DOCUMENTATION
───────────────────────────────────────────────────────────────

Update GETTING-STARTED.md — add section "## Enterprise Installation Methods" after Quick Start:

Content covers three tiers:
1. Default: npm install -g specky-sdd (version-pinned, offline after install)
2. Strict supply chain: npx --offline --no with pre-installed workspace
3. Air-gapped / Docker: cosign-verified images

Include the workspace isolation pattern:
```bash
mkdir -p $HOME/.specky-workspace && cd $HOME/.specky-workspace
npm init -y && npm install specky-sdd@3.2.0
# MCP config uses: npx --workspace $HOME/.specky-workspace --no --offline specky-sdd
```

Update SECURITY.md — add "## NPX Supply Chain Risk" section:
- Explain that npx downloads with no lockfile/hash verification
- Recommend npm install -g for most users
- Document workspace isolation pattern for strict compliance
- Reference: CoSAI, OWASP MCP Top 10, npm security best practices

───────────────────────────────────────────────────────────────
B6: SECURITY.md — MCP FRAMEWORK COMPLIANCE TABLE
───────────────────────────────────────────────────────────────

Add section "## MCP Security Framework Compliance" to SECURITY.md:

CoSAI 12-category mapping table (T-01 through T-12) with Specky status.
OWASP MCP Top 10 mapping table with Specky status.

References:
- CoSAI: https://github.com/cosai-oasis/ws4-secure-design-agentic-systems
- OWASP MCP Top 10: https://owasp.org/www-project-mcp-top-10/
- OWASP Agentic Top 10: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- MCP Roadmap: https://modelcontextprotocol.io/development/roadmap
- arXiv:2503.23278, arXiv:2511.20920

───────────────────────────────────────────────────────────────
B7: VERSION BUMP + CHANGELOG
───────────────────────────────────────────────────────────────

After ALL code compiles and ALL tests pass:

1. package.json: 3.1.0 → 3.2.0
2. CLAUDE.md Section 1: update version, add "What changed in v3.2.0" paragraph:
   "Enterprise security hardening. Rate limiter (token bucket, HTTP-only). State file HMAC-SHA256 tamper detection. Enhanced audit logger with hash-chaining and rotation. RBAC foundation (viewer/contributor/admin, opt-in). Default install method changed to npm install -g. NPX supply chain documentation. MCP security framework compliance mapping (CoSAI, OWASP). All MCP config examples updated to use specky-sdd command."

3. CHANGELOG.md: Add [3.2.0] entry at top with all changes.
   Include a "### Breaking Changes (Documentation Only)" note:
   "Default installation examples changed from `npx -y specky-sdd` to `npm install -g specky-sdd`. npx still works but is documented as an alternative. No code breaking changes."

═══════════════════════════════════════════════════════════════
IMPLEMENTATION RULES
═══════════════════════════════════════════════════════════════

1. Thin Tools / Fat Services. New tools → Zod .strict() → ONE service call → buildToolResponse().
2. No new runtime dependencies. Use Node.js crypto for HMAC.
3. FileManager owns all I/O.
4. Register new tools in src/index.ts.
5. Tests: Vitest. ≥10 tests per new service. npm test after each phase.
6. All features opt-in via .specky/config.yml. Default behavior = v3.1.0 unchanged.
7. No breaking changes to existing tool responses. New fields are additive.
8. Commits: "feat(enterprise): ..." for code, "docs: ..." for doc-only changes.
9. The installation default is `npm install -g specky-sdd`. Every MCP config example uses "command": "specky-sdd" (not npx). npx is shown ONLY as an alternative.

═══════════════════════════════════════════════════════════════
EXECUTION ORDER
═══════════════════════════════════════════════════════════════

Phase 1: Stale number fixes (A1–A7) → verify with grep
Phase 2: NPM default migration (A8) → verify with grep for npx-as-primary
Phase 3: Rate limiter service + tests → npm test
Phase 4: State file integrity + tests → npm test
Phase 5: Enhanced audit logger + tests → npm test
Phase 6: RBAC engine + tool + tests → npm test
Phase 7: Supply chain docs (GETTING-STARTED.md + SECURITY.md)
Phase 8: Security framework compliance table (SECURITY.md)
Phase 9: Version bump + CHANGELOG + CLAUDE.md
Phase 10: Final: npm run build && npm test && grep sweep

After EACH phase, show me what changed and the test results.
```

## ---END---

