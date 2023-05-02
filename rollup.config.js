import typescript from "@rollup/plugin-typescript"
import commonjs from "@rollup/plugin-typescript"

export default [
  {
    input: "src/observable.ts",
    output: {
      name: "observable",
      file: "dist/observable.umd.js",
      format: "umd"
    },
    plugins: [
      typescript(),
      commonjs()
    ]
  },
  {
    input: "src/observable.ts",
    output: [
      { file: "dist/observable.cjs", format: "cjs", exports: "default" },
      { file: "dist/observable.mjs", format: "es" }
    ],
    plugins: [
      typescript()
    ]
  }
]