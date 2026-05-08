import { createRequire } from "module";

const _require = createRequire(import.meta.url);

describe("CJS format (dist/observable.cjs)", () => {
  const observe = _require("../dist/observable.cjs") as Function;

  it("exports a function", () => {
    expect(typeof observe).toBe("function");
  });

  it("creates an observable that returns the initial value", () => {
    const x = observe("cjs-num", 42) as Function;
    expect(x()).toBe(42);
  });

  it("returns true when value changes, false when unchanged", () => {
    const x = observe("cjs-bool", true) as Function;
    expect(x(false)).toBe(true);
    expect(x(false)).toBe(false);
  });

  it("returns the current value with no arguments", () => {
    const x = observe("cjs-str", "hello") as Function;
    expect(x()).toBe("hello");
    x("world");
    expect(x()).toBe("world");
  });

  it("notifies observers on change", (done) => {
    const x = observe("cjs-obs", 0) as Function;
    const stop = x((newVal: number, oldVal: number) => {
      expect(newVal).toBe(1);
      expect(oldVal).toBe(0);
      stop();
      done();
    }) as Function;
    x(1);
  });

  it("does not notify observers when value is unchanged", () => {
    const x = observe("cjs-nochange", 5) as Function;
    let called = false;
    const stop = x(() => { called = true; }) as Function;
    x(5);
    stop();
    expect(called).toBe(false);
  });
});
