import typescript from "@rollup/plugin-typescript"
import terser from '@rollup/plugin-terser';

export default [
  {
    input: "src/observable.ts",
    output: [
      {
        file: "dist/observable.umd.js", format: "umd", name: "observable", exports: "default" },
      { file: "dist/observable.cjs", format: "cjs", name: "observable", exports: "default" },
      { file: "dist/observable.mjs", format: "es", name: "observable" }
    ],
    plugins: [
      typescript(),
      terser()
    ]
  }
]