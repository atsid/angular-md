var errors = require("../../src/errors");

describe('Service: array store', function () {
    beforeEach(angular.mock.module(require("../../src/arrayStore")));

    var store;
    beforeEach(inject(["arrayStore", function(arrayStore) {
        store = arrayStore({
            array: [{
                id: 1,
                name: "test1"
            }, {
                id: 2,
                name: "test2"
            }]
        });
    }]));

    describe("Configuration", function () {

        it("should allow no configuration", inject(function (arrayStore) {
            var customStore = arrayStore();
            // Make sure it works properly with no config.
            var resp = customStore.create("", null, { name: "test" });
            expect(customStore.findItem(resp.data.id)).not.toBe(undefined);
        }));

        it("should support custom id generator", inject(function (arrayStore) {
            var id = "custom_id";
            var customStore = arrayStore({
                getId: function () {
                    return id;
                }
            });

            expect(customStore.getId()).toBe(id);
        }));

        it("should be able to pass in array as configuration", inject(function (arrayStore) {
            var array = [{ name: "item1" }, { name: "item2" }];
            var customStore = arrayStore(array);

            expect(customStore.findItem(1)).not.toBe(undefined);
            expect(customStore.findItem(1).name).toBe(array[0].name);
        }));

    });

    describe("Private methods", function () {

        it("should add an item", function () {
            var item = store._addItem({
                    id: 3,
                    name: "test3"
                });

            expect(store.findItem(item.id)).not.toBe(undefined);
        });

        it("should add an item and generate an id", function () {
            var item = store._addItem({
                    name: "test3"
                });

            expect(store.findItem(item.id)).not.toBe(undefined);
        });

        it("should refuse to add an item with a conflicting id", function () {
            var item = store._addItem({
                    id: 1,
                    name: "test3"
                });

            expect(item).toBe(undefined);
        });

        it("should replace an item with a conflicting id", function () {
            var item = store._addItem({
                    id: 1,
                    name: "test3"
                }, true);

            expect(item).not.toBe(undefined);
        });

    });

    describe("Utility methods", function () {

        it("should return a new unique id", function () {
            var id1 = store.getId();
            var id2 = store.getId();

            expect(id1).not.toBe(undefined);
            expect(id2).not.toBe(id1);
        });

        it("should find an item by id", function () {
            var item = store.findItem(1);
            expect(item).not.toBe(undefined);
        });

    });

    describe("CRUD", function () {
        var id = 1;

        it("should create an item", function () {
            var resp = store.create("", {}, {
                name: "test3"
            });
            expect(!!store.findItem(resp.data.id)).toBe(true);
        });

        it("should batch create items", function () {
            var resp = store.create("", {}, [{
                name: "test3"
            }, {
                name: "test4"
            }]);
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            expect(!!store.findItem(item1.id)).toBe(true);
            expect(!!store.findItem(item2.id)).toBe(true);
        });

        it("should read all items", function () {
            expect(store.read(null).data instanceof Array).toBe(true);
        });

        it("should read an item", function () {
            expect(store.read(id).data).not.toBe(undefined);
        });

        it("should update an item", function () {
            var resp = store.read(id);
            var item = resp.data;
            var changedName = "new name";
            item.name = changedName;
            store.update(id, {}, item);
            expect(store.findItem(id).name).toBe(changedName);
        });

        it("should batch update items", function () {
            var resp = store.read(null);
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            var changedName = "new name";
            item1.name = changedName + 1;
            item2.name = changedName + 2;
            store.update(id, {}, [item1, item2]);
            expect(store.findItem(item1.id).name).toBe(item1.name);
            expect(store.findItem(item2.id).name).toBe(item2.name);
        });

        it("should patch an item", function () {
            var resp = store.read(id);
            var item = resp.data;
            var changedName = "new name";
            item.name = changedName;
            store.patch(id, {}, item);
            expect(store.findItem(id).name).toBe(changedName);
        });

        it("should batch patch an item", function () {
            var resp = store.read(null);
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            var changedName = "new name";
            item1.name = changedName + 1;
            item2.name = changedName + 2;
            store.patch(id, {}, [item1, item2]);
            expect(store.findItem(item1.id).name).toBe(item1.name);
            expect(store.findItem(item2.id).name).toBe(item2.name);
        });

        // it("should delete an item", function () {
        //     store.delete(id);
        //     var resp = store.read(id);
        //     expect(resp instanceof errors.NotFoundError).toBe(true);
        // });

        it("should batch delete items", function () {
            var resp = store.read();
            store.delete(null, null, resp.data);
            resp = store.read();
            expect(resp.data.length).toBe(0);
        });

    });

});