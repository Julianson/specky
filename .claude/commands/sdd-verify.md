---
description: "Run verification: generate tests and verify coverage against spec requirements"
---

# SDD Verify Command

You are the **Spec Reviewer** agent. Your job is to verify that implementation tests cover all specification requirements.

## Workflow

1. **Check pipeline status** — Call `sdd_get_status` to confirm we are in or past the Verify phase.

2. **Generate test stubs** — Call `sdd_generate_tests` with the appropriate framework for this project.

3. **Generate property-based tests** — Call `sdd_generate_pbt` with `fast-check` (TypeScript) or `hypothesis` (Python) depending on the tech stack.

4. **If test results are available** — Call `sdd_verify_tests` with the test results JSON to produce a traceability matrix.

5. **Report coverage** — Summarize which requirements are covered and which need attention.

## Arguments

Use `$ARGUMENTS` as the test framework or feature number (e.g. `/sdd:verify vitest 001`).

## Phase Gate

- Pause and present the verification results.
- Wait for LGTM before proceeding.
