# Changelog

## [3.1.0] - 2026-08-19

### Security
- **Fixed prototype pollution (CWE-1321).** A crafted payload such as
  `JSON.parse('{"__proto__":{"isAdmin":true}}')` passed to an object observable
  wrote onto `Object.prototype` globally. `__proto__`, `constructor`, and
  `prototype` keys are now skipped, and all property writes go through
  `Object.defineProperty` so inherited setters are never invoked.

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

### Documentation
- The README documents subscription options, registries, the objects-merge /
  arrays-replace asymmetry, and that an initial value applies only on creation.
- Added a TypeScript section listing the exported types and a table of the
  declaration corrections that TypeScript consumers may need to react to.
- Fixed the export examples, which used `export observedNumber;` -- not valid
  JavaScript.
- The README examples now run as part of the test suite, so the documentation
  cannot drift from the behavior it describes.

### Packaging
- `exports["."]` now lists `types` first. Export conditions are matched in order, so
  a runtime condition could win and leave the declaration lookup to fall back on
  guessing.
- The per-format declaration files (`observable.mjs.d.ts`, `observable.cjs.d.ts`,
  `observable.umd.d.ts`) re-export the generated declaration instead of enumerating
  type names by hand against the package's own name. They had gone stale and were
  missing `Unsubscribe`, `ObserveOptions`, and `ObserveFunction`.
- `.npmignore` excludes the test suite and TypeScript configs from the published
  tarball.

## [3.0.2] - 2026-05-19

Recorded retroactively from the repository history; this release shipped without a
changelog entry.

### Changed
- Switched the Rollup build to `rollup-plugin-esbuild`, dropping
  `@rollup/plugin-typescript`, `@rollup/plugin-terser`, and `tslib`.
- Upgraded `jest` and `@types/jest` to v30, and `ts-jest` to `^29.4.10`.
- Lowered the supported Node floor to 18 and updated the CI workflow to match.

### Added
- A `types` condition in the `exports` map, pointing at `dist/index.d.ts`.

## [3.0.1] - 2026-05-19

Recorded retroactively from the repository history; this release shipped without a
changelog entry.

### Added
- An `exports` map in `package.json` so the ESM, CommonJS, and browser builds resolve
  automatically.

## [3.0.0] - 2026-05-08

### Changed
- Upgraded TypeScript from `^5.8.3` to `^6.0.0`
- Upgraded `ts-jest` from `^29.3.2` to `^29.4.9`
- Upgraded `@rollup/plugin-typescript` from `^12.1.2` to `^12.3.0`
- Upgraded `@rollup/plugin-terser` from `^0.4.4` to `^1.0.0` (requires Node.js >=20)
- Upgraded `rollup` from `^4.40.0` to `^4.60.3`
- Converted `jest.config.ts` from CommonJS (`module.exports`) to ESM (`export default`)

### Added
- `tsconfig.json` with explicit TypeScript 6-compatible compiler options (`moduleResolution: bundler`, `strict: true`, `types: []`, `rootDir: ./src`)
- `tsconfig.test.json` extending `tsconfig.json` with `types: ["jest", "node"]` for test compilation
