describe('Service: store', function () {
    var testStore,
        errors;

    beforeEach(module("atsid.data.store"));
    beforeEach(inject(function (store) {
        testStore = store({});
        errors = store.errors;
    }));

    it("should throw an error if required methods are not implemented", function () {
        expect(function () { testStore.create(); }).toThrow(new errors.NotImlementedError());
        expect(function () { testStore.read(); }).toThrow(new errors.NotImlementedError());
        expect(function () { testStore.update(); }).toThrow(new errors.NotImlementedError());
        expect(function () { testStore.patch(); }).toThrow(new errors.NotImlementedError());
        expect(function () { testStore.delete(); }).toThrow(new errors.NotImlementedError());
    });

    it("should create a response object", function () {
        var item = { name: "item1", id: 1 };
        var resp = testStore.createResponse(item);
        expect(resp.data).toBe(item);
        expect(resp.count).toBe(1);
    });

    it("should create a response object for a collection", function () {
        var items = [{ name: "item1", id: 1 }, { name: "item2", id: 2 }];
        var resp = testStore.createResponse(items);
        expect(resp.data).toBe(items);
        expect(resp.count).toBe(items.length);
        expect(resp.total).toBe(items.length);
        expect(resp.offset).toBe(0);
    });

    it("should be able to set offset and total for collection response", function () {
        var items = [{ name: "item1", id: 1 }, { name: "item2", id: 2 }];
        var offset = 10, total = 100;
        var resp = testStore.createResponse(items, offset, total);
        expect(resp.count).toBe(items.length);
        expect(resp.offset).toBe(offset);
        expect(resp.total).toBe(total);
    });

    it("should get the value at a long path", function () {
        var results = "passed";
        var objectGraph = { path1: { path2: { path3: results }}};
        expect(testStore.getValueAtPath("path1/path2/path3", objectGraph)).toBe(results);
    });

    it("should get the value at a short path", function () {
        var results = "passed";
        var objectGraph = { path1: { path2: "value" }, path1A: results };
        expect(testStore.getValueAtPath("path1A", objectGraph)).toBe(results);
    });

    it("should return nothing if there is no path", function () {
        var objectGraph = { path1: { path2: "value" }};
        expect(testStore.getValueAtPath("", objectGraph)).toBe(undefined);
    });


});