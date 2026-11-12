// A consumer under bundler resolution (Vite, webpack, esbuild, ...).
import observe from "@mdaemon/observable";
import type { ObserveOptions, Unsubscribe, ObserveFunction } from "@mdaemon/observable";

const count = observe("count", 0);
const stop: Unsubscribe = count((next, previous) => {}, { once: true } satisfies ObserveOptions);
const changed: boolean | undefined = count(1);
const registry: ObserveFunction = observe.createRegistry();
const destroyed: boolean = observe.destroy("count");

// @ts-expect-error has() returns boolean. Proves the types are real, not `any`.
const wrong: string = observe.has("count");
