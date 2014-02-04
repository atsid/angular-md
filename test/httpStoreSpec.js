describe('Service: http store', function () {

    beforeEach(module("atsid.data.store", function (httpStoreProvider) {
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

    describe("Private methods", function () {

    });

    describe("Utility methods", function () {

        it("should build a url", function () {
            var query = { offset: 10, orderBy: "name" };
            var path = "items";
            var url = store.buildUrl(path, query);
            expect(url).toBe("api/" + path + "?offset=10&orderBy=name");
        });

    });

    describe("CRUD", function () {
        var id = 1;
        var deferred;
        var digest;
        var resolved;

        beforeEach(inject(function ($q, $rootScope) {
            deferred = $q.defer();
            digest = function () {
                $rootScope.$digest();
                httpMock.flush();
            };
            resolved = false;
        }));

        it("Should create an item", function () {
            var item = {
                name: "test5"
            };
            httpMock.when('POST', 'api/items').respond({ data: angular.extend({ id: 5 }, item) });
            store.create("items", {}, item, deferred);
            deferred.promise.then(function (resp) {
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
            store.create("items", {}, items, deferred);
            deferred.promise.then(function (resp) {
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
            httpMock.when('POST', 'api/items').respond(500, { data: angular.extend({ id: 5 }, item) });
            store.create("items", {}, item, deferred);
            deferred.promise.then(function () {}, function (err) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("Should read all items", function () {
            httpMock.when('GET', 'api/items').respond({ data: items, offset: 0, count: items.length });
            store.read("items", {}, null, deferred);
            deferred.promise.then(function (resp) {
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
            store.read("items/" + item.id, {}, null, deferred);
            deferred.promise.then(function (resp) {
                expect(resp).not.toBe(undefined);
                expect(resp.data.id).toBe(item.id);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("Should update an item", function () {
            var item = items[0];
            var changedItem = angular.extend(angular.copy(item), { name: "new name"});
            httpMock.when('PUT', 'api/items/' + item.id).respond({ data: angular.copy(changedItem) });
            store.update("items/" + item.id, {}, changedItem, deferred);
            deferred.promise.then(function (resp) {
                expect(resp.data.id).toBe(item.id);
                expect(resp.data.name).toBe(changedItem.name);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("Should patch an item", function () {
            var item = items[0];
            var changedItem = angular.extend(angular.copy(item), { name: "new name"});
            httpMock.when('PATCH', 'api/items/' + item.id).respond({ data: angular.copy(changedItem) });
            store.patch("items/" + item.id, {}, changedItem, deferred);
            deferred.promise.then(function (resp) {
                expect(resp.data.id).toBe(item.id);
                expect(resp.data.name).toBe(changedItem.name);
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("Should delete an item", function () {
            var item = items[0];
            httpMock.when('DELETE', 'api/items/' + item.id).respond({ data: null });
            store.delete("items/" + item.id, {}, item, deferred);
            deferred.promise.then(function (resp) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

        it("Should delete all items", function () {
            var item = items[0];
            httpMock.when('DELETE', 'api/items').respond({ data: null });
            store.delete("items", {}, item, deferred);
            deferred.promise.then(function (resp) {
                resolved = true;
            });
            digest();
            expect(resolved).toBe(true);
        });

    });

});