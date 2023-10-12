'use strict';

function getUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
        var rand = (Math.random() * 16) | 0, val = char === "x" ? rand : (rand & 0x3) | 0x8;
        return val.toString(16);
    });
}
var is = (function () {
    var obj = function (a) {
        return typeof a === "object" && a !== null && !Array.isArray(a);
    };
    var num = function (a) {
        return typeof a === "number";
    };
    var str = function (a) {
        return typeof a === "string";
    };
    var arr = function (a) {
        return Array.isArray(a);
    };
    var undef = function (a) {
        return typeof a === "undefined";
    };
    var func = function (a) {
        return typeof a === "function";
    };
    var bool = function (a) {
        return typeof a === "boolean";
    };
    return {
        object: obj,
        number: num,
        string: str,
        array: arr,
        undef: undef,
        func: func,
        bool: bool
    };
}());
var updateProps = function (a, b) {
    var changed = false;
    if (!is.object(a) || !is.object(b)) {
        return false;
    }
    Object.keys(b).forEach(function (prop) {
        if (is.object(a[prop])) {
            changed = updateProps(a[prop], b[prop]);
        }
        else if (is.array(a[prop]) && is.array(b[prop])) {
            for (var i = 0, iMax = b[prop].length; i < iMax; i++) {
                if (is.object(a[prop][i])) {
                    changed = updateProps(a[prop][i], b[prop][i]);
                }
                else if (a[prop][i] !== b[prop][i]) {
                    a[prop][i] = b[prop][i];
                    changed = true;
                }
            }
        }
        else if (a[prop] !== b[prop]) {
            a[prop] = b[prop];
            changed = true;
        }
    });
    return changed;
};
var clone = function (val) {
    if (is.object(val)) {
        var newVal_1 = {};
        Object.keys(val).forEach(function (key) {
            newVal_1[key] = clone(val[key]);
        });
        return newVal_1;
    }
    if (is.array(val)) {
        var newVal = val.map(function (item) {
            return clone(item);
        });
        return newVal;
    }
    return val;
};
var deepEqual = function (a, b) {
    if (typeof a !== typeof b) {
        return false;
    }
    if (is.string(a) && is.string(b)) {
        return a === b;
    }
    if (is.number(a) && is.number(b)) {
        return a === b;
    }
    if (is.bool(a) && is.bool(b)) {
        return a === b;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        var i = a.length;
        while (i--) {
            if (!deepEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    if (is.object(a) && is.object(b)) {
        if (Object.keys(a).join("") !== Object.keys(b).join("")) {
            return false;
        }
        var keys = Object.keys(a);
        var i = keys.length;
        while (i--) {
            if (!deepEqual(a[keys[i]], b[keys[i]])) {
                return false;
            }
        }
        return true;
    }
    return false;
};
var Observable = /** @class */ (function () {
    function Observable(name, observable) {
        this.name = name;
        this.value = observable;
        this.observers = [];
    }
    Observable.prototype.get = function () {
        return clone(this.value);
    };
    Observable.prototype.set = function (newValue) {
        if (is.undef(this.value)) {
            this.value = clone(newValue);
            this.changed(undefined);
            return true;
        }
        var sameType = (is.array(newValue) && is.array(this.value)) ||
            (is.object(newValue) && is.object(this.value)) ||
            (is.number(newValue) && is.number(this.value)) ||
            (is.string(newValue) && is.string(this.value)) ||
            (is.bool(newValue)) && is.bool(this.value);
        if (sameType) {
            var changed = false;
            var oldValue = clone(this.value);
            if (is.object(this.value)) {
                changed = updateProps(this.value, newValue);
            }
            else if (Array.isArray(this.value)) {
                changed = !deepEqual(this.value, newValue);
                this.value = clone(newValue);
            }
            else {
                changed = this.value !== newValue;
                this.value = newValue;
            }
            if (changed) {
                this.changed(oldValue);
            }
            return changed;
        }
        return false;
    };
    Observable.prototype.observe = function (observer) {
        var self = this;
        var newObserver = {
            id: getUuid(),
            observe: observer
        };
        this.observers.push(newObserver);
        return function () {
            self.stop(newObserver.id);
        };
    };
    Observable.prototype.stop = function (id) {
        var i = this.observers.length;
        while (i--) {
            if (this.observers[i].id === id) {
                this.observers.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    Observable.prototype.changed = function (oldValue) {
        var newValue = this.get();
        this.observers.forEach(function (observer) {
            observer.observe(newValue, oldValue);
        });
    };
    return Observable;
}());
var observables = [];
function getObservable(name, initialValue) {
    var observable = observables.find(function (o) { return o.name === name; });
    if (initialValue !== undefined) {
        observable === null || observable === void 0 ? void 0 : observable.set(initialValue);
    }
    if (!observable) {
        observable = new Observable(name, initialValue);
        observables.push(observable);
    }
    return observable;
}
function observe(name, initialValue) {
    var observable = getObservable(name, initialValue);
    var observe = function (newValue) {
        if (is.undef(newValue)) {
            return observable.get();
        }
        if (typeof newValue === "function") {
            return observable.observe(newValue);
        }
        return observable.set(newValue);
    };
    return observe;
}

module.exports = observe;
