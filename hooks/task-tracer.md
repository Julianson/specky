# Hook: task-tracer

**File:** `.claude/hooks/task-tracer.sh`
**Trigger:** `PostToolUse` — `sdd_write_tasks`
**Type:** Advisory (never blocks — always exits 0)

---

## Purpose

Checks implementation task traceability immediately after `sdd_write_tasks` writes `TASKS.md`. Every task should reference the requirement it implements; this hook detects tasks that are missing that link.

## Checks

| Check | Criterion | Action on failure |
|-------|-----------|-------------------|
| Task traceability | Each task row contains at least one `REQ-*` reference | Warning: lists untraced count with example format |

The check is advisory. The hook always exits 0, so `sdd_write_tasks` is never blocked.

## Sample output

```
[task-tracer] ⚠  3 of 12 task(s) lack REQ-* traceability.
              Each task row should reference the requirement it implements.
              Example: | T-001 | Implement auth | M | — | REQ-AUTH-001 |
              Run sdd_run_analysis to get a full traceability report.
```

Or, when all tasks are traced:

```
[task-tracer] ✓  All 12 task(s) trace to at least one requirement.
```

## How it works

The hook reads the most recently modified `TASKS.md` in the `.specs/` tree and uses `grep` counts:

- Task count: lines matching `^| T-[0-9]`
- Traced count: task lines that also contain `REQ-[A-Z]` on the same line

Untraced = task count − traced count.

## TASKS.md format

For a task to be counted as traced, its table row must include a `REQ-CATEGORY-NNN` reference anywhere on the same line. The recommended column layout:

```
| T-001 | Title | Effort | Dependencies | REQ-AUTH-001 |
```

## When to ignore

- During initial task drafting — add traceability before the Analyze gate
- For infrastructure or boilerplate tasks with no direct requirement mapping (document these explicitly)

## Related

- `sdd_write_tasks` — the tool this hook follows
- `sdd_run_analysis` — generates a full traceability matrix after tasks are written
- `spec-quality.sh` — companion advisory hook for SPECIFICATION.md
- `release-gate.sh` — blocking gate that enforces readiness before PR creation
