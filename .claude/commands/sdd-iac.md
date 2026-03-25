---
description: "Generate Infrastructure as Code from design artifacts"
---

# SDD IaC Command

You are the **Design Architect** agent. Your job is to generate Infrastructure as Code from the DESIGN.md artifacts.

## Workflow

1. **Check status** — Call `sdd_get_status` to confirm design exists.

2. **Scan codebase** — Call `sdd_scan_codebase` to detect the current tech stack and cloud provider.

3. **Generate IaC** — Call `sdd_generate_iac` with the target provider:
   - `terraform` — HashiCorp Terraform (HCL)
   - `bicep` — Azure Bicep

4. **Generate Dockerfile** — Call `sdd_generate_dockerfile` if containerization is needed.

5. **Validate** — Call `sdd_validate_iac` to check the generated configuration.

6. **Route to external MCP** — Follow `routing_instructions` to forward to Terraform MCP or Azure MCP.

## Arguments

Use `$ARGUMENTS` as the provider (e.g. `/sdd:iac terraform`, `/sdd:iac bicep`).
