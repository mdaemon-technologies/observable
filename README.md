[![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmdaemon-technologies%2Fobservable%2Fmaster%2Fpackage.json&query=%24.version&prefix=v&label=npm&color=blue)](https://www.npmjs.com/package/@mdaemon/observable) [![Static Badge](https://img.shields.io/badge/node-v16%2B-blue?style=flat&label=node&color=blue)](https://nodejs.org)
 [![install size](https://packagephobia.com/badge?p=@mdaemon/observable)](https://packagephobia.com/result?p=@mdaemon/observable) [![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fmdaemon-technologies%2Fobservable%2Fmaster%2Fpackage.json&query=%24.license&prefix=v&label=license&color=green)](https://github.com/mdaemon-technologies/observable/blob/master/LICENSE) [![Node.js CI](https://github.com/mdaemon-technologies/observable/actions/workflows/node.js.yml/badge.svg)](https://github.com/mdaemon-technologies/observable/actions/workflows/node.js.yml)

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

    // index.js
    import { observedNumber, observedObject, observedArray, observedBoolean, observedString } from "observeTheseValues.js";
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
    observedObject({ test: undefined });
    // { }


    // other.js
    // from 2.0 you can also get an already observed value using the name of the value passed to the original
    import observe from "observable";

    const str = observe("stringName");

    console.log(str()); // "test"
    
```

# License #

Published under the [LGPL-2.1 license](https://github.com/mdaemon-technologies/validate/blob/main/LICENSE "LGPL-2.1 License").

Published by<br/> 
<b>MDaemon Technologies, Ltd.<br/>
Simple Secure Email</b><br/>
[https://www.mdaemon.com](https://www.mdaemon.com)