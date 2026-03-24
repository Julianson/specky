import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/services/**"],
      exclude: [
        "src/services/file-manager.ts",       // I/O boundary, tested via integration
        "src/services/document-converter.ts",  // Uses node:fs/promises directly, I/O boundary
      ],
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
