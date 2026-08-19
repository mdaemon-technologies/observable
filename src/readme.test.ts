import observe from "./observable";
import type { Unsubscribe, ObserveFunction } from "./observable";

// Executes the README's documented examples and asserts the results the
// README claims, so the documentation cannot drift from behavior.
describe("README examples", () => {
  it("core walkthrough", () => {
    const observedNumber = observe("numberName", 20);
    const obj = {};
    const observedObject = observe("objectName", obj);
    observe("arrayName", []);
    observe("boolName", true);
    observe("stringName", "test");

    expect(observedNumber(30)).toBe(true);
    expect(observedNumber(30)).toBe(false);
    expect(observedNumber() === 30).toBe(true);

    const logged: any[] = [];
    const stopObservingValue = observedNumber((newValue, oldValue) => {
      logged.push([newValue, oldValue, newValue === oldValue]);
    });
    observedNumber(3);
    expect(logged).toEqual([[3, 30, false]]);

    stopObservingValue();
    observedNumber(60);
    expect(logged.length).toBe(1); // "nothing logged"

    const objLog: any[] = [];
    const stopObservingObject = observedObject((newValue) => { objLog.push(newValue); });
    expect(observedObject({ test: 10 })).toBe(true);
    expect(objLog).toEqual([{ test: 10 }]);

    observedObject({ test: undefined } as never);
    expect(observedObject()).toEqual({});           // "// { }"
    expect(Object.keys(observedObject() as object)).toEqual([]);
    stopObservingObject();

    const str = observe("stringName");
    expect(str()).toBe("test");
  });

  it("initial values only apply on creation", () => {
    const first = observe("counter", 0);
    first(42);

    const second = observe("counter", 0);
    expect(second()).toBe(42);          // "42, not 0"

    const empty = observe("pending");
    expect(empty()).toBeUndefined();
    expect(observe("pending", 1)()).toBe(1);
  });

  it("typescript example compiles and behaves", () => {
    const count = observe("tsdoc-count", 0);

    const value = count();
    const stop: Unsubscribe = count(() => undefined);
    const changed = count(1);
    const registry: ObserveFunction = observe.createRegistry();

    expect(value).toBe(0);
    expect(changed).toBe(true);
    expect(typeof stop).toBe("function");
    expect(typeof registry.names).toBe("function");
    stop();
  });

  it("subscription options", () => {
    const count = observe("count", 0);
    const onceLog: any[] = [];
    const immediateLog: any[] = [];
    const bothLog: any[] = [];

    count((newValue) => { onceLog.push(newValue); }, { once: true });
    const stop = count((newValue, oldValue) => { immediateLog.push([newValue, oldValue]); }, { immediate: true });
    expect(immediateLog).toEqual([[0, undefined]]);   // "0 undefined <- immediately"

    count((newValue) => bothLog.push(newValue), { immediate: true, once: true });
    expect(bothLog).toEqual([0]);

    count(1);
    expect(onceLog).toEqual([1]);
    expect(bothLog).toEqual([0]);                      // fired once, right now, not again
    stop();
  });

  it("registries", () => {
    const registry = observe.createRegistry();

    observe("user", "shared");
    registry("user", "isolated");

    expect(observe("user")()).toBe("shared");
    expect(registry("user")()).toBe("isolated");

    expect(observe.has("user")).toBe(true);
    expect(observe.names()).toContain("user");
    expect(observe.destroy("user")).toBe(true);
    expect(observe.has("user")).toBe(false);
  });

  it("objects merge, arrays replace", () => {
    const obj = observe("mergeExample", { a: 1 });
    obj({ b: 2 });
    expect(obj()).toEqual({ a: 1, b: 2 });

    obj({ a: undefined } as never);
    expect(obj()).toEqual({ b: 2 });

    const arr = observe("replaceExample", [1, 2, 3]);
    arr([1]);
    expect(arr()).toEqual([1]);

    const nested = observe("nestedExample", { list: [1, 2, 3] });
    nested({ list: [1] });
    expect(nested()).toEqual({ list: [1] });
  });

  it("destroying an observable", () => {
    observe("destroyDoc", "test");
    const str = observe("destroyDoc");
    str("destroy-observable-destroyDoc");

    const fresh = observe("destroyDoc");
    expect(fresh()).toBeUndefined();

    observe("destroyDoc2", "x");
    expect(observe.destroy("destroyDoc2")).toBe(true);
  });

  it("initial value is cloned, as the README claims", () => {
    const obj: any = {};
    const observedObject = observe("cloneClaim", obj);
    obj.mutated = true;
    expect(observedObject()).toEqual({});
  });
});
