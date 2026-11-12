// A CommonJS consumer under node16/nodenext resolution. Resolves to the "require"
// condition, so this checks dist/observable.d.cts.
import observe = require("@mdaemon/observable");
import type {
  observableType,
  UnknownKeys,
  ObserverCallback,
  ObserveOptions,
  Unsubscribe,
  ObservableFunction,
  ObserveFunction,
} from "@mdaemon/observable";

const count: ObservableFunction = observe("count", 0);
const value: observableType | undefined = count();
const changed: boolean | undefined = count(1);

const onChange: ObserverCallback = (next, previous) => {};
const options: ObserveOptions = { once: true, immediate: true };
const stop: Unsubscribe = count(onChange, options);
const removed: boolean = stop();

const settings: UnknownKeys = { theme: "dark", size: 12 };
observe("settings", settings);

const registry: ObserveFunction = observe.createRegistry();
const exists: boolean = registry.has("count");
const names: string[] = observe.names();
const destroyed: boolean = observe.destroy("count");

// The namespace types are reachable through the value too.
const alsoOptions: observe.ObserveOptions = { once: false };

// @ts-expect-error has() returns boolean. Proves the types are real, not `any`.
const wrong: string = observe.has("count");
