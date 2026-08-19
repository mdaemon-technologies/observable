/**
 * Observer handles are internal to this module, so a monotonic counter is both
 * collision-free and cheaper than a random UUID.
 */
let observerCount = 0;

const nextObserverId = (): string => `observer-${++observerCount}`;

/**
 * Type guards rather than plain boolean checks, so narrowing survives the call
 * and callers do not have to assert the type back with `as`.
 */
const is = {
  object: (value: unknown): value is UnknownKeys =>
    typeof value === "object" && value !== null && !Array.isArray(value),
  number: (value: unknown): value is number => typeof value === "number",
  string: (value: unknown): value is string => typeof value === "string",
  array: (value: unknown): value is observableType[] => Array.isArray(value),
  undef: (value: unknown): value is undefined => typeof value === "undefined",
  func: (value: unknown): value is ObserverCallback => typeof value === "function",
  bool: (value: unknown): value is boolean => typeof value === "boolean",
};

/**
 * Reports a misuse without throwing. Guarded because `console` is not
 * guaranteed to exist in every host the UMD build runs in.
 */
const warn = (message: string): void => {
  if (typeof console !== "undefined" && console.warn) {
    console.warn(`observable: ${message}`);
  }
};

/**
 * Values are cloned structurally into plain objects, so anything with its own
 * prototype (Date, Map, Set, RegExp, class instances) silently loses its
 * identity and its data. Warn instead of degrading in silence.
 */
const warnUnsupportedType = (val: UnknownKeys): void => {
  const proto = Object.getPrototypeOf(val);
  if (proto === Object.prototype || proto === null) return;

  const name = val.constructor && (val.constructor as Function).name;
  warn(
    `${name || "non-plain object"} values are not supported and were copied as a plain object; ` +
    `only booleans, strings, numbers, plain objects and arrays round-trip intact`
  );
};

/**
 * Reports the observable-facing type name of a value for diagnostics.
 */
const typeName = (value: observableType | undefined): string => {
  if (is.array(value)) return "array";
  if (is.object(value)) return "object";
  return typeof value;
};

/**
 * Keys that must never be copied from untrusted input. Assigning to any of
 * these walks into the prototype chain and lets a crafted payload (for
 * example `JSON.parse('{"__proto__":{"isAdmin":true}}')`) write onto
 * Object.prototype. See CWE-1321.
 */
const UNSAFE_KEYS = ["__proto__", "constructor", "prototype"];

const isUnsafeKey = (key: string): boolean => UNSAFE_KEYS.indexOf(key) > -1;

/**
 * Reports a dropped reserved key. Skipping it is required to stay safe, but a
 * payload can carry one as ordinary data, so the loss must not be silent.
 */
const skipUnsafeKey = (key: string): boolean => {
  if (!isUnsafeKey(key)) return false;

  warn(`the reserved key "${key}" was ignored; it cannot be stored safely`);

  return true;
};

/**
 * Assigns an own, enumerable property without invoking any inherited setter.
 */
const setProp = (obj: UnknownKeys, key: string, value: observableType | undefined): void => {
  Object.defineProperty(obj, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

/**
 * Tracks visited (source, target) pairs rather than bare sources, so a value
 * reachable by more than one path is still processed against each of its
 * counterparts while genuine cycles are still broken.
 */
type PairTracker = WeakMap<object, WeakSet<object>>;

const hasPair = (tracker: PairTracker, a: object, b: object): boolean => {
  const partners = tracker.get(a);
  return !!partners && partners.has(b);
};

const addPair = (tracker: PairTracker, a: object, b: object): void => {
  let partners = tracker.get(a);
  if (!partners) {
    partners = new WeakSet();
    tracker.set(a, partners);
  }
  partners.add(b);
};

const isSameType = (a: observableType, b: observableType): boolean => {
  return (
    (is.array(a) && is.array(b)) ||
    (is.object(a) && is.object(b)) ||
    (is.number(a) && is.number(b)) ||
    (is.string(a) && is.string(b)) ||
    (is.bool(a) && is.bool(b))
  );
};

const updateProps = (a: observableType, b: observableType, seen: PairTracker = new WeakMap()): boolean => {
  if (!is.object(a) || !is.object(b)) return false;

  // Handle circular references without skipping shared, non-cyclic branches
  if (hasPair(seen, a, b)) return false;
  addPair(seen, a, b);

  let changed = false;
  Object.keys(b).forEach((prop: string) => {
    if (skipUnsafeKey(prop)) return;

    // Hoisted so the guards below narrow: TypeScript does not carry narrowing
    // through an element access keyed by a non-literal string.
    const aVal = a[prop];
    const bVal = b[prop];

    // Documented removal: assigning undefined deletes the property outright
    // rather than leaving a key behind with an undefined value.
    if (is.undef(bVal)) {
      if (Object.prototype.hasOwnProperty.call(a, prop)) {
        delete a[prop];
        changed = true;
      }
      return;
    }

    if (is.object(aVal) && is.object(bVal)) {
      if (updateProps(aVal, bVal, seen)) changed = true;
    } else if (is.array(aVal) && is.array(bVal)) {
      if (updateArrayProps(aVal, bVal, seen)) changed = true;
    } else if (!sameValue(aVal, bVal)) {
      // Clone so the store never holds a reference the caller can mutate behind our back.
      setProp(a, prop, clone(bVal));
      changed = true;
    }
  });

  return changed;
};

const updateArrayProps = (a: observableType[], b: observableType[], seen: PairTracker = new WeakMap()): boolean => {
  // Handle circular references without skipping shared, non-cyclic branches
  if (hasPair(seen, a, b)) return false;
  addPair(seen, a, b);

  let changed = false;
  for (let i = 0, iMax = b.length; i < iMax; i++) {
    const aVal = a[i];
    const bVal = b[i];

    if (is.object(aVal) && is.object(bVal)) {
      if (updateProps(aVal, bVal, seen)) changed = true;
    } else if (is.array(aVal) && is.array(bVal)) {
      if (updateArrayProps(aVal, bVal, seen)) changed = true;
    } else if (!sameValue(aVal, bVal)) {
      // Clone so the store never holds a reference the caller can mutate behind our back.
      a[i] = clone(bVal);
      changed = true;
    }
  }

  // A shorter incoming array truncates the target; arrays are replaced, not merged.
  if (a.length > b.length) {
    a.length = b.length;
    changed = true;
  }

  return changed;
};

function clone(val: observableType, seen?: WeakMap<object, observableType>): observableType;
function clone(val: observableType | undefined, seen?: WeakMap<object, observableType>): observableType | undefined;
function clone(
  val: observableType | undefined,
  seen: WeakMap<object, observableType> = new WeakMap()
): observableType | undefined {
  if (is.object(val)) {
    // Handle circular references
    const cached = seen.get(val);
    if (cached) return cached;

    warnUnsupportedType(val);

    const newVal: UnknownKeys = {};
    seen.set(val, newVal);
    for (const key in val) {
      if (!Object.prototype.hasOwnProperty.call(val, key)) continue;
      if (skipUnsafeKey(key)) continue;

      // An undefined property value means "absent" everywhere, matching the
      // documented removal API and JSON semantics.
      const item = val[key];
      if (is.undef(item)) continue;

      setProp(newVal, key, clone(item, seen));
    }
    return newVal;
  }

  if (is.array(val)) {
    // Handle circular references
    const cached = seen.get(val);
    if (cached) return cached;

    const newArr: observableType[] = [];
    seen.set(val, newArr);
    for (const item of val) {
      newArr.push(clone(item, seen));
    }
    return newArr;
  }

  return val;
}

/**
 * Primitive equality that treats NaN as equal to itself, so setting NaN over
 * NaN is not reported as a change on every call.
 */
const sameValue = (a: observableType | undefined, b: observableType | undefined): boolean => {
  if (a === b) return true;
  return typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b);
};

const deepEqual = (
  a: observableType | undefined,
  b: observableType | undefined,
  memo: PairTracker = new WeakMap()
): boolean => {
  if (sameValue(a, b)) return true;
  if (typeof a !== typeof b) return false;

  // Handle circular references. Tracking pairs (not just the left side) means
  // comparing one value against several counterparts no longer loses history.
  // A pair already in progress is assumed equal: any real mismatch elsewhere
  // short-circuits the whole comparison to false before this can matter.
  if ((is.object(a) || is.array(a)) && (is.object(b) || is.array(b))) {
    if (hasPair(memo, a, b)) return true;
    addPair(memo, a, b);
  }

  if (is.array(a) && is.array(b)) return arraysEqual(a, b, memo);

  if (is.object(a) && is.object(b)) return objectsEqual(a, b, memo);

  return false;
};

const arraysEqual = (a: observableType[], b: observableType[], memo: PairTracker): boolean => {
  if (a.length !== b.length) return false;
  return a.every((item, index) => deepEqual(item, b[index], memo));
};

const definedKeys = (val: UnknownKeys): string[] =>
  Object.keys(val).filter((key) => !is.undef(val[key]));

const objectsEqual = (a: UnknownKeys, b: UnknownKeys, memo: PairTracker): boolean => {
  // Keys holding undefined are treated as absent, so they never register as a
  // difference against a value that simply omits them.
  const aKeys = definedKeys(a);
  const bKeys = definedKeys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual(a[key], b[key], memo));
};

/**
 * An interface defining an object with string keys and values of various types.
 */
interface UnknownKeys {
  [key: string]: boolean | string | number | undefined | observableType[] | UnknownKeys;
}

/**
 * Type alias for a value that can be a primitive type (boolean, string, number) 
 * or array/object containing those types. Allows creating recursive data structures.
 */
type observableType = boolean | string | number | observableType[] | UnknownKeys;

/**
 * A subscriber invoked with a fresh copy of the value on every change.
 * `oldValue` is undefined the first time an uninitialized observable is set.
 */
type ObserverCallback = (newValue: observableType, oldValue: observableType | undefined) => void;

/**
 * Returned by a subscription. Calling it removes the observer and reports
 * whether it was still registered.
 */
type Unsubscribe = () => boolean;

/**
 * Per-subscription options. Deliberately per subscription rather than per
 * observable: observables are shared by name across unrelated modules, so one
 * subscriber must never be able to change how another one is notified.
 */
type ObserveOptions = {
  /** Invoke the observer at most once, then unsubscribe it automatically. */
  once?: boolean;
  /**
   * Invoke the observer immediately with the current value and an undefined
   * old value. Skipped when the observable has no value yet.
   */
  immediate?: boolean;
};

/**
 * The accessor returned by `observe`. One call signature per role:
 * read, subscribe, or write.
 */
type ObservableFunction = {
  /** Reads the current value, or undefined if the observable has no value yet. */
  (): observableType | undefined;
  /** Subscribes to changes and returns an unsubscribe function. */
  (observer: ObserverCallback, options?: ObserveOptions): Unsubscribe;
  /** Writes a value and reports whether it changed. Returns undefined for the destroy sentinel. */
  (newValue: observableType): boolean | undefined;
};

/**
 * Interface defining the shape of an observer object.
 * Contains an id string and an observe callback function.
 */
interface Observer {
  id: string;
  observe: ObserverCallback;
  once: boolean;
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

  readonly name: string;

  private value: undefined | observableType;

  private observers: Observer[];

  private destroyed: boolean;

  constructor(name: string, observable: undefined | observableType) {
    this.name = name;
    this.value = observable;
    this.observers = [];
    this.destroyed = false;
  }

  /**
 * Tears the observable down: drops every observer and clears the value so any
 * handle still held by a caller becomes an inert no-op instead of silently
 * operating on an instance nobody else can reach.
 */
  hasValue(): boolean {
    return !is.undef(this.value);
  }

  destroy(): void {
    this.destroyed = true;
    this.observers = [];
    this.value = undefined;
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
 * A write must keep the observable's type: setting a number observable to a
 * string is refused, warns, and returns false.
 *
 * **Objects merge, arrays replace.** This asymmetry is deliberate, not an
 * oversight, and consumers depend on it:
 *
 * - Setting an object merges the incoming keys into the stored value, so
 *   `set({ b: 2 })` on `{ a: 1 }` yields `{ a: 1, b: 2 }`. Removing a key means
 *   setting it to `undefined`.
 * - Setting an array replaces the stored value wholesale, so a shorter array
 *   truncates. Arrays nested inside an object follow the same replace rule.
 *
 * Do not "unify" these two paths: replacing the object merge with wholesale
 * replacement silently discards keys every existing caller expects to survive.
 *
 * Incoming values are cloned before they are stored, so the observable never
 * holds a reference the caller can mutate afterwards.
 *
 * @param newValue - The new value to set for the observable.
 * @returns True if the value changed, false otherwise.
 */
  set(newValue: observableType): boolean {
    if (this.destroyed) return false;

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
        changed = !sameValue(this.value, newValue);
        this.value = newValue;
      }
      if (changed) this.changed(oldValue);
      return changed;
    }

    warn(
      `"${this.name}" holds ${typeName(this.value)} and cannot be set to ${typeName(newValue)}; ` +
      `the value was left unchanged`
    );

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
  observe(observer: ObserverCallback, options?: ObserveOptions): Unsubscribe {
    if (this.destroyed) return () => false;

    const newObserver: Observer = {
      id: nextObserverId(),
      observe: observer,
      once: options?.once === true
    };
    this.observers.push(newObserver);

    // Registered before the immediate call so that a `once` observer can remove
    // itself, and so an unsubscribe issued from inside the callback still finds it.
    if (options?.immediate === true) {
      const value = this.value;
      if (!is.undef(value)) this.deliver(newObserver, value, undefined);
    }

    return () => this.stop(newObserver.id);
  }

  /**
 * Invokes a single observer with its own copies of the values.
 *
 * @param observer - The observer to invoke.
 * @param newValue - The current value.
 * @param oldValue - The previous value, or undefined.
 */
  private deliver(observer: Observer, newValue: observableType, oldValue: undefined | observableType): void {
    // A `once` observer is removed before it runs, not after: the catch below
    // would otherwise leave a throwing observer subscribed forever, and a
    // re-entrant write from inside the callback must not re-enter it.
    if (observer.once) this.stop(observer.id);

    try {
      // Clone per observer so one subscriber cannot mutate what the next one sees.
      observer.observe(clone(newValue), clone(oldValue));
    } catch (err) {
      // One subscriber's failure must not silence the others.
      if (typeof console !== "undefined" && console.error) {
        console.error(`observable "${this.name}": observer threw during notification`, err);
      }
    }
  }

  /**
 * Unsubscribes an observer with the given ID.
 * 
 * @param id - The ID of the observer to unsubscribe.
 * @returns True if an observer was found and unsubscribed.
 */
  private stop(id: string): boolean {
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
  private changed(oldValue: undefined | observableType): void {
    // Iterate a snapshot: an observer that unsubscribes itself (or anyone else)
    // during notification would otherwise shift the live array and skip observers.
    // Observers removed mid-notification are skipped rather than called.
    this.observers.slice().forEach((observer) => {
      if (this.observers.indexOf(observer) === -1) return;

      // Re-read per observer rather than capturing once. If a subscriber writes
      // again re-entrantly, later observers in this round must still see current
      // state, never a stale value -- and that has to hold for every value type.
      // Objects are updated in place while arrays and primitives are reassigned,
      // so a single captured reference would be fresh for one and stale for the
      // other.
      const newValue = this.value;
      if (is.undef(newValue)) return;

      this.deliver(observer, newValue, oldValue);
    });
  }

}

/**
 * The module's entry point: a callable registry of named observables.
 */
type ObserveFunction = {
  /**
   * Creates an Observable for the given name, or returns the existing one.
   * An initial value seeds an observable that has none; it never resets one
   * that is already initialized.
   */
  (name: string, initialValue?: observableType): ObservableFunction;
  /**
   * Destroys the named Observable without going through the
   * "destroy-observable-<name>" string. Use this for string observables, whose
   * legitimate values can otherwise collide with that sentinel.
   */
  destroy(name: string): boolean;
  /** Reports whether an Observable is registered under this name. */
  has(name: string): boolean;
  /** Lists the registered names, in creation order. */
  names(): string[];
  /**
   * Creates an independent registry with its own namespace. Observables in one
   * registry are invisible to every other, so two unrelated consumers can both
   * use the name "user" without sharing state.
   */
  createRegistry(): ObserveFunction;
};

/**
 * Builds a registry: a namespace of observables plus the function used to reach
 * them. The module's default export is one of these, shared by every importer;
 * calling `createRegistry()` produces another that shares nothing with it.
 *
 * @returns A callable registry.
 */
function createRegistry(): ObserveFunction {
  const observables = new Map<string, Observable>();

  /**
   * Gets an Observable instance by name, creating it if it doesn't already exist.
   *
   * @param name - The name of the Observable.
   * @param initialValue - Optional initial value to set.
   * @returns The Observable instance.
   */
  function getObservable(name: string, initialValue?: observableType) {
    const existing = observables.get(name);
    if (existing) {
      // An observable that was created without a value still accepts a seed value;
      // an initialized one is never reset by a later lookup.
      if (!is.undef(initialValue) && !existing.hasValue()) {
        existing.set(initialValue);
      }
      return existing;
    }

    const observable = new Observable(name, clone(initialValue));
    observables.set(name, observable);

    return observable;
  }

  /**
   * Removes an Observable from this registry and tears it down, dropping every
   * observer so nothing keeps firing against a discarded instance.
   *
   * @param name - The name of the Observable to destroy.
   * @returns True if an Observable with that name existed.
   */
  function destroyObservable(name: string): boolean {
    const observable = observables.get(name);
    return observable ? removeObservable(observable) : false;
  }

  /**
   * Tears down a specific Observable instance and drops it from this registry.
   *
   * @param observable - The instance to remove.
   * @returns True if the instance was still registered.
   */
  function removeObservable(observable: Observable): boolean {
    // Identity check: a stale handle must not evict a replacement that was
    // registered under the same name after it was destroyed.
    const wasRegistered = observables.get(observable.name) === observable;
    if (wasRegistered) {
      observables.delete(observable.name);
    }

    observable.destroy();

    return wasRegistered;
  }

  /**
   * Creates an Observable instance for the given name, initializing it with the optional initial value.
   * Returns a function to get or set the Observable's value.
   *
   * @param name - The name of the Observable instance to create or retrieve.
   * @param initialValue - Optional initial value to set for the Observable.
   * @returns A function to get or set the Observable's value.
   */
  function observe(name: string, initialValue?: observableType): ObservableFunction {
    const observable = getObservable(name, initialValue);

    function accessor(): observableType | undefined;
    function accessor(observer: ObserverCallback, options?: ObserveOptions): Unsubscribe;
    function accessor(newValue: observableType): boolean | undefined;
    function accessor(
      newValue?: ObserverCallback | observableType,
      options?: ObserveOptions
    ): observableType | Unsubscribe | boolean | undefined {
      if (is.undef(newValue)) {
        return observable.get();
      }

      if (newValue === "destroy-observable-" + name) {
        removeObservable(observable);
        return;
      }

      if (is.func(newValue)) {
        return observable.observe(newValue, options);
      }

      return observable.set(newValue);
    }

    return accessor;
  }

  observe.destroy = (name: string): boolean => destroyObservable(name);

  observe.has = (name: string): boolean => observables.has(name);

  // A fresh array each call: the caller must not be handed the registry's keys.
  observe.names = (): string[] => Array.from(observables.keys());

  observe.createRegistry = createRegistry;

  return observe;
}

export default createRegistry();
export type {
  observableType,
  UnknownKeys,
  ObserverCallback,
  ObserveOptions,
  Unsubscribe,
  ObservableFunction,
  ObserveFunction,
};
