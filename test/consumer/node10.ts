// A legacy consumer under node10 resolution, which ignores "exports" and reads
// "typings" (dist/index.d.ts). TypeScript 7 removed node10, so test:types runs this
// fixture on TypeScript 6 only.
import observe from "@mdaemon/observable";
import type { ObserveOptions, Unsubscribe, ObserveFunction } from "@mdaemon/observable";

const count = observe("count", 0);
const stop: Unsubscribe = count((next, previous) => {}, { once: true } as ObserveOptions);
const changed: boolean | undefined = count(1);
const registry: ObserveFunction = observe.createRegistry();
const destroyed: boolean = observe.destroy("count");

// @ts-expect-error has() returns boolean. Proves the types are real, not `any`.
const wrong: string = observe.has("count");
