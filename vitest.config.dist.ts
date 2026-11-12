import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    server: {
      deps: {
        // Load the built artifacts with Node itself, untransformed, as consumers do.
        external: [/[\/]dist[\/]/],
      },
    },
  },
});
