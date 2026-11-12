# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.2] - 2026-11-12

Fixes the TypeScript types for CommonJS consumers. No API or runtime changes; the
bundles are rebuilt with new tooling.

### Fixed
- **TypeScript types for `require("@mdaemon/observable")` under `node16` and
  `nodenext` module resolution.** `exports` had one `types` entry, `dist/index.d.ts`,
  and because the package is `"type": "module"`, TypeScript read it as an ES module
  for `require` too. Under `node16`, `import observe = require("@mdaemon/observable")`
  failed with TS1471. Under `nodenext`, `observe` was typed as a module object, so
  calling it or using `observe.destroy` failed to compile. The JavaScript always
  worked; only the types were wrong.

  The `require` condition now points at a new `dist/observable.d.cts`, which uses
  `export =` like the CJS bundle and also exposes every exported type, so
  `import type { Unsubscribe } from "@mdaemon/observable"` works from CommonJS.
  The new file uses the `resolution-mode` import attribute, so CommonJS consumers
  under `node16`/`nodenext` need TypeScript 5.3 or later. Older versions could not
  use these types from CommonJS before this fix either. ES module, `bundler`, and
  `node10` consumers are unaffected.

### Changed
- **The bundles are built with Vite 8** (Rolldown, with the Oxc minifier) instead of
  Rollup with `rollup-plugin-esbuild`. The output is still ES2015, still minified,
  still has `"use strict"` in the CJS and UMD builds, and still has a single default
  export. All three bundles are 1–3% smaller. The generated type declarations are
  byte-identical to 3.1.1.
- **The published package is now an allowlist.** `package.json` `files` limits the
  tarball to `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`, and `package.json`.
  Before, any repository file not named in `.npmignore` was published too, including
  `CLAUDE.md`.
- Tests run on Vitest 5 instead of Jest 30 with ts-jest. `test:dist` now loads the
  built bundles through Node itself, not a transform, so it tests exactly what is
  published.
- **Built with TypeScript 7** (the native compiler) instead of TypeScript 6. The
  generated `dist/observable.d.ts` is byte-identical. TypeScript 6 stays installed
  as `@typescript/typescript6` (`tsc6`), only to check `node10` consumers, which
  TypeScript 7 no longer supports.
- Building and testing the package now needs Node.js 22.12 or later (Vitest 5). This
  affects contributors only. `engines` stays at Node.js 18 or later for consumers.
- Removed devDependencies `rollup`, `rollup-plugin-esbuild`, `jest`, `ts-jest`,
  `@types/jest`, and `ts-node`. Added `vite`, `vitest`, `@types/node`, and
  `@typescript/typescript6`. Upgraded `typescript` from `^6.0.0` to `^7.0.2`.
- CI builds and tests on Node.js 22, 24, and 26. Node.js 18 and 20 can no longer run
  the dev tooling, so they run the smoke test below against the built bundles.

### Added
- `npm run typecheck` type-checks the source, the tests, and the build configs.
  Vitest does not type-check, so this replaces the checking ts-jest used to do.
- `npm run test:smoke` (`test/smoke.cjs`) is a dependency-free smoke test of the
  built bundles. It loads the package through its `exports` map with both `require`
  and `import`, loads the CJS and ESM files directly, and runs the UMD file as a
  browser `<script>`. It runs on plain Node.js with no `npm install`.
- `npm run test:types` type-checks consumer projects against the package as it would
  be published: ES module and CommonJS consumers on TypeScript 7 under `node16`,
  `nodenext`, and `bundler`, and on TypeScript 6 under those plus `node10`. It also
  fails if the hand-written type shims stop matching the generated declarations.
  This check would have caught the CommonJS types bug above.
- Releases are published from GitHub Actions (`publish.yml`) with npm trusted
  publishing, so no npm token is stored. Publishing a GitHub Release builds and tests
  the package, smoke-tests that build on Node.js 18 and 20, then stages that exact
  `dist/` for a maintainer to approve on npmjs.com.

## [3.1.1] - 2026-09-21

No code changes.

### Added
- `engines` in `package.json` declares Node.js 18 or later.

### Changed
- Reorganized the README: one heading hierarchy, a Usage section per module format
  (ES modules, CommonJS, UMD, TypeScript), and badges that read the version, license,
  and Node.js range from the npm registry.
- Expanded this changelog to cover 3.1.0 in full and added the missing 3.0.1 and
  3.0.2 entries.

## [3.1.0] - 2026-08-19

### Added
- `observe.destroy(name)` destroys an observable by name without the
  `"destroy-observable-<name>"` sentinel, which a string observable's own value can
  collide with.
- **Subscription options.** A subscription takes an optional second argument:
  - `{ once: true }` invokes the observer at most once, then unsubscribes it. The
    observer is removed before it runs, so it fires exactly once even if it throws
    or writes re-entrantly.
  - `{ immediate: true }` invokes the observer right away with the current value and
    an undefined old value, then keeps observing. Skipped when the observable has no
    value yet; combined with `once` it then fires on the first change instead.

  Options are per subscription, never per observable, so one subscriber cannot
  change how another subscriber to the same name is notified.
- **`observe.createRegistry()`** returns an independent registry with its own
  namespace, so two unrelated consumers can both use the name `"user"` without
  sharing state. Values, observers, and destruction are all scoped to the registry
  that owns them. The default export remains a single shared registry.
- **`observe.has(name)`** reports whether an observable is registered.
- **`observe.names()`** lists the registered names in creation order, returning a
  fresh array each call.

### Changed
- **Types are now generated from source.** `npm run build` emits `dist/observable.d.ts`
  via `tsc -p tsconfig.types.json`; `dist/index.d.ts` is a thin re-export so the
  published types can no longer drift from the implementation.
- The accessor returned by `observe` is properly overloaded (read / subscribe /
  write), so consumers no longer need `as Function` casts. Subscribing infers the
  callback signature, and `observe.destroy` is declared.
- Type-level breaking changes for TypeScript consumers, each correcting a
  previously inaccurate declaration:
  - Reading returns `observableType | undefined`, not `observableType` — an
    uninitialized observable really does return `undefined`.
  - An unsubscribe function returns `boolean`, not `void`.
  - A write returns `boolean | undefined`, not `boolean | void`.
  - Object property values may be `undefined`, so the documented removal API
    (`set({ key: undefined })`) type-checks.
- Internal type guards narrow properly, removing every internal `as` assertion.
- The registry is a `Map` keyed by name instead of a linear array scan.
- Observer handles use a monotonic counter instead of a `Math.random()` UUID.
- `Observable`'s value, observers, destroyed flag, `stop`, and `changed` are private.
- An observer that writes re-entrantly now behaves the same for every value type.
  Observers later in the round always see current state; previously an object
  observable (updated in place) and an array or primitive observable (reassigned)
  disagreed about what a re-entrant write made visible.
- A property whose value is `undefined` is treated as absent everywhere, not only in
  the object merge path. Storing and comparing now agree, so re-setting a value
  containing `undefined` properties no longer reports a change every time.
- Dropping a reserved key (`__proto__`, `constructor`, `prototype`) now logs a
  warning. Skipping the key is required to stay safe, but a payload can carry one as
  ordinary data and that loss should not be silent.
- Setting a value of the wrong type now logs a warning, so it is distinguishable from
  "nothing changed"; both still return `false`.
- Cloning a `Date`, `Map`, `Set`, `RegExp`, or class instance now logs a warning
  instead of silently degrading it to a plain object. Real support for those types is
  not planned for this release.
- Documented the deliberate objects-merge / arrays-replace asymmetry in the source and
  the README so it is not "cleaned up" into a breaking change later.
- The README documents subscription options, registries, the objects-merge /
  arrays-replace asymmetry, and that an initial value applies only on creation.
- Added a TypeScript section listing the exported types and a table of the
  declaration corrections that TypeScript consumers may need to react to.
- Fixed the export examples, which used `export observedNumber;` -- not valid
  JavaScript.
- The README examples now run as part of the test suite, so the documentation
  cannot drift from the behavior it describes.
- `exports["."]` now lists `types` first. Export conditions are matched in order, so
  a runtime condition could win and leave the declaration lookup to fall back on
  guessing.
- The per-format declaration files (`observable.mjs.d.ts`, `observable.cjs.d.ts`,
  `observable.umd.d.ts`) re-export the generated declaration instead of enumerating
  type names by hand against the package's own name. They had gone stale and were
  missing `Unsubscribe`, `ObserveOptions`, and `ObserveFunction`.
- `.npmignore` excludes the test suite and TypeScript configs from the published
  tarball.

### Fixed
- Nested arrays now shrink when the incoming array is shorter; previously removals
  were silently ignored and the change was not reported.
- Nested values that change type (object -> primitive, array -> object, and so on)
  are now updated instead of being silently dropped.
- Objects and arrays supplied by the caller are cloned before being stored, so the
  internal value can no longer be mutated from outside without notification. This
  also applies to the initial value passed to `observe`.
- Observers are notified from a snapshot, so an observer that unsubscribes during
  notification no longer causes the next observer to be skipped. Observers removed
  mid-notification are skipped rather than called.
- An observer that throws no longer prevents the remaining observers from being
  notified; the error is reported via `console.error`.
- Each observer receives its own copy of the new and old values, so one subscriber
  can no longer mutate what the next one sees.
- `observe(name, initialValue)` no longer resets an existing observable or notifies
  its observers. The initial value applies on creation, or as a seed for an
  observable created without one.
- Destroying an observable now drops its observers and makes any stale handle inert.
  A stale handle can no longer destroy a replacement registered under the same name.
- Cycle detection tracks (source, target) pairs, so values reachable by more than one
  path are no longer skipped during updates and comparisons.
- `NaN` is treated as equal to itself, so setting `NaN` over `NaN` is no longer
  reported as a change on every call.
- Setting a property to `undefined` now deletes the key, as the README documents;
  previously the key remained with an `undefined` value.

### Security
- **Fixed prototype pollution (CWE-1321).** A crafted payload such as
  `JSON.parse('{"__proto__":{"isAdmin":true}}')` passed to an object observable
  wrote onto `Object.prototype` globally. `__proto__`, `constructor`, and
  `prototype` keys are now skipped, and all property writes go through
  `Object.defineProperty` so inherited setters are never invoked.

## [3.0.2] - 2026-05-19

Recorded retroactively from the repository history; this release shipped without a
changelog entry.

### Added
- A `types` condition in the `exports` map, pointing at `dist/index.d.ts`.

### Changed
- Switched the Rollup build to `rollup-plugin-esbuild`, dropping
  `@rollup/plugin-typescript`, `@rollup/plugin-terser`, and `tslib`.
- Upgraded `jest` and `@types/jest` to v30, and `ts-jest` to `^29.4.10`.
- Lowered the supported Node floor to 18 and updated the CI workflow to match.

## [3.0.1] - 2026-05-19

Recorded retroactively from the repository history; this release shipped without a
changelog entry.

### Added
- An `exports` map in `package.json` so the ESM, CommonJS, and browser builds resolve
  automatically.

## [3.0.0] - 2026-05-08

### Added
- `tsconfig.json` with explicit TypeScript 6-compatible compiler options (`moduleResolution: bundler`, `strict: true`, `types: []`, `rootDir: ./src`)
- `tsconfig.test.json` extending `tsconfig.json` with `types: ["jest", "node"]` for test compilation

### Changed
- Upgraded TypeScript from `^5.8.3` to `^6.0.0`
- Upgraded `ts-jest` from `^29.3.2` to `^29.4.9`
- Upgraded `@rollup/plugin-typescript` from `^12.1.2` to `^12.3.0`
- Upgraded `@rollup/plugin-terser` from `^0.4.4` to `^1.0.0` (requires Node.js >=20)
- Upgraded `rollup` from `^4.40.0` to `^4.60.3`
- Converted `jest.config.ts` from CommonJS (`module.exports`) to ESM (`export default`)

[3.1.2]: https://www.npmjs.com/package/@mdaemon/observable/v/3.1.2
[3.1.1]: https://www.npmjs.com/package/@mdaemon/observable/v/3.1.1
[3.1.0]: https://www.npmjs.com/package/@mdaemon/observable/v/3.1.0
[3.0.2]: https://www.npmjs.com/package/@mdaemon/observable/v/3.0.2
[3.0.1]: https://www.npmjs.com/package/@mdaemon/observable/v/3.0.1
[3.0.0]: https://www.npmjs.com/package/@mdaemon/observable/v/3.0.0
