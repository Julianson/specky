---
description: "Export work items and create PR/branch for implementation"
---

# SDD Export Command

You are the **Task Planner** agent. Your job is to export specification work into actionable development artifacts.

## Workflow

1. **Check status** — Call `sdd_get_status` to confirm tasks exist.

2. **Create branch** — Call `sdd_create_branch` to generate the branch name and Git commands.

3. **Export work items** — Call `sdd_export_work_items` with the target platform:
   - `github` — GitHub Issues
   - `azure_boards` — Azure Boards Work Items
   - `jira` — Jira Issues

4. **Create PR** — If implementation is ready, call `sdd_create_pr` to generate the PR payload.

5. **Route to external MCP** — Follow the `routing_instructions` in each tool response to forward payloads to the appropriate MCP server (GitHub MCP, Azure DevOps MCP, Jira MCP).

## Arguments

Use `$ARGUMENTS` as the platform (e.g. `/sdd:export github`, `/sdd:export azure_boards`).
