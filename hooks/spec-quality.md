# Hook: spec-quality

**File:** `.claude/hooks/spec-quality.sh`
**Trigger:** `PostToolUse` — `sdd_write_spec`
**Type:** Advisory (never blocks — always exits 0)

---

## Purpose

Checks specification completeness immediately after `sdd_write_spec` writes `SPECIFICATION.md`. Coaches the author toward a well-formed spec before they proceed to Design.

## Checks

| Check | Threshold | Action on failure |
|-------|-----------|-------------------|
| Requirement count | ≥ 5 requirements | Warning: suggests running `sdd_clarify` |
| Acceptance Criteria coverage | 1 AC section per requirement | Warning: lists missing count |
| Requirement ID format | `REQ-CATEGORY-NNN` (e.g., `REQ-AUTH-001`) | Warning: explains correct format |

All three checks are advisory. The hook always exits 0, so `sdd_write_spec` is never blocked.

## Sample output

```
[spec-quality] ⚠  Only 3 requirement(s) found (recommended: ≥5).
               Consider running sdd_clarify to expand the specification.
[spec-quality] ⚠  1 requirement(s) may be missing Acceptance Criteria sections.
               Each REQ-* should have '### Acceptance Criteria' with testable criteria.
```

Or, when the spec is complete:

```
[spec-quality] ✓  Spec quality check passed: 7 requirements, 7 AC sections.
```

## How it works

The hook reads the most recently modified `SPECIFICATION.md` in the `.specs/` tree and uses `grep` counts:

- Requirement count: lines matching `^### REQ-`
- AC count: lines containing `Acceptance Criteria`
- Format check: lines matching `REQ-[A-Z][A-Z]*-[0-9][0-9]*`

## When to ignore

- During iterative drafting (early runs will always have fewer requirements)
- When a spec is intentionally minimal (e.g., a spike or proof-of-concept feature)

## Related

- `sdd_write_spec` — the tool this hook follows
- `sdd_clarify` — generates clarification questions to expand thin specs
- `task-tracer.sh` — companion advisory hook for TASKS.md
