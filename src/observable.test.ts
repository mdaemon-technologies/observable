import observe from "./observable";

describe("observable-tests", () => {
  describe("observe", () => {
    it("is a function", () => {
      expect(typeof observe).toBe("function");
    });

    it("can accept no initializing value", () => {
      let x = observe();
      expect(typeof x).toBe("function");
      expect(x()).toBe(undefined);
    }); 
    
    it("can accept a number", () => {
      let x = observe(1);
      expect(typeof x).toBe("function");
      expect(x()).toBe(1);
    });

    it("can accept a string", () => {
      let x = observe("test");
      expect(typeof x).toBe("function");
      expect(x()).toBe("test");
    });

    it("can accept a boolean", () => {
      let x = observe(false);
      expect(typeof x).toBe("function");
      expect(x()).toBe(false);
    });

    it("can accept an array", () => {
      let x = observe([]);
      expect(typeof x).toBe("function");
      expect(x()).toEqual([]);
    });

    it("can accept an object", () => {
      let x = observe({});
      expect(typeof x).toBe("function");
      expect(x()).toEqual({});
    });
  });
  
  describe("an observe value", () => {
    const x = observe(10);
    it("can be observed by passing in a function", done => {
      const stop = x((val: number, oldVal: number) => {
        expect(val).toBe(11);
        expect(oldVal).toBe(10);
        stop();
        done();
      }) as Function;
      
      x(11);
    });

    it("cannot change the type of value once initialized", () => {
      const success = x("test");
      expect(success).toBe(false);
      expect(x()).toBe(11);
    });

    it("can see a change in an object", done => {
      const y = observe({ "a": 1 });
      const stop = y((val: any, oldVal: any) => {
        expect(val.a).toBe(2);
        expect(oldVal.a).toBe(1);
        expect(val).not.toBe(oldVal);
        stop();
      }) as Function;

      y({ a: 2});

      const stop2 = y((val: any, oldVal: any) => {
        expect(val.a).toBe(2);
        expect(oldVal.a).toBe(2);
        expect(val.b).toBe(3);
        expect(oldVal.b).toBe(undefined);
        expect(val).not.toBe(oldVal);
        stop2();
        done();
      }) as Function;

      y({ b: 3 });
    });

    it("can see when nothing changed in the object", () => {
      const y = observe({ a: 1 });
      expect(y({})).toBe(false);
      expect(y({ a: 1 })).toBe(false);
    });

    it("can see a change in an array", done => {
      const y = observe([1,2,3]);
      const stop = y((val: any, oldVal: any) => {
        expect(val).toEqual([]);
        expect(oldVal).toEqual([1,2,3]);
        stop();
      }) as Function;

      y([]);

      const stop2 = y((val: any, oldVal: any) => {
        expect(val).toEqual([{test: 1}, {test: 2}]);
        expect(oldVal).toEqual([]);
        stop2();
        done();
      }) as Function;

      y([{test: 1}, {test: 2}]);
    });
  });


});