function getUuid(): string {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char: string) => {
    const rand: number = (Math.random() * 16) | 0;
    const val = char === "x" ? rand : (rand & 0x3) | 0x8;
    return val.toString(16);
  });
}

const is = (() => {
  const isType = <T>(value: T, type: string): boolean => typeof value === type;

  return {
    object: <T>(value: T): boolean => isType(value, "object") && value !== null && !Array.isArray(value),
    number: <T>(value: T): boolean => isType(value, "number"),
    string: <T>(value: T): boolean => isType(value, "string"),
    array: <T>(value: T): boolean => Array.isArray(value),
    undef: <T>(value: T): boolean => isType(value, "undefined"),
    func: <T>(value: T): boolean => isType(value, "function"),
    bool: <T>(value: T): boolean => isType(value, "boolean"),
  };
})();

const isSameType = (a: observableType, b: observableType): boolean => {
  return (
    (is.array(a) && is.array(b)) ||
    (is.object(a) && is.object(b)) ||
    (is.number(a) && is.number(b)) ||
    (is.string(a) && is.string(b)) ||
    (is.bool(a) && is.bool(b))
  );
};

const updateProps = (a: observableType, b: observableType): boolean => {
  if (!is.object(a) || !is.object(b)) return false;

  let changed = false;
  Object.keys(b).forEach((prop: string) => {
    if (is.object(a[prop])) {
      changed = updateProps(a[prop], b[prop]);
    } else if (is.array(a[prop]) && is.array(b[prop])) {
      changed = updateArrayProps(a[prop], b[prop]);
    } else if (a[prop] !== b[prop]) {
      a[prop] = b[prop];
      changed = true;
    }
  });

  return changed;
};

const updateArrayProps = (a: observableType[], b: observableType[]): boolean => {
  let changed = false;
  for (let i = 0, iMax = b.length; i < iMax; i++) {
    if (is.object(a[i])) {
      changed = updateProps(a[i], b[i]);
    } else if (a[i] !== b[i]) {
      a[i] = b[i];
      changed = true;
    }
  }
  return changed;
};

const clone = (val: observableType): observableType => {
  if (is.object(val)) {
    const newVal: observableType = {};
    for (const key in val as any) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        newVal[key] = clone(val[key]);
      }
    }
    return newVal as observableType;
  }

  if (Array.isArray(val)) {
    return val.map((item: observableType) => clone(item)) as observableType;
  }

  return val;
};

const deepEqual = (a: observableType, b: observableType, memo = new WeakMap()): boolean => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) return arraysEqual(a, b, memo);

  if (is.object(a) && is.object(b)) return objectsEqual(a as UnknownKeys, b as UnknownKeys, memo);

  return false;
};

const arraysEqual = (a: observableType[], b: observableType[], memo: WeakMap<object, any>): boolean => {
  if (a.length !== b.length) return false;
  return a.every((item, index) => deepEqual(item, b[index]), memo);
};

const objectsEqual = (a: UnknownKeys, b: UnknownKeys, memo: WeakMap<object, any>): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(a[key], b[key]), memo);
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
    return typeof this.value === "undefined" ? undefined : clone(this.value);
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
    if (typeof this.value === "undefined") {
      this.value = clone(newValue);
      this.changed(undefined);
      return true;
    }

    const sameType = isSameType(newValue, this.value);
    if (sameType) {
      let changed = false;
      const oldValue = clone(this.value);
      if (is.array(this.value)) {
        changed = !deepEqual(this.value, newValue);
        this.value = clone(newValue);
      } else if (is.object(this.value)) {
        changed = updateProps(this.value, newValue);
      } else {
        changed = this.value !== newValue;
        this.value = newValue;
      }
      if (changed) this.changed(oldValue);
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

    if (newValue === "destroy-observable-" + name) {
      const index = observables.indexOf(observable);
      if (index > -1) {
        observables.splice(index, 1);
      }
      return;
    }

    if (typeof newValue === "function") {
      return observable.observe(newValue) as Function;
    }

    return observable.set(newValue as observableType);
  };

  return observe;
}