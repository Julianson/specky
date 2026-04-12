# Hook: release-gate

**File:** `.claude/hooks/release-gate.sh`
**Trigger:** `PreToolUse` — `sdd_create_pr`
**Type:** **BLOCKING** (exits 2 to prevent `sdd_create_pr` from running)

---

## Purpose

Prevents a PR from being created before the feature specification has been fully verified. This is the final quality gate in the SDD pipeline — the only hook that can block a tool from executing.

## Checks

All three checks must pass for the PR to proceed.

| Check | Criterion | Failure action |
|-------|-----------|----------------|
| VERIFICATION.md exists | File present in the feature directory | BLOCK — instructs to run `sdd_verify_tasks` |
| CHECKLIST.md exists | File present in the feature directory | BLOCK — instructs to run `sdd_checklist` |
| Verification pass rate | `pass_rate:` ≥ 90 in VERIFICATION.md | BLOCK — instructs to complete remaining tasks |

## Sample output — blocked

```
[release-gate] ✖  VERIFICATION.md is missing.
               Run sdd_verify_tasks to generate the verification report.
               A PR cannot be created without task verification.
```

```
[release-gate] ✖  Verification pass rate is 72% (required: ≥90%).
               Complete the remaining tasks in TASKS.md before creating a PR.
               Run sdd_verify_tasks after completing tasks to update the report.
```

## Sample output — passed

```
[release-gate] ✓  Release gate passed for 001-my-feature.
               Verification: 95% — ready for PR.
```

## How it works

The hook identifies the feature directory by finding the highest-numbered directory under `.specs/`. It then:

1. Checks for `VERIFICATION.md` — fails with exit 2 if absent
2. Checks for `CHECKLIST.md` — fails with exit 2 if absent
3. Reads `pass_rate:` from `VERIFICATION.md` and compares to 90

If the `pass_rate:` field is absent, the check is skipped (the hook does not block on a missing field). If it is present and below 90, the hook exits 2.

## Why blocking

The advisory hooks (`spec-quality`, `task-tracer`) coach during early phases where iteration is expected. At the release gate, the pipeline is complete and the spec should be verified. A blocking hook here prevents accidental PR creation in an unverified state — the most expensive mistake to fix after a PR is merged.

## VERIFICATION.md format

The `pass_rate:` field must appear as a standalone line:

```yaml
pass_rate: 95
```

Or as part of a YAML front matter block. The hook extracts the first integer following `pass_rate:`.

## Bypassing the gate

To bypass for legitimate reasons (e.g., draft PR, WIP), either:
- Temporarily remove the hook from `.claude/settings.json` for that session, or
- Create a VERIFICATION.md with `pass_rate: 90` and a CHECKLIST.md placeholder before running `sdd_create_pr`

Document the bypass reason in the PR description.

## Related

- `sdd_create_pr` — the tool this hook guards
- `sdd_verify_tasks` — generates VERIFICATION.md with pass rate
- `sdd_checklist` — generates CHECKLIST.md for the feature
- `spec-quality.sh` — advisory hook earlier in the pipeline
- `task-tracer.sh` — advisory hook earlier in the pipeline
