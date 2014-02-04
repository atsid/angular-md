describe('Service: array store', function () {

    beforeEach(module("atsid.data.store"));

    var store;
    beforeEach(inject(function(arrayStore) {
        store = arrayStore({
            array: [{
                id: 1,
                name: "test1"
            }, {
                id: 2,
                name: "test2"
            }]
        });
    }));

    describe("Configuration", function () {

        it("should allow no configuration", inject(function (arrayStore) {
            var customStore = arrayStore();
            // Make sure it works properly with no config.
            var resp = customStore.syncCreate("", null, { name: "test" });
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

    describe("Sync methods", function () {
        var id = 1;

        it("should create an item", function () {
            var resp = store.syncCreate("", {}, {
                name: "test3"
            });
            expect(!!store.findItem(resp.data.id)).toBe(true);
        });

        it("should batch create items", function () {
            var resp = store.syncCreate("", {}, [{
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
            expect(store.syncRead(null).data instanceof Array).toBe(true);
        });

        it("should read an item", function () {
            expect(store.syncRead(id).data).not.toBe(undefined);
        });

        it("should update an item", function () {
            var resp = store.syncRead(id);
            var item = resp.data;
            var changedName = "new name";
            item.name = changedName;
            store.syncUpdate(id, {}, item);
            expect(store.findItem(id).name).toBe(changedName);
        });

        it("should batch update items", function () {
            var resp = store.syncRead(null);
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            var changedName = "new name";
            item1.name = changedName + 1;
            item2.name = changedName + 2;
            store.syncUpdate(id, {}, [item1, item2]);
            expect(store.findItem(item1.id).name).toBe(item1.name);
            expect(store.findItem(item2.id).name).toBe(item2.name);
        });

        it("should patch an item", function () {
            var resp = store.syncRead(id);
            var item = resp.data;
            var changedName = "new name";
            item.name = changedName;
            store.syncPatch(id, {}, item);
            expect(store.findItem(id).name).toBe(changedName);
        });

        it("should batch patch an item", function () {
            var resp = store.syncRead(null);
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            var changedName = "new name";
            item1.name = changedName + 1;
            item2.name = changedName + 2;
            store.syncPatch(id, {}, [item1, item2]);
            expect(store.findItem(item1.id).name).toBe(item1.name);
            expect(store.findItem(item2.id).name).toBe(item2.name);
        });

        it("should delete an item", function () {
            store.syncDelete(id);
            expect(store.syncRead(id)).toBe(undefined);
        });

        it("should batch delete items", function () {
            var resp = store.syncRead(null);
            store.syncDelete(null, null, resp.data);
            resp = store.syncRead(null);
            expect(resp.data.length).toBe(0);
        });

    });

    describe("Async methods", function () {
        var id = 1;
        var deferred;
        var digest;
        var resolved;

        beforeEach(inject(function ($q, $rootScope) {
            deferred = $q.defer();
            digest = function () {
                $rootScope.$digest();
            };
            resolved = false;
        }));

        it("should create an item", function () {
            var item = {
                name: "test3"
            };
            store.create("", {}, item, deferred);
            deferred.promise.then(function (resp) {
                var newItem = resp.data;
                expect(newItem).not.toBe(undefined);
                expect(newItem.name).toBe(item.name);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should read all items", function () {
            store.read(null, {}, null, deferred);
            deferred.promise.then(function (resp) {
                var items = resp.data;
                expect(items instanceof Array).toBe(true);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should read an item", function () {
            store.read(id, {}, null, deferred);
            deferred.promise.then(function (resp) {
                var item = resp.data;
                expect(item).not.toBe(undefined);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should fail to read an item", function () {
            store.read(100, {}, null, deferred);
            deferred.promise.then(function () {}, function (err) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should update an item", function () {
            var resp = store.syncRead(id);
            var item = resp.data;
            var changedName = "new name";

            item.name = changedName;
            store.update(id, {}, item, deferred);
            deferred.promise.then(function (resp) {
                var updatedItem = resp.data;
                expect(updatedItem.name).toBe(changedName);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should batch update items", function () {
            var resp = store.syncRead();
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            var changedName = "new name";
            item1.name = changedName + 1;
            item2.name = changedName + 2;
            store.update(id, {}, [item1, item2], deferred);
            deferred.promise.then(function (resp) {
                expect(store.findItem(item1.id).name).toBe(item1.name);
                expect(store.findItem(item2.id).name).toBe(item2.name);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should fail to batch update items", function () {
            var resp = store.syncRead();
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            item1.id = 100;
            item2.id = 101;
            store.update(id, {}, [item1, item2], deferred);
            deferred.promise.then(function () {}, function (err) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should fail to update an item", function () {
            var resp = store.syncRead(id);
            store.update(100, {}, resp.data, deferred);
            deferred.promise.then(function () {}, function (err) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should patch an item", function () {
            var resp = store.syncRead(id);
            var item = resp.data;
            var changedName = "new name";

            item.name = changedName;
            store.patch(id, {}, item, deferred);
            deferred.promise.then(function (resp) {
                var updatedItem = resp.data;
                expect(updatedItem.name).toBe(changedName);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should batch patch items", function () {
            var resp = store.syncRead();
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            var changedName = "new name";
            item1.name = changedName + 1;
            item2.name = changedName + 2;
            store.patch(id, {}, [item1, item2], deferred);
            deferred.promise.then(function (resp) {
                expect(store.findItem(item1.id).name).toBe(item1.name);
                expect(store.findItem(item2.id).name).toBe(item2.name);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should fail to patch an item", function () {
            var resp = store.syncRead(id);
            store.patch(100, {}, resp.data, deferred);
            deferred.promise.then(function () {}, function (err) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should fail to batch patch items", function () {
            var resp = store.syncRead();
            var item1 = resp.data[0];
            var item2 = resp.data[1];
            item1.id = 100;
            item2.id = 101;
            store.patch("", {}, [item1, item2], deferred);
            deferred.promise.then(function () {}, function (err) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should delete an item", function () {
            store.delete(id, {}, null, deferred);
            deferred.promise.then(function () {
                expect(store.findItem(id)).toBe(undefined);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should batch delete items", function () {
            store.delete("", {}, [{ id: 1}, { id: 2}], deferred);
            deferred.promise.then(function () {
                expect(store.findItem(1)).toBe(undefined);
                expect(store.findItem(2)).toBe(undefined);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("should fail to delete an item", function () {
            store.delete(100, {}, null, deferred);
            deferred.promise.then(function () {}, function (err) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

    });

});