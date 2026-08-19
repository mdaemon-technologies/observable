import observe, { type UnknownKeys } from "./observable";

describe("observable-tests", () => {
  describe("observe", () => {
    it("is a function", () => {
      expect(typeof observe).toBe("function");
    });

    it("can accept no initializing value", () => {
      let x = observe("x");
      expect(typeof x).toBe("function");
      expect(x()).toBe(undefined);
    }); 
    
    it("can accept a number", () => {
      let x = observe("x1", 1);
      expect(typeof x).toBe("function");
      expect(x()).toBe(1);
    });

    it("can accept a string", () => {
      let x = observe("x2", "test");
      expect(typeof x).toBe("function");
      expect(x()).toBe("test");
    });

    it("can accept a boolean", () => {
      let x = observe("x3", false);
      expect(typeof x).toBe("function");
      expect(x()).toBe(false);
    });

    it("can accept an array", () => {
      let x = observe("x4", []);
      expect(typeof x).toBe("function");
      expect(x()).toEqual([]);
    });

    it("can accept an object", () => {
      let x = observe("x5", {});
      expect(typeof x).toBe("function");
      expect(x()).toEqual({});
    });
  });
  
  describe("an observe value", () => {
    const x = observe("x6", 10);
    it("can be observed by passing in a function", done => {
      const stop = x((val, oldVal) => {
        expect(val).toBe(11);
        expect(oldVal).toBe(10);
        stop();
        done();
      });
      
      x(11);
    });

    it("cannot change the type of value once initialized", () => {
      const spy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const success = x("test");
      expect(success).toBe(false);
      expect(x()).toBe(11);

      // A type mismatch is no longer indistinguishable from "nothing changed".
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("holds number and cannot be set to string")
      );

      spy.mockRestore();
    });

    it("can see a change in an object", done => {
      const y = observe("y", { "a": 1 });
      const stop = y((val: any, oldVal: any) => {
        expect(val.a).toBe(2);
        expect(oldVal.a).toBe(1);
        expect(val).not.toBe(oldVal);
        stop();
      });

      y({ a: 2});

      const stop2 = y((val: any, oldVal: any) => {
        expect(val.a).toBe(2);
        expect(oldVal.a).toBe(2);
        expect(val.b).toBe(3);
        expect(oldVal.b).toBe(undefined);
        expect(val).not.toBe(oldVal);
        stop2();
        done();
      });

      y({ b: 3 });
    });

    it("can see when nothing changed in the object", () => {
      // Distinct name: a second observe("y", ...) no longer resets the existing value.
      const y = observe("y-unchanged", { a: 1 });
      expect(y({})).toBe(false);
      expect(y({ a: 1 })).toBe(false);
    });

    it("can see a change in an array", done => {
      const y = observe("y2", [1,2,3]);
      const stop = y((val: any, oldVal: any) => {
        expect(val).toEqual([]);
        expect(oldVal).toEqual([1,2,3]);
        stop();
      });

      y([]);

      const stop2 = y((val: any, oldVal: any) => {
        expect(val).toEqual([{test: 1}, {test: 2}]);
        expect(oldVal).toEqual([]);
        stop2();
        done();
      });

      y([{test: 1}, {test: 2}]);
    });

    it("handles circular references without infinite recursion", () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      const y = observe("circularTest", { x: 1 });
      
      // Should not throw or hang when comparing circular structures
      const result = y(circular);
      expect(result).toBe(true);

      // Setting the same circular reference again should detect no change
      const circular2: any = { a: 1 };
      circular2.self = circular2;
      expect(y(circular2)).toBe(false);
    });
  });


});
describe("security", () => {
  afterEach(() => {
    delete (Object.prototype as any).pwned;
    delete (Object.prototype as any).polluted;
  });

  it("does not pollute Object.prototype through a merged update", () => {
    const o = observe("proto-merge", { a: 1 });
    o(JSON.parse('{"__proto__":{"pwned":"yes"}}'));

    expect(({} as any).pwned).toBeUndefined();
    expect((Object.prototype as any).pwned).toBeUndefined();
  });

  it("does not corrupt the prototype of a cloned value", () => {
    const o = observe("proto-clone");
    o(JSON.parse('{"a":1,"__proto__":{"polluted":"yes"}}'));

    const value = o() as UnknownKeys;
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(value.polluted).toBeUndefined();
    expect(({} as any).polluted).toBeUndefined();
    expect(value.a).toBe(1);
  });

  it("ignores constructor/prototype keys in a payload", () => {
    const o = observe("proto-ctor", { a: 1 });
    o(JSON.parse('{"constructor":{"prototype":{"pwned":"yes"}}}'));

    expect(({} as any).pwned).toBeUndefined();
  });
});

describe("correctness regressions", () => {
  it("shrinks a nested array when the incoming array is shorter", () => {
    const o = observe("nested-shrink", { list: [1, 2, 3] });

    expect(o({ list: [1] })).toBe(true);
    expect(o()).toEqual({ list: [1] });
  });

  it("grows and clears a nested array", () => {
    const o = observe("nested-grow", { list: [1] });

    expect(o({ list: [1, 2, 3] })).toBe(true);
    expect(o()).toEqual({ list: [1, 2, 3] });
    expect(o({ list: [] })).toBe(true);
    expect(o()).toEqual({ list: [] });
    expect(o({ list: [] })).toBe(false);
  });
});

describe("type changes on nested values", () => {
  it("replaces a nested object with a primitive", () => {
    const o = observe("nested-type-1", { a: { b: 1 } });

    expect(o({ a: 5 })).toBe(true);
    expect(o()).toEqual({ a: 5 });
  });

  it("replaces a nested primitive with an object", () => {
    const o = observe("nested-type-2", { a: 5 });

    expect(o({ a: { b: 1 } })).toBe(true);
    expect(o()).toEqual({ a: { b: 1 } });
  });

  it("replaces a nested array with an object and back", () => {
    const o = observe("nested-type-3", { a: [1, 2] });

    expect(o({ a: { b: 1 } })).toBe(true);
    expect(o()).toEqual({ a: { b: 1 } });
    expect(o({ a: [3] })).toBe(true);
    expect(o()).toEqual({ a: [3] });
  });

  it("updates arrays nested inside arrays", () => {
    const o = observe("nested-type-4", { a: [[1, 2], [3]] });

    expect(o({ a: [[1], [3]] })).toBe(true);
    expect(o()).toEqual({ a: [[1], [3]] });
  });
});

describe("value isolation", () => {
  it("does not alias an array supplied by the caller", () => {
    const list = [1];
    const o = observe("isolation-array", { list: [] as any });

    o({ list });
    list.push(999);

    expect(o()).toEqual({ list: [1] });
  });

  it("does not alias an object supplied by the caller", () => {
    const nested = { count: 1 };
    const o = observe("isolation-object", { a: 1 });

    o({ nested });
    nested.count = 999;

    expect(o()).toEqual({ a: 1, nested: { count: 1 } });
  });

  it("does not alias objects pushed into a nested array", () => {
    const item = { id: 1 };
    const o = observe("isolation-array-item", { list: [] as any });

    o({ list: [item] });
    item.id = 999;

    expect(o()).toEqual({ list: [{ id: 1 }] });
  });
});

describe("observer notification", () => {
  it("notifies every observer even when one unsubscribes itself", () => {
    const o = observe("notify-unsub", 0);
    const calls: string[] = [];

    const stopOne = o(() => { calls.push("one"); stopOne(); });
    const stopTwo = o(() => { calls.push("two"); });

    o(1);
    expect(calls).toEqual(["one", "two"]);

    calls.length = 0;
    o(2);
    expect(calls).toEqual(["two"]);

    stopTwo();
  });

  it("notifies every observer when one unsubscribes another", () => {
    const o = observe("notify-unsub-other", 0);
    const calls: string[] = [];

    const stopOne = o(() => { calls.push("one"); stopThree(); });
    const stopTwo = o(() => { calls.push("two"); });
    const stopThree = o(() => { calls.push("three"); });

    o(1);
    expect(calls).toEqual(["one", "two"]);

    calls.length = 0;
    o(2);
    expect(calls).toEqual(["one", "two"]);

    stopOne();
    stopTwo();
  });
});

describe("observer errors", () => {
  it("isolates a throwing observer from the rest", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const o = observe("observer-throws", 0);
    const calls: string[] = [];

    const stopOne = o(() => { calls.push("one"); throw new Error("boom"); });
    const stopTwo = o(() => { calls.push("two"); });

    expect(() => o(1)).not.toThrow();
    expect(calls).toEqual(["one", "two"]);
    expect(spy).toHaveBeenCalled();

    stopOne();
    stopTwo();
    spy.mockRestore();
  });
});

describe("payload isolation between observers", () => {
  it("gives each observer its own copy of the new value", () => {
    const o = observe("payload-new", { a: 1 });
    let seen: any;

    const stopOne = o((val: any) => { val.a = "mutated"; });
    const stopTwo = o((val: any) => { seen = val.a; });

    o({ a: 2 });
    expect(seen).toBe(2);

    stopOne();
    stopTwo();
  });

  it("gives each observer its own copy of the old value", () => {
    const o = observe("payload-old", { a: 1 });
    let seen: any;

    const stopOne = o((_val: any, old: any) => { old.a = "mutated"; });
    const stopTwo = o((_val: any, old: any) => { seen = old.a; });

    o({ a: 2 });
    expect(seen).toBe(1);

    stopOne();
    stopTwo();
  });

  it("does not let an observer mutate the stored value", () => {
    const o = observe("payload-store", { a: 1 });
    const stop = o((val: any) => { val.a = "mutated"; });

    o({ a: 2 });
    expect(o()).toEqual({ a: 2 });

    stop();
  });
});

describe("get-or-create semantics", () => {
  it("does not reset an existing observable when an initial value is passed again", () => {
    const first = observe("get-or-create", 1);
    first(42);

    const second = observe("get-or-create", 1);
    expect(second()).toBe(42);
    expect(first()).toBe(42);
  });

  it("does not notify observers on a repeated lookup", () => {
    const o = observe("get-or-create-notify", { a: 1 });
    const calls: any[] = [];
    const stop = o((val: any) => calls.push(val));

    observe("get-or-create-notify", { a: 99 });
    expect(calls).toEqual([]);
    expect(o()).toEqual({ a: 1 });

    stop();
  });

  it("still seeds an observable that was created without a value", () => {
    const empty = observe("get-or-create-empty");
    expect(empty()).toBeUndefined();

    const seeded = observe("get-or-create-empty", "hello");
    expect(seeded()).toBe("hello");
    expect(empty()).toBe("hello");
  });

  it("does not alias an object passed as the initial value", () => {
    const initial = { a: 1 };
    const o = observe("get-or-create-alias", initial);

    initial.a = 999;
    expect(o()).toEqual({ a: 1 });
  });
});

describe("destroy", () => {
  it("stops observers when the observable is destroyed", () => {
    const o = observe("destroy-observers", 1);
    const calls: any[] = [];
    o((val: any) => calls.push(val));

    o("destroy-observable-destroy-observers");

    const fresh = observe("destroy-observers", 5);
    fresh(6);

    expect(calls).toEqual([]);
  });

  it("makes a stale handle inert instead of silently mutating an orphan", () => {
    const stale = observe("destroy-stale", 1);
    stale("destroy-observable-destroy-stale");

    expect(stale()).toBeUndefined();
    expect(stale(99)).toBe(false);
    expect(stale()).toBeUndefined();

    const fresh = observe("destroy-stale", 5);
    expect(fresh()).toBe(5);
  });

  it("does not resurrect an observer registered on a destroyed handle", () => {
    const stale = observe("destroy-late-observe", 1);
    stale("destroy-observable-destroy-late-observe");

    const calls: any[] = [];
    const stop = stale((val: any) => calls.push(val));

    const fresh = observe("destroy-late-observe", 5);
    fresh(6);

    expect(calls).toEqual([]);
    expect(typeof stop).toBe("function");
    expect(() => stop()).not.toThrow();
  });

  it("destroys a named observable through observe.destroy", () => {
    observe("destroy-api", "hello");

    expect(observe.destroy("destroy-api")).toBe(true);
    expect(observe.destroy("destroy-api")).toBe(false);
    expect((observe("destroy-api") as any)()).toBeUndefined();
  });

  it("does not let a stale handle destroy a replacement of the same name", () => {
    const stale = observe("destroy-replacement", 1);
    stale("destroy-observable-destroy-replacement");

    const fresh = observe("destroy-replacement", 5);
    stale("destroy-observable-destroy-replacement");

    expect(fresh()).toBe(5);
  });
});

describe("shared references", () => {
  it("updates every branch that points at the same incoming object", () => {
    const shared = { n: 2 };
    const o = observe("shared-refs", { x: { n: 1 }, y: { n: 1 } });

    expect(o({ x: shared, y: shared })).toBe(true);
    expect(o()).toEqual({ x: { n: 2 }, y: { n: 2 } });
  });

  it("does not skip the second branch when the stored value shares one target object", () => {
    const target = { n: 1 };
    const o = observe("shared-target", { x: target, y: target });

    expect(o({ x: { n: 2 }, y: { n: 3 } })).toBe(true);

    // x and y alias a single stored object, so last write wins. What matters is
    // that the y branch is visited at all -- it used to be skipped, leaving n at 1.
    const value = o() as any;
    expect(value.x.n).toBe(3);
    expect(value.y.n).toBe(3);
  });

  it("still terminates on circular input", () => {
    const circular: any = { n: 1 };
    circular.self = circular;

    const o = observe("shared-circular", { n: 0 });
    expect(o(circular)).toBe(true);
    expect((o() as any).n).toBe(1);
  });
});

describe("NaN handling", () => {
  it("does not report a change when NaN replaces NaN", () => {
    const o = observe("nan-primitive", NaN);

    expect(o(NaN)).toBe(false);
    expect(o(1)).toBe(true);
    expect(o(NaN)).toBe(true);
    expect(o(NaN)).toBe(false);
  });

  it("does not report a change for NaN nested in an object", () => {
    const o = observe("nan-object", { n: NaN });

    expect(o({ n: NaN })).toBe(false);
    expect(o({ n: 1 })).toBe(true);
  });

  it("does not report a change for NaN nested in an array", () => {
    const o = observe("nan-array", [NaN, 1]);

    expect(o([NaN, 1])).toBe(false);
    expect(o([NaN, 2])).toBe(true);
  });
});

describe("property removal", () => {
  it("deletes a property when it is set to undefined", () => {
    const o = observe("remove-prop", { test: 10, keep: 1 });

    expect(o({ test: undefined })).toBe(true);

    const value = o() as UnknownKeys;
    expect(Object.keys(value)).toEqual(["keep"]);
    expect("test" in value).toBe(false);
    expect(value).toEqual({ keep: 1 });
  });

  it("reports no change when removing a property that is not there", () => {
    const o = observe("remove-missing", { keep: 1 });

    expect(o({ gone: undefined })).toBe(false);
    expect(o()).toEqual({ keep: 1 });
  });

  it("notifies observers of a removal", () => {
    const o = observe("remove-notify", { test: 10 });
    const calls: any[] = [];
    const stop = o((val: any, old: any) => calls.push([val, old]));

    o({ test: undefined });

    expect(calls).toEqual([[{}, { test: 10 }]]);
    stop();
  });

  it("removes a nested property", () => {
    const o = observe("remove-nested", { a: { b: 1, c: 2 } });

    expect(o({ a: { b: undefined } })).toBe(true);
    expect(o()).toEqual({ a: { c: 2 } });
  });
});

describe("diagnostics", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("warns when a value is set to a different type", () => {
    const o = observe("diag-type", { a: 1 });

    expect(o([1, 2])).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("holds object and cannot be set to array")
    );
  });

  it("warns that a Date is not supported instead of degrading silently", () => {
    const o = observe("diag-date");

    o({ when: new Date(0) as unknown as UnknownKeys });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Date values are not supported"));
    expect(o()).toEqual({ when: {} });
  });

  it("does not warn for plain objects and arrays", () => {
    const o = observe("diag-plain", { a: 1, list: [1, 2], nested: { b: 2 } });

    o({ a: 2 });

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("notification during notification", () => {
  it("never delivers a stale value, whatever the value type", () => {
    // Objects are updated in place while arrays and primitives are reassigned.
    // A re-entrant write must look the same from an observer either way.
    const run = (name: string, init: any, next: any, later: any, read: (v: any) => any) => {
      const o = observe(name, init);
      const seen: any[] = [];
      const stopWriter = o((val: any) => { if (read(val) === 1) o(later); });
      const stopReader = o((val: any) => { seen.push(read(val)); });

      o(next);
      stopWriter();
      stopReader();

      return seen;
    };

    expect(run("reentrant-object", { n: 0 }, { n: 1 }, { n: 2 }, (v) => v.n)).toEqual([2, 2]);
    expect(run("reentrant-array", [0], [1], [2], (v) => v[0])).toEqual([2, 2]);
    expect(run("reentrant-number", 0, 1, 2, (v) => v)).toEqual([2, 2]);
  });

  it("does not call an observer registered during the round it was added in", () => {
    const o = observe("late-observer", 0);
    const calls: string[] = [];
    const stop = o(() => { calls.push("early"); o(() => calls.push("late")); });

    o(1);
    expect(calls).toEqual(["early"]);

    calls.length = 0;
    o(2);
    expect(calls).toEqual(["early", "late"]);

    stop();
  });

  it("stops notifying when an observer destroys the observable", () => {
    const o = observe("destroy-mid-round", 0);
    const calls: string[] = [];
    o(() => { calls.push("one"); o("destroy-observable-destroy-mid-round"); });
    o(() => { calls.push("two"); });

    expect(() => o(1)).not.toThrow();
    expect(calls).toEqual(["one"]);
    expect(o()).toBeUndefined();
  });
});

describe("undefined means absent", () => {
  it("drops undefined properties inside a replaced array", () => {
    const o = observe("undef-array", [{ a: 1 }]);

    expect(o([{ a: undefined } as never])).toBe(true);
    expect(Object.keys((o() as UnknownKeys[])[0])).toEqual([]);

    // The stored value and the comparison must agree, or an unchanged write
    // would report a change every single time.
    expect(o([{ a: undefined } as never])).toBe(false);
    expect(o([{}])).toBe(false);
  });

  it("drops undefined properties when seeding an observable", () => {
    const o = observe("undef-seed", { a: 1, gone: undefined } as never);

    expect(Object.keys(o() as UnknownKeys)).toEqual(["a"]);
  });
});

describe("reserved keys", () => {
  it("warns instead of silently discarding a reserved key", () => {
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const o = observe("reserved-warn", { company: "x" });

    o({ company: "y", constructor: "ACME Corp" } as never);

    expect(o()).toEqual({ company: "y" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('the reserved key "constructor" was ignored')
    );

    spy.mockRestore();
  });
});

describe("once", () => {
  it("invokes the observer exactly once and unsubscribes it", () => {
    const o = observe("once-basic", 0);
    const seen: number[] = [];

    o((val) => { seen.push(val as number); }, { once: true });

    o(1);
    o(2);
    o(3);

    expect(seen).toEqual([1]);
  });

  it("unsubscribes a once observer even when it throws", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const o = observe("once-throws", 0);
    let calls = 0;

    expect(() => {
      o(() => { calls += 1; throw new Error("boom"); }, { once: true });
      o(1);
      o(2);
    }).not.toThrow();

    // Removed before it ran, so the catch cannot strand it subscribed.
    expect(calls).toBe(1);
    spy.mockRestore();
  });

  it("does not re-enter a once observer that writes re-entrantly", () => {
    const o = observe("once-reentrant", 0);
    let calls = 0;

    o(() => { calls += 1; o(99); }, { once: true });
    o(1);

    expect(calls).toBe(1);
    expect(o()).toBe(99);
  });

  it("returns an unsubscribe that is safe to call after it has fired", () => {
    const o = observe("once-unsub", 0);
    const stop = o(() => undefined, { once: true });

    o(1);
    expect(stop()).toBe(false);
  });

  it("can be cancelled before it ever fires", () => {
    const o = observe("once-cancel", 0);
    let calls = 0;
    const stop = o(() => { calls += 1; }, { once: true });

    expect(stop()).toBe(true);
    o(1);
    expect(calls).toBe(0);
  });

  it("leaves other observers untouched", () => {
    const o = observe("once-mixed", 0);
    const seen: string[] = [];

    o(() => seen.push("once"), { once: true });
    const stop = o(() => seen.push("always"));

    o(1);
    o(2);

    expect(seen).toEqual(["once", "always", "always"]);
    stop();
  });
});

describe("immediate", () => {
  it("invokes the observer with the current value and no old value", () => {
    const o = observe("immediate-basic", { a: 1 });
    const seen: any[] = [];

    const stop = o((val, old) => { seen.push([val, old]); }, { immediate: true });

    expect(seen).toEqual([[{ a: 1 }, undefined]]);
    stop();
  });

  it("keeps observing after the immediate call", () => {
    const o = observe("immediate-continues", 1);
    const seen: number[] = [];

    const stop = o((val) => { seen.push(val as number); }, { immediate: true });
    o(2);
    o(3);

    expect(seen).toEqual([1, 2, 3]);
    stop();
  });

  it("does not fire when the observable has no value yet", () => {
    const o = observe("immediate-empty");
    const seen: any[] = [];

    const stop = o((val) => { seen.push(val); }, { immediate: true });
    expect(seen).toEqual([]);

    o(5);
    expect(seen).toEqual([5]);
    stop();
  });

  it("hands the observer its own copy, not the stored value", () => {
    const o = observe("immediate-isolation", { a: 1 });

    const stop = o((val) => { (val as UnknownKeys).a = "mutated"; }, { immediate: true });

    expect(o()).toEqual({ a: 1 });
    stop();
  });

  it("fires exactly once when combined with once", () => {
    const o = observe("immediate-once", 1);
    const seen: number[] = [];

    o((val) => { seen.push(val as number); }, { immediate: true, once: true });
    o(2);
    o(3);

    expect(seen).toEqual([1]);
  });

  it("does not let a throwing immediate observer break the subscription call", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const o = observe("immediate-throws", 1);

    let stop: Function | undefined;
    expect(() => { stop = o(() => { throw new Error("boom"); }, { immediate: true }); }).not.toThrow();
    expect(typeof stop).toBe("function");
    expect(spy).toHaveBeenCalled();

    (stop as Function)();
    spy.mockRestore();
  });
});

describe("registries", () => {
  it("isolates observables from the default registry", () => {
    const registry = observe.createRegistry();

    const shared = observe("registry-name", "default");
    const isolated = registry("registry-name", "isolated");

    expect(shared()).toBe("default");
    expect(isolated()).toBe("isolated");

    isolated("changed");
    expect(shared()).toBe("default");
  });

  it("keeps two custom registries independent", () => {
    const a = observe.createRegistry();
    const b = observe.createRegistry();

    a("dup", 1);
    b("dup", 2);

    expect(a("dup")()).toBe(1);
    expect(b("dup")()).toBe(2);
  });

  it("does not notify across registries", () => {
    const registry = observe.createRegistry();
    const seen: any[] = [];

    const outer = observe("cross-notify", 0);
    const stop = outer((val) => seen.push(val));

    registry("cross-notify", 0)(99);

    expect(seen).toEqual([]);
    stop();
  });

  it("scopes destroy to its own registry", () => {
    const registry = observe.createRegistry();

    observe("scoped-destroy", "default");
    registry("scoped-destroy", "isolated");

    expect(registry.destroy("scoped-destroy")).toBe(true);
    expect(registry.has("scoped-destroy")).toBe(false);
    expect(observe.has("scoped-destroy")).toBe(true);
    expect(observe("scoped-destroy")()).toBe("default");
  });

  it("exposes createRegistry on every registry it makes", () => {
    const nested = observe.createRegistry().createRegistry();

    nested("nested", 1);
    expect(nested.has("nested")).toBe(true);
    expect(observe.has("nested")).toBe(false);
  });
});

describe("registry introspection", () => {
  it("reports whether a name is registered", () => {
    const registry = observe.createRegistry();

    expect(registry.has("introspect")).toBe(false);
    registry("introspect", 1);
    expect(registry.has("introspect")).toBe(true);

    registry.destroy("introspect");
    expect(registry.has("introspect")).toBe(false);
  });

  it("lists names in creation order", () => {
    const registry = observe.createRegistry();

    registry("first", 1);
    registry("second", 2);
    registry("third", 3);

    expect(registry.names()).toEqual(["first", "second", "third"]);

    registry.destroy("second");
    expect(registry.names()).toEqual(["first", "third"]);
  });

  it("returns a copy that cannot mutate the registry", () => {
    const registry = observe.createRegistry();
    registry("copy-check", 1);

    const names = registry.names();
    names.push("injected");
    names.length = 0;

    expect(registry.names()).toEqual(["copy-check"]);
    expect(registry.has("copy-check")).toBe(true);
  });
});

describe("option edge cases", () => {
  it("degrades immediate to the first change when there is no value yet", () => {
    const o = observe("immediate-once-empty");
    const seen: any[] = [];

    o((val) => seen.push(val), { immediate: true, once: true });

    o(5);
    o(6);

    expect(seen).toEqual([5]);
  });

  it("treats empty and omitted options as a plain subscription", () => {
    const o = observe("options-empty", 1);
    const seen: any[] = [];

    const stopA = o((val) => seen.push(val), {});
    const stopB = o((val) => seen.push(val), undefined);

    o(2);

    expect(seen).toEqual([2, 2]);
    stopA();
    stopB();
  });

  it("does not let an immediate observer unsubscribe itself synchronously", () => {
    // The caller's `const stop = ...` binding is not assigned while the immediate
    // callback runs, so calling it there is a ReferenceError. It is contained and
    // logged rather than thrown at the caller; use { once: true } instead.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const o = observe("immediate-self-unsub", 1);

    let stop: Function | undefined;
    expect(() => { stop = o(() => { (stop as Function)(); }, { immediate: true }); }).not.toThrow();

    expect(spy).toHaveBeenCalled();
    expect(typeof stop).toBe("function");

    (stop as Function)();
    spy.mockRestore();
  });
});

describe("registry teardown", () => {
  it("scopes the destroy sentinel to its own registry", () => {
    const registry = observe.createRegistry();

    observe("sentinel-scope", "outer");
    const inner = registry("sentinel-scope", "inner");

    inner("destroy-observable-sentinel-scope");

    expect(registry.has("sentinel-scope")).toBe(false);
    expect(observe.has("sentinel-scope")).toBe(true);
    expect(observe("sentinel-scope")()).toBe("outer");
  });

  it("keeps the stale-handle guard inside a custom registry", () => {
    const registry = observe.createRegistry();

    const stale = registry("stale-scoped", 1);
    stale("destroy-observable-stale-scoped");
    registry("stale-scoped", 2);
    stale("destroy-observable-stale-scoped");

    expect(registry.names()).toEqual(["stale-scoped"]);
    expect(registry("stale-scoped")()).toBe(2);
  });
});
