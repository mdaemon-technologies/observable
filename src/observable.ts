function getUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (
    char
  ) {
    var rand = (Math.random() * 16) | 0,
      val = char === "x" ? rand : (rand & 0x3) | 0x8;
    return val.toString(16);
  });
}

const is = (function () {
  const obj = (a: any) => {
    return typeof a === "object" && a !== null && !Array.isArray(a);
  };

  const num = (a: any) => {
    return typeof a === "number";
  };

  const str = (a: any) => {
    return typeof a === "string";
  };

  const arr = (a: any) => {
    return Array.isArray(a);
  };

  const undef = (a: any) => {
    return typeof a === "undefined";
  };

  const func = (a: any) => {
    return typeof a === "function";
  };

  const bool = (a: any) => {
    return typeof a === "boolean";
  };

  return {
    object: obj,
    number: num,
    string: str,
    array: arr,
    undef,
    func,
    bool
  };
}());

const updateProps = (a: any, b: any) => {
  let changed = false;
  if (!is.object(a) || !is.object(b)) {
    return false;
  }
  
  Object.keys(b).forEach(prop => {
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

const clone = (val: any): any => {
  if (is.object(val)) {
    const newVal = {};
    Object.keys(val).forEach((key) => {
      newVal[key] = clone(val[key]);
    });

    return newVal;
  }
  
  if (is.array(val)) {
    const newVal = val.map((item: any) => {
      return clone(item);
    });

    return newVal;
  }

  return val;
};

const deepEqual = (a: any, b: any) => {
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

    let i = a.length;
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

    let keys = Object.keys(a);
    let i = keys.length;
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
 * An interface defining an object with string keys and values of various types.
 */
interface UnknownKeys {
  [key: string]: boolean | string | number | observableType[] | UnknownKeys;
}

/**
 * Type alias for a value that can be a primitive type (boolean, string, number) 
 * or array/object containing those types. Allows creating recursive data structures.
 */
type observableType = boolean | string | number | observableType[] | UnknownKeys;

/**
 * Interface defining the shape of an observer object.
 * Contains an id string and an observe callback function.
 */
interface Observer {
  id: string;
  observe: Function;
}

/**
 * Constructor for the Observable class.
 * 
 * Initializes an Observable instance with the given name and initial value.
 * Stores the name, initial value, and empty observer array.
 * 
 * @param name - Name of the observable instance.
 * @param observable - Initial value of the observable.
 */
class Observable {

  name: string;

  value: undefined | observableType;

  observers: Observer[];

  constructor(name: string, observable: undefined | observableType) {
    this.name = name;
    this.value = observable;
    this.observers = [];
  }

  /**
 * Gets the current value of the observable.
 * 
 * @returns The current value of the observable. Returns a clone of the internal value to prevent mutation.
 */
  get(): undefined | observableType {
    return clone(this.value);
  }

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
  set(newValue: observableType): boolean {
    if (is.undef(this.value)) {
      this.value = clone(newValue);
      this.changed(undefined);
      return true;
    }

    const sameType = (is.array(newValue) && is.array(this.value)) ||
      (is.object(newValue) && is.object(this.value)) ||
      (is.number(newValue) && is.number(this.value)) ||
      (is.string(newValue) && is.string(this.value)) ||
      (is.bool(newValue)) && is.bool(this.value);

    if (sameType) {
      let changed = false;
      let oldValue = clone(this.value);
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
  }

  /**
 * Registers an observer function that will be called whenever the 
 * observable value changes. Returns an unsubscribe function that can
 * be called to stop observing.
 * 
 * @param observer - The observer function to call on value changes.
 * @returns A function that unsubscribes the observer.
 */
  observe(observer: Function): Function {
    const self = this;
    const newObserver: Observer = {
      id: getUuid(),
      observe: observer
    };
    this.observers.push(newObserver);

    return () => {
      self.stop(newObserver.id);
    };
  }

  /**
 * Unsubscribes an observer with the given ID.
 * 
 * @param id - The ID of the observer to unsubscribe.
 * @returns True if an observer was found and unsubscribed.
 */
  stop(id: string): boolean {
    let i = this.observers.length;
    while (i--) {
      if (this.observers[i].id === id) {
        this.observers.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  /**
 * Notifies all observers when the observable value changes.
 * 
 * @param oldValue - The previous value before the change.
 */
  changed(oldValue: undefined | observableType) {
    let newValue = this.get();

    this.observers.forEach((observer) => {
      observer.observe(newValue, oldValue);
    });
  }

}

const observables: Observable[] = [];

/**
 * Gets an Observable instance by name, creating it if it doesn't already exist.
 * 
 * @param name - The name of the Observable.
 * @param initialValue - Optional initial value to set.
 * @returns The Observable instance.
 */
function getObservable(name, initialValue?: observableType) {
  let observable = observables.find(o => o.name === name);
  if (initialValue !== undefined) {
    observable?.set(initialValue);
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
export default function observe(name: string, initialValue?: observableType) {
  const observable = getObservable(name, initialValue);
  const observe = (newValue?: Function | observableType) => {
    if (is.undef(newValue)) {
      return observable.get() as observableType;
    }

    if (typeof newValue === "function") {
      return observable.observe(newValue) as Function;
    }

    return observable.set(newValue as observableType);
  };

  return observe;
}