// Types for `require("@mdaemon/observable")`. Hand-maintained, like index.d.ts.
//
// The package is "type": "module", so TypeScript reads every .d.ts in it as an ES
// module. CommonJS consumers under node16/nodenext need a .d.cts that uses
// `export =`, matching `module.exports = observe` in observable.cjs. The types
// themselves still come from the generated observable.d.ts.
//
// The namespace re-exports every type in observable.d.ts, so
// `import type { Unsubscribe } from "@mdaemon/observable"` works from CommonJS too.
// `npm run test:types` fails if this list drifts from observable.d.ts.
import type * as types from "./observable.js" with { "resolution-mode": "import" };

declare const observe: types.ObserveFunction;

declare namespace observe {
  type observableType = types.observableType;
  type UnknownKeys = types.UnknownKeys;
  type ObserverCallback = types.ObserverCallback;
  type ObserveOptions = types.ObserveOptions;
  type Unsubscribe = types.Unsubscribe;
  type ObservableFunction = types.ObservableFunction;
  type ObserveFunction = types.ObserveFunction;
}

export = observe;
