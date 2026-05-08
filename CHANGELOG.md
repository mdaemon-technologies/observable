# Changelog

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
