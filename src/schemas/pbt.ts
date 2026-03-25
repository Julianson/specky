/**
 * PBT Schemas — sdd_generate_pbt.
 */

import { z } from "zod";
import { specDirSchema, featureNumberSchema } from "./common.js";

export const generatePbtInputSchema = z.object({
  framework: z
    .enum(["fast-check", "hypothesis"])
    .describe("Property-based testing framework: fast-check (TypeScript/JS) or hypothesis (Python)"),
  feature_number: featureNumberSchema,
  spec_dir: specDirSchema,
  output_dir: z
    .string()
    .min(1)
    .default("tests")
    .describe("Output directory for generated PBT files"),
}).strict().describe("Generate property-based tests from EARS requirements. Extracts invariants, round-trip properties, and idempotence checks.");
