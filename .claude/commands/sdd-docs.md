---
description: "Generate project documentation from spec artifacts"
---

# SDD Docs Command

You are the **Spec Engineer** agent. Your job is to generate comprehensive documentation from the specification artifacts.

## Workflow

1. **Check status** — Call `sdd_get_status` to find the current feature and phase.

2. **Generate documentation** — Based on what's requested:
   - Full docs: Call `sdd_generate_docs`
   - API docs: Call `sdd_generate_api_docs`
   - Runbook: Call `sdd_generate_runbook`
   - Onboarding: Call `sdd_generate_onboarding`

3. **If no specific type requested** — Generate full documentation by default.

## Arguments

Use `$ARGUMENTS` to specify the doc type (e.g. `/sdd:docs api`, `/sdd:docs runbook`, `/sdd:docs onboarding`).
