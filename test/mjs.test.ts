// @ts-ignore - observable.mjs uses a package-scoped .d.ts; TypeScript cannot resolve it as a relative .mjs import
import observe from "../dist/observable.mjs";

describe("MJS format (dist/observable.mjs)", () => {
  it("exports a function", () => {
    expect(typeof observe).toBe("function");
  });

  it("creates an observable that returns the initial value", () => {
    const x = observe("mjs-num", 42) as Function;
    expect(x()).toBe(42);
  });

  it("returns true when value changes, false when unchanged", () => {
    const x = observe("mjs-bool", true) as Function;
    expect(x(false)).toBe(true);
    expect(x(false)).toBe(false);
  });

  it("returns the current value with no arguments", () => {
    const x = observe("mjs-str", "hello") as Function;
    expect(x()).toBe("hello");
    x("world");
    expect(x()).toBe("world");
  });

  it("notifies observers on change", (done) => {
    const x = observe("mjs-obs", 0) as Function;
    const stop = x((newVal: number, oldVal: number) => {
      expect(newVal).toBe(1);
      expect(oldVal).toBe(0);
      stop();
      done();
    }) as Function;
    x(1);
  });

  it("does not notify observers when value is unchanged", () => {
    const x = observe("mjs-nochange", 5) as Function;
    let called = false;
    const stop = x(() => { called = true; }) as Function;
    x(5);
    stop();
    expect(called).toBe(false);
  });

  it("exposes once and immediate options", () => {
    const x = observe("mjs-opts", 1) as Function;
    const seen: number[] = [];

    x((val: number) => { seen.push(val); }, { immediate: true, once: true });
    x(2);
    x(3);

    expect(seen).toEqual([1]);
  });

  it("exposes registry statics", () => {
    const registry = (observe as any).createRegistry();

    registry("mjs-scoped", "inner");

    expect(typeof (observe as any).has).toBe("function");
    expect(typeof (observe as any).names).toBe("function");
    expect(typeof (observe as any).destroy).toBe("function");
    expect(registry.has("mjs-scoped")).toBe(true);
    expect((observe as any).has("mjs-scoped")).toBe(false);
    expect(registry.names()).toEqual(["mjs-scoped"]);
    expect(registry.destroy("mjs-scoped")).toBe(true);
  });
});
