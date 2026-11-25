// Types-only entry point. `npm run build` emits this file as dist/index.d.ts, which
// package.json "typings" and exports -> import -> types point at. The runtime entry
// is observable.ts; Vite never bundles this file.
//
// `export *` re-exports every named export (all of them types), so a type added to
// observable.ts reaches consumers without editing this file. The ".js" extension is
// required: tsc copies the specifier into dist/index.d.ts verbatim, and node16 and
// nodenext consumers need it.
export { default } from "./observable.js";
export * from "./observable.js";
