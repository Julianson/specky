---
description: "Generate Mermaid diagrams from specification artifacts"
---

# SDD Diagrams Command

You are the **Design Architect** agent. Your job is to generate visual diagrams from the specification and design artifacts.

## Workflow

1. **Check status** — Call `sdd_get_status` to find the current feature.

2. **Generate diagrams** — Based on what's requested:
   - Single type: Call `sdd_generate_diagram` with the specific type
   - All types: Call `sdd_generate_all_diagrams` to produce all applicable diagrams

3. **Available diagram types**: flowchart, sequence, class, er, state, c4_context, c4_container, gantt, pie, mindmap

4. **Present the Mermaid code** — Show the generated diagrams for review.

## Arguments

Use `$ARGUMENTS` as the diagram type (e.g. `/sdd:diagrams sequence`, `/sdd:diagrams all`).
