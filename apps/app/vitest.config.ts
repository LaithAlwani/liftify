import { defineConfig } from "vitest/config";

// Unit tests for the pure lib functions (recommendation engine + tag
// derivation). These have no React/Next/DOM deps, so a plain node environment
// is enough. Tests live next to their source as lib/**/*.test.ts.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
