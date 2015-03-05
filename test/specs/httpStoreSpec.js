var errors = require("../../src/errors");

describe('Service: http store', function () {
    var provider;
    beforeEach(angular.mock.module(require("../../src/httpStore"), function (httpStoreProvider) {
        provider = httpStoreProvider;
        httpStoreProvider.addStore({
            name: "test",
            baseUrl: "api"
        });
    }));

    var store, httpMock, items;

    beforeEach(inject(function(httpStore, $httpBackend) {
        items = [{
            id: 1,
            name: "item1"
        }, {
            id: 2,
            name: "item2"
        }, {
            id: 3,
            name: "item3"
        }, {
            id: 4,
            name: "item4"
        }];
        store = httpStore("test");
        // $httpBackend.when('GET', 'api/items/1').respond(function () {
        //     return [200, "sucess", { data: items[0] }];
        // });
        // $httpBackend.when('POST', 'api/items').respond(function () {
        //     return [200, "sucess", { data: items, offset: 0, count: items.length }];
        // });
        httpMock = $httpBackend;
    }));

    describe("Provider", function () {

        it("should not allow a store without a name", function () {
            expect(function () {
                provider.addStore({});
            }).toThrow(new Error("Global http store defaults require a name.")); // fragile
        });

    });

    describe("Utility methods", function () {

        it("should build a url", function () {
            var query = { offset: 10, orderBy: "name" };
            var path = "items";
            var url = store.buildUrl(path, query);
            expect(url).toBe("api/" + path + "?offset=10&orderBy=name");
        });

        it("should build a url without a base url", inject(function (httpStore) {
            var noConfigStore = httpStore();
            var query = { offset: 10, orderBy: "name" };
            var path = "items";
            var url = noConfigStore.buildUrl(path, query);
            expect(url).toBe("/" + path + "?offset=10&orderBy=name");
        }));

    });

    describe("CRUD", function () {
        var id = 1;
        var digest;
        var resolved;

        beforeEach(inject(function ($rootScope) {
            digest = function () {
                $rootScope.$digest();
                httpMock.flush();
            };
            resolved = false;
        }));

        describe("Create", function () {

            it("Should create an item", function () {
                var item = {
                    name: "test5"
                };
                httpMock.when('POST', 'api/items').respond({ data: angular.extend({ id: 5 }, item) });
                store.create("items", {}, item, {}).then(function (resp) {
                    var newItem = resp.data;
                    expect(newItem.id).not.toBe(undefined);
                    expect(newItem.name).toBe(item.name);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should batch create items", function () {
                var items = [{
                    name: "test5"
                }, {
                    name: "test6"
                }];
                httpMock.when('POST', 'api/items').respond({ data: [{ name: items[0].name, id: 5 }, { name: items[1].name, id: 6 }] });
                store.create("items", {}, items, {}).then(function (resp) {
                    var newItems = resp.data;
                    expect(newItems instanceof Array).toBe(true);
                    expect(resp.count).toBe(items.length);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to create an item", function () {
                var item = {
                    name: "test5"
                };
                httpMock.when('POST', 'api/items').respond(500);
                store.create("items", {}, item, {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to batch create items", function () {
                httpMock.when('POST', 'api/items').respond(500);
                store.create("items", {}, [{ name: "1" }, { name: "2" }], {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });
        });

        describe("Read", function () {

            it("Should read all items", function () {
                httpMock.when('GET', 'api/items').respond({ data: items, offset: 0, count: items.length });
                store.read("items", {}, null, {}).then(function (resp) {
                    expect(resp).not.toBe(undefined);
                    expect(resp.data instanceof Array).toBe(true);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should read 1 item", function () {
                var item = items[0];
                httpMock.when('GET', 'api/items/' + item.id).respond({ data: item });
                store.read("items/" + item.id, {}, null, {}).then(function (resp) {
                    expect(resp).not.toBe(undefined);
                    expect(resp.data.id).toBe(item.id);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to read all items", function () {
                httpMock.when('GET', 'api/items').respond(500);
                store.read("items", {}, null, {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to read 1 item", function () {
                var item = items[0];
                httpMock.when('GET', 'api/items/' + 100).respond(404);
                store.read("items/" + 100, {}, null, {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });
        });

        describe("Update", function () {

            it("Should update an item", function () {
                var item = items[0];
                var changedItem = angular.extend(angular.copy(item), { name: "new name"});
                httpMock.when('PUT', 'api/items/' + item.id).respond({ data: angular.copy(changedItem) });
                store.update("items/" + item.id, {}, changedItem, {}).then(function (resp) {
                    expect(resp.data.id).toBe(item.id);
                    expect(resp.data.name).toBe(changedItem.name);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should batch update items", function () {
                var item1 = items[0];
                var item2 = items[1];
                var changedItem1 = angular.extend(angular.copy(item1), { name: "new name1" });
                var changedItem2 = angular.extend(angular.copy(item1), { name: "new name2" });
                httpMock.when('PUT', 'api/items').respond({ data: angular.copy([changedItem1, changedItem2]) });
                store.update("items", {}, [changedItem1, changedItem2], {}).then(function (resp) {
                    expect(resp.data instanceof Array).toBe(true);
                    expect(resp.count).toBe(2);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to update an item", function () {
                var item = items[0];
                var changedItem = angular.extend(angular.copy(item), { name: "new name"});
                httpMock.when('PUT', 'api/items/' + item.id).respond(500);
                store.update("items/" + item.id, {}, changedItem, {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to batch update an item", function () {
                var item = items[0];
                var changedItem = angular.extend(angular.copy(item), { name: "new name"});
                httpMock.when('PUT', 'api/items/' + item.id).respond(500);
                store.update("items/" + item.id, {}, changedItem, {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });
        });

        describe("Patch", function () {

            it("Should update an item", function () {
                var item = items[0];
                var changedItem = angular.extend(angular.copy(item), { name: "new name"});
                httpMock.when('PATCH', 'api/items/' + item.id).respond({ data: angular.copy(changedItem) });
                store.patch("items/" + item.id, {}, changedItem, {}).then(function (resp) {
                    expect(resp.data.id).toBe(item.id);
                    expect(resp.data.name).toBe(changedItem.name);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should batch update items", function () {
                var item1 = items[0];
                var item2 = items[1];
                var changedItem1 = angular.extend(angular.copy(item1), { name: "new name1" });
                var changedItem2 = angular.extend(angular.copy(item1), { name: "new name2" });
                httpMock.when('PATCH', 'api/items').respond({ data: angular.copy([changedItem1, changedItem2]) });
                store.patch("items", {}, [changedItem1, changedItem2], {}).then(function (resp) {
                    expect(resp.data instanceof Array).toBe(true);
                    expect(resp.count).toBe(2);
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to update an item", function () {
                var item = items[0];
                var changedItem = angular.extend(angular.copy(item), { name: "new name"});
                httpMock.when('PATCH', 'api/items/' + item.id).respond(500);
                store.patch("items/" + item.id, {}, changedItem, {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to batch update an item", function () {
                var item = items[0];
                var changedItem = angular.extend(angular.copy(item), { name: "new name"});
                httpMock.when('PATCH', 'api/items/' + item.id).respond(500);
                store.patch("items/" + item.id, {}, changedItem, {}).then(function () {}, function (err) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

        });

        describe("Delete", function () {

            it("Should delete an item", function () {
                var item = items[0];
                httpMock.when('DELETE', 'api/items/' + item.id).respond({ data: null });
                store.delete("items/" + item.id, {}, item, {}).then(function (resp) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should batch delete items", function () {
                httpMock.when('DELETE', 'api/items').respond({ data: null });
                store.delete("items", {}, items, {}).then(function (resp) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to delete an item", function () {
                var item = items[0];
                httpMock.when('DELETE', 'api/items/' + item.id).respond(500);
                store.delete("items/" + item.id, {}, item, {}).then(function () {}, function (resp) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

            it("Should fail to batch delete items", function () {
                httpMock.when('DELETE', 'api/items').respond(500);
                store.delete("items", {}, items, {}).then(function () {}, function (resp) {
                    resolved = true;
                });
                digest();
                expect(resolved).toBe(true);
            });

        });

    });

});