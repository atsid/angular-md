describe('Service: dataSource', function () {
    var dataSourceService;
    var errors;
    var storeService;
    var arrayStoreService;
    var q;
    var scope;

    beforeEach(module("atsid.data"));
    beforeEach(inject(["dataSource", "store", "arrayStore", "$q", "$rootScope", function (dataSource, store, arrayStore, $q, $rootScope) {
        dataSourceService = dataSource;
        errors = dataSource.errors;
        storeService = store;
        arrayStoreService = arrayStore;
        q = $q;
        scope = $rootScope;
    }]));

    function buildStore(async) {
        return storeService({
            contactsStore: arrayStoreService({
                array: [{
                    id: 0,
                    name: "Bob"
                }, {
                    id: 1,
                    name: "Sally"
                }, {
                    id: 2,
                    name: "John"
                }, {
                    id: 3,
                    name: "Mark"
                }, {
                    id: 4,
                    name: "Nobody"
                }]
            }),

            contactsaddressesStore: arrayStoreService({
                array: [{
                    id: 0,
                    street: "3509 Colonial Embers Landing"
                }, {
                    id: 1,
                    street: "9415 Merry Crescent"
                }, {
                    id: 2,
                    street: "1661 Cotton Downs, Powderlick"
                }, {
                    id: 3,
                    street: "7365 Tawny Cider Wharf"
                }, {
                    id: 4,
                    street: "6392 Fallen Hickory Turnabout"
                }]
            }),

            asyncResults: function (results) {
                var deferred = q.defer();
                if (results instanceof Error) {
                    deferred.reject(results);
                } else {
                    deferred.resolve(results);
                }

                return deferred.promise;
            },

            getStore: function (path) {
                path = path || "root";
                path = path.replace(/\/|[0-9]/g, "");
                return this[path + "Store"];
            },

            getPath: function (path) {
                return /([0-9])*$/.exec(path)[1] || undefined;
            },

            create: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? store.create(this.getPath(path), params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            read: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? store.read(this.getPath(path), params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            update: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? store.update(this.getPath(path), params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            patch: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? store.patch(this.getPath(path), params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            delete: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? store.delete(this.getPath(path), params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            buildUrl: function (url, queryParams) {
                if (queryParams) {
                    var queryList = [];
                    angular.forEach(queryParams, function (value, name) {
                        queryList.push(name + "=" + value);
                    });
                    if (queryList.length) {
                        url += "?" + queryList.join("&");
                    }
                }
                return "api/" + url;
            }

        });
    }

    function embededRoutesDS (dsConfig, contactsConfig, addressesConfig) {
        return dataSourceService.createDataSource(function() {

            this.setStore(buildStore(false));
            this.addRoutes({
                Contacts: angular.extend({
                    path: "/contacts/:id",
                    routes: {
                        Addresses: angular.extend({
                            path: "addresses/:addressId"
                        }, addressesConfig || {})
                    }
                }, contactsConfig || {}),
            });
            this.setDefaults(angular.extend({
                allowAutomaticRoutes: false,
            }, dsConfig));
        });
    }

    function flatRoutesDS (dsConfig, contactsConfig, addressesConfig) {
        return dataSourceService.createDataSource(function() {
            this.setStore(buildStore(false));
            this.addRoutes({
                Contacts: angular.extend({
                    path: "/contacts/:contactId"
                }, contactsConfig || {}),
                Addresses: angular.extend({
                    path: "/contacts/:contactId/addresses/:addressId"
                }, addressesConfig || {})
            });
            this.setDefaults(angular.extend({
                allowAutomaticRoutes: false,
            }, dsConfig));
        });
    }

    function pathRoutesDS (dsConfig, contactsConfig, addressesConfig) {
        return dataSourceService.createDataSource(function() {
            this.setStore(buildStore(false));
            this.addRoutes({
                "/contacts/:contactId": contactsConfig || {},
                "/contacts/:contactId/addresses/:addressId": addressesConfig || {}
            });
            this.setDefaults(angular.extend({
                allowAutomaticRoutes: false,
            }, dsConfig));
        });
    }

    describe('Configuration', function () {

        it("should allow configuration with function", function () {
            var testStore = arrayStoreService();
            var ds = dataSourceService.createDataSource(function() {
                this.setStore(testStore);
            });
            expect(ds.store).toBe(testStore);
        });

        it("should allow configuration with object", function () {
            var testStore = arrayStoreService();
            var ds = dataSourceService.createDataSource({
                store: testStore
            });
            expect(ds.store).toBe(testStore);
        });

        it("should work without configuration", function () {
            var ds = dataSourceService.createDataSource();
            expect(ds.store.config.type).toBe("http");
        });

        it("should setup a store with a configuration", function () {
            var items = [{
                id: 0,
                value: "test1"
            }];
            var ds = dataSourceService.createDataSource(function () {
                this.setStoreConfig({
                    type: "array",
                    array: items
                });
            });
            expect(ds.store.read().data[0].id).toBe(items[0].id);
        });

        it("should be able to set the URL of an http store", function () {
            var storeUrl = "http://www.test.com/api";
            var ds = dataSourceService.createDataSource(function () {
                this.setStoreUrl(storeUrl);
            });
            expect(ds.store.buildUrl("")).toBe(storeUrl);
            expect(ds.store.buildUrl("test")).toBe(storeUrl + "/test");
        });
    });

    describe('Routing', function () {

        it("should create embedded routes", function () {
            var ds = embededRoutesDS();
            expect(!!ds.child("Contacts")).toBe(true);
            expect(!!ds.child("Contacts").child("Addresses")).toBe(true);
            expect(!!ds.child("contacts")).toBe(true);
            expect(!!ds.child("contacts").child("addresses")).toBe(true);
        });

        it("should have correct levels for embedded routes", function () {
            var ds = embededRoutesDS();
            expect(ds.level).toBe(1);
            expect(ds.child("Contacts").level).toBe(2);
            expect(ds.child("contacts").child("addresses").level).toBe(3);
        });

        it("should create flat routes", function () {
            var ds = flatRoutesDS();
            expect(!!ds.child("Contacts")).toBe(true);
            expect(!!ds.child("Addresses")).toBe(true);
            expect(!!ds.child("contacts")).toBe(true);
            expect(!!ds.child("contacts").child("addresses")).toBe(true);
        });

        it("should have correct levels for flat routes", function () {
            var ds = flatRoutesDS();
            expect(ds.level).toBe(1);
            expect(ds.child("Contacts").level).toBe(2);
            expect(ds.child("contacts").child("addresses").level).toBe(3);
        });

        it("should create path routes", function () {
            var ds = pathRoutesDS();
            expect(!!ds.child("contacts")).toBe(true);
            expect(!!ds.child("contacts").child("addresses")).toBe(true);
        });

        it("should have correct levels for path routes", function () {
            var ds = flatRoutesDS();
            expect(ds.level).toBe(1);
            expect(ds.child("Contacts").level).toBe(2);
            expect(ds.child("contacts").child("addresses").level).toBe(3);
        });

        it("should have the correct path params", function () {
            var ds = flatRoutesDS();
            expect(ds.pathParam).toBe("");
            expect(ds.child("Contacts").pathParam).toBe("contactId");
            expect(ds.child("contacts").child("addresses").pathParam).toBe("addressId");
        });

        it("should add a route", function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });
            var route = ds.addRoute({
                    name: "users"
                });
            expect(route.name).toBe("users");
            expect(route.pathName).toBe("users");
            expect(route.parent).toBe(ds);
        });

        it("should add a route with a path", function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });
            var route = ds.addRoute({
                    name: "usersRoute",
                    path: "users"
                });
            expect(route.name).toBe("usersRoute");
            expect(route.pathName).toBe("users");
            expect(route.parent).toBe(ds);
        });

        it("should add a route automatically with path", function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });

            var route = ds.addRoute({
                path: "/users/permissions/roles"
            });
            expect(route.name).toBe("roles");
            expect(route.parent.name).toBe("permissions");
            expect(route.parent.parent.name).toBe("users");
        });

        it("should add a route automatically with path", function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });

            var route = ds.addRoute({
                path: "users/permissions/roles"
            });
            expect(route.name).toBe("roles");
        });

        it("should add a child route automatically", function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });
            expect(ds.routes.users).toBe(undefined);

            var route = ds.child("users");
            expect(route.pathName).toBe("users");
            expect(route.parent.isEqual(ds)).toBe(true);
        });

        it("should add a child route automatically with a configuration", function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });
            expect(ds.routes.users).toBe(undefined);

            var route = ds.child({
                name: "users",
                fields: "firstName,lastName"
            });
            expect(route.name).toBe("users");
            expect(route.pathName).toBe("users");
            expect(route.fields).toBe("firstName,lastName");
        });

        it("should fail to create a child without a name or path", function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });
            expect(function () {
                ds.child({ fields: "firstName,lastName"});
            }).toThrow(new errors.ParameterError());
        });

        it("should create a new instance of a route when getting a child route", function () {
            var ds = flatRoutesDS();
            var addressRoute = ds.routes.contacts.routes.addresses;
            var routeA = ds.child("contacts/addresses");
            var routeB = ds.child("contacts/addresses");

            expect(routeA).not.toBe(routeB); // each should be their own instance
            expect(routeA.isEqual(routeB)).toBe(true); // Their prototype should be the same
        });

    });

    describe("Routes by path", function () {

        it("should get a route by path", function () {
            var ds = flatRoutesDS();
            var route = ds.getRouteByPath("contacts/addresses");
            expect(route.name).toBe("Addresses");
        });

        it("should skip the last route by path", function () {
            var ds = flatRoutesDS();
            var route = ds.getRouteByPath("contacts/addresses", true);
            expect(route.name).toBe("Contacts");
        });

        it("should create parent routes when adding", function () {
            var ds = flatRoutesDS();
            ds._adding = true; // adding flag used by addRoute
            var route = ds.getRouteByPath("contacts/addresses/users/roles", true);

            expect(route.pathName).toBe("users");
            expect(route.parent.pathName).toBe("addresses");
            expect(route.parent.parent.pathName).toBe("contacts");
        });

        it("should fail to create parent routes when not adding or dynamic", function () {
            var ds = flatRoutesDS();
            expect(function () {
                ds.getRouteByPath("contacts/addresses/users/roles", true);
            }).toThrow(new errors.RouteNotFoundError());
        });

        it("should find route with param paths included", function () {
            var ds = flatRoutesDS();
            var route = ds.getRouteByPath("contacts/:id1/addresses/:id2");
            expect(route.pathName).toBe("addresses");
            expect(route.parent.pathName).toBe("contacts");
        });


        it("should get a route by path components", function () {
            var ds = flatRoutesDS();
            var route = ds.getRouteByPathComponents([,
                    { name: "contacts"},
                    { name: "addresses"}
                ]);
            expect(route.name).toBe("Addresses");
        });

        it("should skip the last route by path components", function () {
            var ds = flatRoutesDS();
            var route = ds.getRouteByPathComponents([,
                    { name: "contacts"},
                    { name: "addresses"}
                ], true);
            expect(route.name).toBe("Contacts");
        });

        it("should create parent routes when adding", function () {
            var ds = flatRoutesDS();
            ds._adding = true; // adding flag used by addRoute
            var route = ds.getRouteByPathComponents([,
                    { name: "contacts" },
                    { name: "addresses" },
                    { name: "users" },
                    { name: "roles" }
                ], true);

            expect(route.pathName).toBe("users");
            expect(route.parent.pathName).toBe("addresses");
            expect(route.parent.parent.pathName).toBe("contacts");
        });

        it("should fail to create parent routes when not adding or dynamic for path components", function () {
            var ds = flatRoutesDS();
            expect(function () {
                ds.getRouteByPathComponents([,
                    { name: "contacts" },
                    { name: "addresses" },
                    { name: "users" },
                    { name: "roles" }
                ], true);
            }).toThrow(new errors.RouteNotFoundError());
        });

    });

    describe('Store', function () {

        it("should set a new store", function () {
            var ds = flatRoutesDS();
            var store = arrayStoreService();
            ds.setStore(store);
            expect(ds.store).toBe(store);
        });

        it("should fail to set a store on a non-root route", function () {
            var ds = flatRoutesDS();
            var store = arrayStoreService();
            expect(function () {
                ds.child("contacts").setStore(store);
            }).toThrow(new errors.NotRootRouteError());
        });

    });

    describe('Hierarchy', function () {
        var grandParentDS;
        var parentDS;
        var childDS;

        beforeEach(function () {
            var ds = flatRoutesDS({ allowAutomaticRoutes: true });
            grandParentDS = ds.child("contacts");
            parentDS = ds.child("contacts").child("addresses");
            childDS = ds.child("contacts").child("addresses").child("users");
        });

        it("should be able to get its closest parent", function () {
            expect(childDS.getParent().isEqual(parentDS)).toBe(true);
        });

        it("should be able to get its parent by name", function () {
            expect(childDS.getParent("addresses").isEqual(parentDS)).toBe(true);
        });

        it("should be able to get its grant parent by name", function () {
            expect(childDS.getParent("contacts").isEqual(grandParentDS)).toBe(true);
        });

    });

    describe('Item', function () {

        it("should set an item onto the route", function () {
            var contactsDS = flatRoutesDS().child("contacts");
            var addressesDS = contactsDS.child("addresses");
            contactsDS.setItem({ id: 1 });
            expect(addressesDS.getPathParams({}).contactId).toBe(1);
        });

        it("should set a parent item onto the route", function () {
            var addressesDS = flatRoutesDS().child("contacts").child("addresses");
            var path;
            addressesDS.setParentItem({ id: 2 });
            expect(addressesDS.getPathParams({}).contactId).toBe(2);
        });

        it("should set a parent item onto the route by name", function () {
            var addressesDS = flatRoutesDS({ allowAutomaticRoutes: true }).child("contacts").child("addresses").child("users");
            addressesDS.setParentItem("contacts", { id: 2 });
            addressesDS.setParentItem({ id: 4 });
            var pathParams = addressesDS.getPathParams({});
            expect(pathParams.contactId).toBe(2);
            expect(pathParams.addressId).toBe(4);
        });

    });

    describe('Route Instances', function () {

        it("should create an instance of a route", function () {
            var contactsDS = flatRoutesDS().child("contacts");
            var instance = contactsDS.getInstance();
            expect(contactsDS !== instance).toBe(true);
            expect(contactsDS.isEqual(instance)).toBe(true);
        });

        it ("should create an instance with custom config", function () {
            var contactsDS = flatRoutesDS().child("contacts");
            var instance = contactsDS.getInstance({
                fields: "firstName,lastName",
                count: 10
            });
            expect(instance.count).toBe(10);
            expect(instance.fields).toBe("firstName,lastName");
            expect(contactsDS.isEqual(instance)).toBe(true);
        });
    });

    describe("Paths", function () {
        var ds;

        beforeEach(function () {
            ds = flatRoutesDS().getRouteByPath("contacts/addresses");
            ds.setParentItem({ id: 4 });
        });

        it("should get the route's path", function () {
            expect(ds.getPath()).toBe("contacts/4/addresses");
        });

        it("should get the route's path for an item", function () {
            expect(ds.getPath({ addressId: 10 })).toBe("contacts/4/addresses/10");
        });

        it("should get the route's url", function () {
            expect(ds.getUrl()).toBe("api/contacts/4/addresses?count=100");
        });

        it("should get the route's url for an item", function () {
            expect(ds.getUrl({ addressId: 10 })).toBe("api/contacts/4/addresses/10?count=100");
        });

        it("should get the route's url with a search query", function () {
            expect(ds.getUrl({}, { count: 10, format: "pdf" })).toBe("api/contacts/4/addresses?count=10&format=pdf");
        });

    });

    describe("Transformers", function () {
        var ds;

        beforeEach(function () {
            ds = flatRoutesDS({
                transformers: [{
                    type: "request",
                    transform: function (items) {
                        items.forEach(function (item) {
                            item.date = item.date.toISOString();
                        });
                        return items;
                    }
                }, {
                    type: "response",
                    transform: function (items) {
                        items.forEach(function (item) {
                            item.date = new Date(item.date);
                        });
                        return items;
                    }
                }]
            });
        });

        it("should transform the request", function () {
            var items = ds.runTransformers("request", [{
                id: 1,
                date: new Date()
            }, {
                id: 2,
                date: new Date()
            }, {
                id: 3,
                date: new Date()
            }]);

            expect(typeof items[0].date).toBe("string");
            expect(typeof items[1].date).toBe("string");
            expect(typeof items[2].date).toBe("string");
        });

        it("should transform the response", function () {
            var items = ds.runTransformers("response", [{
                id: 1,
                date: "2014-04-28T23:32:54.091Z"
            }, {
                id: 2,
                date: "2014-04-28T23:32:54.091Z"
            }, {
                id: 3,
                date: "2014-04-28T23:32:54.091Z"
            }]);

            expect(items[0].date instanceof Date).toBe(true);
            expect(items[1].date instanceof Date).toBe(true);
            expect(items[2].date instanceof Date).toBe(true);
        });

    });

    describe("CRUD", function () {
        var ds;

        beforeEach(function () {
            ds = flatRoutesDS().getRouteByPath("contacts/addresses");
        });

        it("should query items", function () {
            var response;
            ds.query().then(function (resp) {
                response = resp;
            });
            scope.$digest();
            expect(response.data instanceof Array).toBe(true);
            expect(response.data.length > 0).toBe(true);
        });

        it("should read an item", function () {
            var response;
            ds.get(2).then(function (resp) {
                response = resp;
            });
            scope.$digest();
            expect(response.data instanceof Array).toBe(false);
            expect(response.data.id).toBe(2);
        });

        it("should fail to read an item without parameters", function () {
            var response;
            expect(function () {
                ds.get();
                scope.$digest();
            }).toThrow(new errors.ParameterError());
        });

        it("should fail to read an item without a provided id", function () {
            var response;
            expect(function () {
                ds.get({ fields: "firstName,lastName" });
                scope.$digest();
            }).toThrow(new errors.ParameterError());
        });

        it("should create an item", function () {
            var item = {
                street: "123 street"
            };
            ds.create(item).then(function (resp) {
                item = resp.data;
            });
            scope.$digest();
            expect(typeof item.id).toBe("number");
        });

        it("should fail to create without an item", function () {
            var item;
            expect(function () {
                ds.create(item);
                scope.$digest();
            }).toThrow(new errors.ParameterError());
        });

        it("should update an item", function () {
            var changedStreet = "123 street";
            scope.$apply(function () {
                ds.get(1).then(function (resp) {
                    resp.data.street = changedStreet;
                    ds.update(resp.data);
                });
            });
            var item;
            scope.$apply(function () {
                ds.get(1).then(function (resp) {
                    item = resp.data;
                });
            });
            expect(item.street).toBe(changedStreet);
        });

        it("should fail to update without an item", function () {
            var item;
            expect(function () {
                ds.update(item);
                scope.$digest();
            }).toThrow(new errors.ParameterError());
        });

        it("should save an item without an id", function () {
            var item = {
                street: "123 street"
            };
            ds.save(item).then(function (resp) {
                item = resp.data;
            });
            scope.$digest();
            expect(typeof item.id).toBe("number");
        });

        it("should save an item with an id", function () {
            var changedStreet = "123 street";
            scope.$apply(function () {
                ds.get(1).then(function (resp) {
                    resp.data.street = changedStreet;
                    ds.save(resp.data);
                });
            });
            var item;
            scope.$apply(function () {
                ds.get(1).then(function (resp) {
                    item = resp.data;
                });
            });
            expect(item.street).toBe(changedStreet);
        });

        it("should delete an item", function () {
            var item;
            var err;
            scope.$apply(function () {
                ds.get(1).then(function (resp) {
                    item = resp.data;
                });
            });
            scope.$apply(function () {
                ds.delete(item);
            });
            scope.$apply(function () {
                ds.get(1).then(function (resp) {}, function (e) {
                    err = e;
                });
            });

            expect(!!err).toBe(true);
        });

        it("should fail to delete without an item", function () {
            var item;
            expect(function () {
                ds.delete(item);
                scope.$digest();
            }).toThrow(new errors.ParameterError());
        });

    });
});