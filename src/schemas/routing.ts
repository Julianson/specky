/**
 * Routing Schemas — sdd_model_routing.
 */

import { z } from "zod";

export const modelRoutingInputSchema = z.object({
  team_size: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(10)
    .describe("Number of developers on the team (used for cost savings calculation)"),
  requests_per_day: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(10)
    .describe("Estimated tool calls per developer per day"),
}).strict().describe("Return the full model routing decision table for all 10 SDD pipeline phases, cost savings analysis, and a Mermaid diagram.");
