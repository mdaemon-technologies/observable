import { defineConfig } from "vitest/config";

const fileNames = {
  es: "observable.mjs",
  cjs: "observable.cjs",
  umd: "observable.umd.js",
} as const;

export default defineConfig({
  build: {
    target: "es2015",
    minify: true,
    // dist/ also holds the hand-maintained index.d.ts and *.d.ts shims.
    emptyOutDir: false,
    lib: {
      entry: "src/observable.ts",
      name: "observable",
      formats: ["es", "cjs", "umd"],
      fileName: (format) => fileNames[format as keyof typeof fileNames],
    },
    rolldownOptions: {
      output: {
        // One default export: UMD and CJS consumers get the function itself.
        exports: "default",
        // Rolldown omits "use strict" from CJS/UMD by default; Rollup emitted it.
        strict: true,
        // Vite skips whitespace minification for ES library output; this keeps
        // observable.mjs minified like the other two bundles.
        minify: true,
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
