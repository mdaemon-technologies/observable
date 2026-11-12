// Type-checks simulated consumer projects against the package as it would be
// published. Declaration bugs are invisible from inside this repo, because the
// repo never resolves "@mdaemon/observable" the way a consumer does.
//
//   npm run build && node test/consumer-types.mjs
//
// 1. Checks that the hand-maintained shims (dist/index.d.ts, dist/observable.d.cts)
//    re-export exactly the types that the generated dist/observable.d.ts exports.
// 2. Copies the files `npm pack` would publish into a temporary
//    node_modules/@mdaemon/observable, next to the fixtures in test/consumer/.
// 3. Type-checks the fixtures under each supported module resolution mode, with
//    TypeScript 7 and with TypeScript 6 (`tsc6`, which still supports node10).
//
// Calls each compiler by path: @typescript/typescript6 also links a `tsc` into
// node_modules/.bin, so a bare `tsc` may be TypeScript 6.
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "test", "consumer");
const compilers = {
  "TypeScript 7": path.join(root, "node_modules", "typescript", "bin", "tsc"),
  "TypeScript 6": path.join(root, "node_modules", "@typescript", "typescript6", "bin", "tsc6"),
};

const node16 = ["--module", "node16", "--moduleResolution", "node16"];
const nodenext = ["--module", "nodenext", "--moduleResolution", "nodenext"];
const bundler = ["--module", "esnext", "--moduleResolution", "bundler"];
const node10 = ["--module", "commonjs", "--moduleResolution", "node10", "--esModuleInterop", "--ignoreDeprecations", "6.0"];

const cases = [
  ["TypeScript 7", "node16", node16, ["esm.mts", "cjs.cts"]],
  ["TypeScript 7", "nodenext", nodenext, ["esm.mts", "cjs.cts"]],
  ["TypeScript 7", "bundler", bundler, ["bundler.ts"]],
  ["TypeScript 6", "node16", node16, ["esm.mts", "cjs.cts"]],
  ["TypeScript 6", "nodenext", nodenext, ["esm.mts", "cjs.cts"]],
  ["TypeScript 6", "bundler", bundler, ["bundler.ts"]],
  ["TypeScript 6", "node10", node10, ["node10.ts"]],
];

let failures = 0;
const fail = (message) => {
  failures++;
  console.error(`not ok - ${message}`);
};

// 1. The shims must re-export every generated type, and nothing else.
const read = (file) => fs.readFileSync(path.join(root, "dist", file), "utf8");
const listed = (source) => {
  const match = source.match(/export type \{([^}]*)\}/);
  return match ? match[1].split(",").map((name) => name.trim()).filter(Boolean).sort() : [];
};
const generated = listed(read("observable.d.ts"));
const shims = {
  "dist/index.d.ts": listed(read("index.d.ts")),
  "dist/observable.d.cts": [...read("observable.d.cts").matchAll(/^\s*type (\w+) = types\.\1;/gm)]
    .map((match) => match[1])
    .sort(),
};
if (generated.length === 0) fail("found no `export type { ... }` list in dist/observable.d.ts");
for (const [file, names] of Object.entries(shims)) {
  const missing = generated.filter((name) => !names.includes(name));
  const extra = names.filter((name) => !generated.includes(name));
  if (missing.length || extra.length) {
    fail(`${file} type exports drifted from dist/observable.d.ts` +
      (missing.length ? `; missing: ${missing.join(", ")}` : "") +
      (extra.length ? `; not generated: ${extra.join(", ")}` : ""));
  } else {
    console.log(`ok - ${file} re-exports all ${generated.length} generated types`);
  }
}

// 2. Install what `npm pack` would publish into a throwaway consumer project.
const packed = JSON.parse(execSync("npm pack --dry-run --json --ignore-scripts", { cwd: root, encoding: "utf8" }));
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), "observable-consumer-"));
try {
  const installed = path.join(consumer, "node_modules", "@mdaemon", "observable");
  for (const { path: file } of packed[0].files) {
    fs.mkdirSync(path.dirname(path.join(installed, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(installed, file));
  }
  fs.writeFileSync(path.join(consumer, "package.json"), JSON.stringify({ name: "consumer", private: true }));
  for (const file of fs.readdirSync(fixtures)) {
    fs.copyFileSync(path.join(fixtures, file), path.join(consumer, file));
  }

  // 3. Type-check each fixture set.
  const common = ["--noEmit", "--strict", "--target", "es2022", "--skipLibCheck", "false"];
  for (const [compiler, mode, flags, files] of cases) {
    const label = `${compiler}, ${mode}: ${files.join(" ")}`;
    try {
      execFileSync(process.execPath, [compilers[compiler], ...common, ...flags, ...files], {
        cwd: consumer,
        encoding: "utf8",
        stdio: "pipe",
      });
      console.log(`ok - ${label}`);
    } catch (error) {
      fail(label);
      console.error(String(error.stdout || error.stderr || error.message).replace(/^/gm, "    "));
    }
  }
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
}

if (failures) {
  console.error(`test:types: ${failures} failed`);
  process.exit(1);
}
console.log("test:types: all consumer checks passed");
