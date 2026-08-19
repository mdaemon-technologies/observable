[![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmdaemon-technologies%2Fobservable%2Fmaster%2Fpackage.json&query=%24.version&prefix=v&label=npm&color=blue)](https://www.npmjs.com/package/@mdaemon/observable) [![Static Badge](https://img.shields.io/badge/node-v18%2B-blue?style=flat&label=node&color=blue)](https://nodejs.org)
 [![install size](https://packagephobia.com/badge?p=@mdaemon/observable)](https://packagephobia.com/result?p=@mdaemon/observable) [![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmdaemon-technologies%2Fobservable%2Fmaster%2Fpackage.json&query=%24.license&prefix=v&label=license&color=green)](https://github.com/mdaemon-technologies/observable/blob/master/LICENSE) [![Node.js CI](https://github.com/mdaemon-technologies/observable/actions/workflows/node.js.yml/badge.svg)](https://github.com/mdaemon-technologies/observable/actions/workflows/node.js.yml)

# @mdaemon/observable, A function for observing values

The `observable` function provides methods for setting, getting, observing, and stopping observation of any of the following value types: `object`, `array`, `boolean`, `string`, and `number`.

# Install #

    $ npm install @mdaemon/observable --save

## Node.js (CommonJS) ##
```javascript
    // Resolves via the "exports" field in package.json
    const observe = require("@mdaemon/observable");

    // Or load the explicit CJS build
    const observe = require("@mdaemon/observable/dist/observable.cjs");
```

## Node.js / Bundler (ES Modules) ##
```javascript
    import observe from "@mdaemon/observable";

    // Or load the explicit ESM build
    import observe from "@mdaemon/observable/dist/observable.mjs";
```

> **Note:** Bundlers (Rollup, webpack, Vite, etc.) and Node.js resolve the `exports` field in
> `package.json` and will use the appropriate build automatically.

## Browser (UMD) ##
```HTML
    <script src="/path_to_modules/@mdaemon/observable/dist/observable.umd.js"></script>
    <script>
      // The library is exposed as the global variable `observable`
      const observe = window.observable;
    </script>
```

### observe ###

You can use observe to keep track of a value from multiple contexts
#### Export observables ####
```javascript
    import observe from "@mdaemon/observable/dist/observable.mjs";

    // observeTheseValues.js
    const observedNumber = observe("numberName", 20);
    export observedNumber;

    // note that objects are clones, so this object will not be changed by changes to the observedObject
    const obj = {};
    const observedObject = observe("objectName", obj);
    export observedObject;

    const observedArray = observe("arrayName", []);
    export observedArray;

    const observedBoolean = observe("boolName", true);
    export observedBoolean;

    const observedString = observe("stringName","test");
    export observedString;
```


#### Import observables ####
```javascript
    // index.js
    import { 
        observedNumber, observedObject, 
        observedArray, observedBoolean, 
        observedString 
    } from "observeTheseValues.js";

    // change the value and return changed true/false
    let changed = observedNumber(30);
    console.log(changed); // true

    console.log(observedNumber(30)); // false
    
    // get the value
    console.log(observedNumber() === 30); // true

    // watch for value changes
    const stopObservingValue = observedNumber((newValue, oldValue) => {
      console.log("new", newValue);
      console.log("old", oldValue);
      console.log(newValue === oldValue);
    });

    // change the value for observation
    observedNumber(3);
    // new 3
    // old 30
    // false

    // stop observing changes
    stopObservingValue();

    // change the value again
    observedNumber(60); // nothing logged

    // observe also finds changes that are part of objects
    const stopObservingObject = observedObject((newValue, oldValue) => {
      console.log("new", newValue);
    });

    console.log(observedObject({ test: 10 })); // true
    // { test: 10 }

    // to remove a property from an object, set it to undefined
    // (the key is deleted, not left behind holding undefined)
    observedObject({ test: undefined });
    // { }

    // from 2.0 you can also get an already observed value using the name of the value passed to the original

    const str = observe("stringName");

    console.log(str()); // "test"
    
```

### Subscription options ###

A subscription accepts an options object. Both options are per subscription, never
per observable: an observable is shared by name across unrelated modules, so one
subscriber can never change how another one is notified.

```javascript
    const count = observe("count", 0);

    // fire once, then unsubscribe automatically
    count((newValue) => {
      console.log("first change only", newValue);
    }, { once: true });

    // fire right away with the current value, then keep observing
    const stop = count((newValue, oldValue) => {
      console.log(newValue, oldValue); // 0 undefined  <- immediately
    }, { immediate: true });

    // combine them: fire once, right now
    count((newValue) => console.log(newValue), { immediate: true, once: true });
```

`immediate` is skipped when the observable has no value yet; combined with `once`
it then fires on the first change instead.

A `once` observer is unsubscribed before it runs, so it fires exactly once even if
it throws or writes a new value from inside the callback.

> **Note:** an `immediate` observer cannot call its own unsubscribe function
> synchronously — the `const stop = ...` binding is not assigned yet while the
> callback runs. Use `{ once: true }` instead.

### Registries ###

Observables are stored in a registry keyed by name. The default export is one shared
registry, so two modules that both use the name `"user"` share the same observable.
When that is not what you want, create an independent one:

```javascript
    const registry = observe.createRegistry();

    observe("user", "shared");
    registry("user", "isolated");

    console.log(observe("user")());   // "shared"
    console.log(registry("user")());  // "isolated"
```

A custom registry has the same API as the default export, including its own
`createRegistry`. Nothing crosses between registries: values, observers, and
`destroy` are all scoped to the registry that owns them.

Every registry can be inspected:

```javascript
    observe.has("user");     // true if an observable is registered under that name
    observe.names();         // ["user", ...] in creation order, a fresh array each call
    observe.destroy("user"); // true if an observable by that name existed
```

### Objects merge, arrays replace ###

Writing to an object observable **merges** the incoming keys into the stored value.
Writing to an array observable **replaces** it wholesale, including arrays nested
inside an object. This asymmetry is intentional:

```javascript
    const obj = observe("mergeExample", { a: 1 });
    obj({ b: 2 });
    console.log(obj()); // { a: 1, b: 2 }  <- merged, "a" survives

    // remove a key by setting it to undefined
    obj({ a: undefined });
    console.log(obj()); // { b: 2 }

    const arr = observe("replaceExample", [1, 2, 3]);
    arr([1]);
    console.log(arr()); // [1]  <- replaced, not merged

    const nested = observe("nestedExample", { list: [1, 2, 3] });
    nested({ list: [1] });
    console.log(nested()); // { list: [1] }  <- nested arrays replace too
```

An observable also keeps its type for life. Setting a number observable to a string
is refused, returns `false`, and logs a warning.

Values are cloned on the way in and on the way out, so neither the caller nor an
observer can mutate the stored value by holding on to a reference. Only booleans,
strings, numbers, plain objects, and arrays round-trip intact; a `Date`, `Map`,
`Set`, `RegExp`, or class instance is copied as a plain object and logs a warning.

### Destroying an Observable ###

You can destroy an observable instance by passing a special string to the observe function. This will remove the observable from the internal list, allowing it to be garbage collected if there are no other references to it.

```javascript
    // Destroy the observable instance
    str("destroy-observable-stringName");

    // Attempting to get the value of the destroyed observable will now return undefined
    const str = observe("stringName");
    console.log(str()); // undefined
```

Destroying drops every registered observer, and any handle still held by a caller
becomes inert: getting returns `undefined`, setting returns `false`, and observing
is a no-op. A stale handle can never destroy a replacement registered later under
the same name.

Because the sentinel is just a string, a string observable cannot be *set* to the
literal `"destroy-observable-<name>"`. Use `observe.destroy(name)` when you want
to destroy by name without relying on the sentinel:

```javascript
    observe.destroy("stringName"); // true if an observable by that name existed
```

# License #

Published under the [LGPL-2.1 license](https://github.com/mdaemon-technologies/observable/blob/main/LICENSE "LGPL-2.1 License").

# Changelog #

See [CHANGELOG.md](CHANGELOG.md) for release history.

Published by<br/> 
<b>MDaemon Technologies, Ltd.<br/>
Simple Secure Email</b><br/>
[https://www.mdaemon.com](https://www.mdaemon.com)