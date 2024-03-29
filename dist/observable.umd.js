(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
   typeof define === 'function' && define.amd ? define(factory) :
   (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.observable = factory());
})(this, (function () { 'use strict';

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
   /**
    * Constructor for the Observable class.
    *
    * Initializes an Observable instance with the given name and initial value.
    * Stores the name, initial value, and empty observer array.
    *
    * @param name - Name of the observable instance.
    * @param observable - Initial value of the observable.
    */
   var Observable = /** @class */ (function () {
       function Observable(name, observable) {
           this.name = name;
           this.value = observable;
           this.observers = [];
       }
       /**
      * Gets the current value of the observable.
      *
      * @returns The current value of the observable. Returns a clone of the internal value to prevent mutation.
      */
       Observable.prototype.get = function () {
           return clone(this.value);
       };
       /**
      * Sets the value of the observable, notifying observers if the value has changed.
      *
      * Compares the new value to the current value to check if they are the same type
      * and equal. The values are cloned before comparison to prevent mutation.
      *
      * If the values are the same type but not equal, the value is updated and
      * observers are notified of the change. Objects are compared property-by-property.
      *
      * @param newValue - The new value to set for the observable.
      * @returns True if the value changed, false otherwise.
      */
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
               if (Array.isArray(this.value)) {
                   changed = !deepEqual(this.value, newValue);
                   this.value = clone(newValue);
               }
               else if (is.object(this.value)) {
                   changed = updateProps(this.value, newValue);
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
       /**
      * Registers an observer function that will be called whenever the
      * observable value changes. Returns an unsubscribe function that can
      * be called to stop observing.
      *
      * @param observer - The observer function to call on value changes.
      * @returns A function that unsubscribes the observer.
      */
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
       /**
      * Unsubscribes an observer with the given ID.
      *
      * @param id - The ID of the observer to unsubscribe.
      * @returns True if an observer was found and unsubscribed.
      */
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
       /**
      * Notifies all observers when the observable value changes.
      *
      * @param oldValue - The previous value before the change.
      */
       Observable.prototype.changed = function (oldValue) {
           var newValue = this.get();
           this.observers.forEach(function (observer) {
               observer.observe(newValue, oldValue);
           });
       };
       return Observable;
   }());
   var observables = [];
   /**
    * Gets an Observable instance by name, creating it if it doesn't already exist.
    *
    * @param name - The name of the Observable.
    * @param initialValue - Optional initial value to set.
    * @returns The Observable instance.
    */
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
   /**
    * Creates an Observable instance for the given name, initializing it with the optional initial value.
    * Returns a function to get or set the Observable's value.
    *
    * @param name - The name of the Observable instance to create or retrieve.
    * @param initialValue - Optional initial value to set for the Observable.
    * @returns A function to get or set the Observable's value.
    */
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

   return observe;

}));
