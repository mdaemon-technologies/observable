// Dependency-free smoke test of the built artifacts in dist/.
//
// Runs on plain Node with no devDependencies installed, so CI can exercise the
// published bundles on runtimes older than the dev tooling supports (Vite and
// Vitest need Node 22+, while `engines` promises Node 18+).
//
//   npm run build && node test/smoke.cjs
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const vm = require("node:vm");

const dist = path.join(__dirname, "..", "dist");

function exercise(label, observe) {
  assert.equal(typeof observe, "function", `${label}: default export is a function`);

  const name = `smoke-${label}`;
  const x = observe(name, 1);
  assert.equal(x(), 1, `${label}: reads the initial value`);

  const calls = [];
  const stop = x((value, oldValue) => calls.push([value, oldValue]));
  assert.equal(x(2), true, `${label}: a change reports true`);
  assert.equal(x(2), false, `${label}: an unchanged write reports false`);
  stop();
  x(3);
  assert.deepEqual(calls, [[2, 1]], `${label}: notifies once, then unsubscribes`);

  const obj = observe(`${name}-obj`, { a: 1 });
  obj({ b: 2 });
  assert.deepEqual(obj(), { a: 1, b: 2 }, `${label}: objects merge`);
  const copy = obj();
  copy.a = 99;
  assert.equal(obj().a, 1, `${label}: reads are clones`);

  assert.equal(observe.has(name), true, `${label}: observe.has`);
  const registry = observe.createRegistry();
  registry(`${name}-scoped`, "inner");
  assert.equal(observe.has(`${name}-scoped`), false, `${label}: registries are independent`);
  assert.deepEqual(registry.names(), [`${name}-scoped`], `${label}: registry.names`);
  assert.equal(observe.destroy(name), true, `${label}: observe.destroy`);
}

async function main() {
  const checks = [
    // Through package.json "exports" via self-reference, as consumers resolve it.
    ["require(package)", () => require("@mdaemon/observable")],
    ["import(package)", async () => (await import("@mdaemon/observable")).default],
    // Each file directly.
    ["cjs", () => require(path.join(dist, "observable.cjs"))],
    ["mjs", async () => (await import(pathToFileURL(path.join(dist, "observable.mjs")).href)).default],
    ["umd-script", () => {
      // Like a browser <script> tag: no module, exports or define in scope, so the
      // wrapper falls through to setting a global. Same realm, so plain objects
      // created here still pass the bundle's Object.prototype check.
      vm.runInThisContext(fs.readFileSync(path.join(dist, "observable.umd.js"), "utf8"));
      const observe = globalThis.observable;
      delete globalThis.observable;
      return observe;
    }],
  ];

  for (const [label, load] of checks) {
    exercise(label, await load());
    console.log(`ok - ${label}`);
  }
  console.log(`smoke: ${checks.length} formats passed on Node ${process.version}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
