// In Node.js ESM context (type:module), the UMD wrapper falls through to the global
// registration branch, setting globalThis.observable = factory().
describe("UMD format (dist/observable.umd.js)", () => {
  let observe: Function;

  beforeAll(async () => {
    // Use a string-typed variable so TypeScript skips module resolution
    // (the .d.ts ambient declaration has no exports, which would cause TS2306)
    const umdPath: string = "../dist/observable.umd.js";
    await import(umdPath);
    observe = (globalThis as any).observable as Function;
  });

  it("sets the global 'observable' variable", () => {
    expect(typeof observe).toBe("function");
  });

  it("creates an observable that returns the initial value", () => {
    const x = observe("umd-num", 42) as Function;
    expect(x()).toBe(42);
  });

  it("returns true when value changes, false when unchanged", () => {
    const x = observe("umd-bool", true) as Function;
    expect(x(false)).toBe(true);
    expect(x(false)).toBe(false);
  });

  it("returns the current value with no arguments", () => {
    const x = observe("umd-str", "hello") as Function;
    expect(x()).toBe("hello");
    x("world");
    expect(x()).toBe("world");
  });

  it("notifies observers on change", (done) => {
    const x = observe("umd-obs", 0) as Function;
    const stop = x((newVal: number, oldVal: number) => {
      expect(newVal).toBe(1);
      expect(oldVal).toBe(0);
      stop();
      done();
    }) as Function;
    x(1);
  });

  it("does not notify observers when value is unchanged", () => {
    const x = observe("umd-nochange", 5) as Function;
    let called = false;
    const stop = x(() => { called = true; }) as Function;
    x(5);
    stop();
    expect(called).toBe(false);
  });
});

