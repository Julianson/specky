# Getting Started with Specky SDD

## Prerequisites

- VS Code with GitHub Copilot extension
- Node.js 18+ (for the specky-sdd MCP server)

## Installation

```bash
cd your-project/
unzip specky-sdd-vscode-v1.2.0.zip
```

All files land in `.github/plugin/`, `.github/prompts/`, `.github/copilot-instructions.md`, and `.vscode/`.

## Quick Start

### New Project

Open Copilot Chat (`Ctrl+Alt+I`) and type:

```
@workspace /specky-greenfield
```

### Existing Codebase

```
@workspace /specky-brownfield
```

### Check Status

```
@workspace /specky-pipeline-status
```

## Pipeline Phases

| # | Phase | Prompt | Agent |
|---|-------|--------|-------|
| 0 | Init | /specky-greenfield | @sdd-init |
| 1 | Research | /specky-research | @research-analyst |
| 2 | Clarify | /specky-clarify | @sdd-clarify |
| 3 | Specify | /specky-specify | — |
| 4 | Design | /specky-design | — |
| 5 | Tasks | /specky-tasks | — |
| 6 | Implement | /specky-implement | @implementer |
| 7 | Verify | /specky-verify | @test-verifier |
| 8 | Review | — | — |
| 9 | Release | /specky-release | @release-engineer |

## File Structure

```
your-project/
├── .github/
│   ├── plugin/
│   │   ├── agents/        ← 7 Copilot agents (.agent.md)
│   │   ├── prompts/       ← 19 reusable prompts (.prompt.md)
│   │   ├── skills/        ← 6 domain skills (SKILL.md)
│   │   ├── hooks/
│   │   │   ├── scripts/   ← 10 hook shell scripts
│   │   │   └── sdd-hooks.json
│   │   └── config.yml     ← Pipeline configuration
│   └── copilot-instructions.md
├── .vscode/
│   ├── mcp.json           ← Specky MCP server
│   └── settings.json      ← Hook integration
└── GETTING-STARTED.md
```

## EARS Notation

Every requirement follows one of 6 patterns:

- **Ubiquitous:** The system shall...
- **Event-driven:** When [event], the system shall...
- **State-driven:** While [state], the system shall...
- **Optional:** Where [condition], the system shall...
- **Unwanted:** If [condition], then the system shall...
- **Complex:** While [state], when [event], the system shall...

## Model Routing

| Phases | Model | Cost | Use |
|--------|-------|------|-----|
| 0, 9 | Haiku 4.5 | 0.33x | Scaffolding, templates |
| 1, 5-7 | Sonnet 4.6 | 1x | Synthesis, iteration |
| 2-4, 8 | Opus 4.6 | 3x | Reasoning, architecture |
