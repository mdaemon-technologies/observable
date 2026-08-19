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
declare const _default: ObserveFunction;
export default _default;
export type { observableType, UnknownKeys, ObserverCallback, ObserveOptions, Unsubscribe, ObservableFunction, ObserveFunction, };
