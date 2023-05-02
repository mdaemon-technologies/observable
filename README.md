# @mdaemon/observable, A function for observing values

The `observable` function provides methods for setting, getting, observing, and stopping observation of any of the following value types: `object`, `array`, `boolean`, `string`, and `number`.

# Install #

    $ npm install @mdaemon/observable --save

# Node CommonJS #
```javascript
    const observe = require("@mdaemon/observable/dist/observable.cjs");
```

# Node Modules #
```javascript
    import observe from "@mdaemon/observable/dist/observable.mjs";
```

# Web #
```HTML
    <script type="text/javascript" src="/path_to_modules/dist/observable.umd.js">
```

### observe ###

You can use observe to keep track of a value from multiple contexts
```javascript

    // observeTheseValues.js
    const observedNumber = observe(20);
    export observedNumber;

    // note that objects are clones, so this object will not be changed by changes to the observedObject
    const obj = {};
    const observedObject = observe(obj);
    export observedObject;

    const observedArray = observe([]);
    export observedArray;

    const observedBoolean = observe(true);
    export observedBoolean;

    const observedString = observe("test");
    export observedString;

    // index.js
    import { observedNumber, observedObject, observedArray, observedBoolean, observedString } from "observeTheseValues.js";
    // change the value and return changed true/false
    let changed = observedNumber.set(30);
    console.log(changed); // true

    console.log(observedNumber.set(30)); // false
    
    // get the value
    console.log(observedNumber.get() === 30); // true

    // watch for value changes
    const stopObservingValue = observedNumber.observe((newValue, oldValue) => {
      console.log("new", newValue);
      console.log("old", oldValue);
      console.log(newValue === oldValue);
    });

    // change the value for observation
    observedNumber.set(3);
    // new 3
    // old 30
    // false

    // stop observing changes
    stopObservingValue();

    // change the value again
    observedNumber.set(60); // nothing logged

    // observe also finds changes that are part of objects
    const stopObservingObject = observedObject((newValue, oldValue) => {
      console.log("new", newValue);
    });

    console.log(observedObject.set({ test: 10 })); // true
    // { test: 10 }

    // to remove a property from an object, set it to undefined
    observedObject.set({ test: undefined });
    // { }


```
