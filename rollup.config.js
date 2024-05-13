import typescript from "@rollup/plugin-typescript"

export default [
  {
    input: "src/observable.ts",
    output: [
      {
        file: "dist/observable.umd.js", format: "umd", name: "observable", exports: "default" },
      { file: "dist/observable.cjs", format: "cjs", exports: "default" },
      { file: "dist/observable.mjs", format: "es" }
    ],
    plugins: [
      typescript()
    ]
  }
]