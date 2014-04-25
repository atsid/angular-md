describe('Service: dataSource', function () {
    var dataSourceService;
    var storeService;
    var arrayStoreService;
    var q;

    beforeEach(module("atsid.data"));
    beforeEach(inject(["dataSource", "store", "arrayStore", "$q", function (dataSource, store, arrayStore, $q) {
        dataSourceService = dataSource;
        storeService = store;
        arrayStoreService = arrayStore;
        q = $q;
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

            contacts_addressesStore: arrayStoreService({
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
                path = path.replace(/\//g, "_");
                return this[path + "Store"];
            },

            create: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? this.arrayStore.create(path, params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            read: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? this.arrayStore.read(path, params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            update: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? this.arrayStore.update(path, params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            patch: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? this.arrayStore.patch(path, params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            },

            delete: function (path, params, data) {
                var store = this.getStore(path);
                var results = store ? this.arrayStore.delete(path, params, data) : new storeService.errors.NotFoundError();
                return async ? this.asyncResults(results) : results;
            }

        });
    }

    function embededRoutesDS (dsConfig, contactsConfig, addressesConfig) {
        return dataSourceService.createDataSource(function() {

            this.setStore(buildStore(false));
            this.addRoutes({
                Contacts: angular.extend({
                    path: "/contacts/:contactId",
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

    });

    describe('Routing', function () {

        it("should create embedded routes", function () {
            var ds = embededRoutesDS();
            expect(!!ds.child("Contacts")).toBe(true);
            expect(!!ds.child("Contacts").child("Addresses")).toBe(true);
            expect(!!ds.child("contacts")).toBe(true);
            expect(!!ds.child("contacts").child("addresses")).toBe(true);
        });

        it("should create flat routes", function () {
            var ds = flatRoutesDS();
            expect(!!ds.child("Contacts")).toBe(true);
            expect(!!ds.child("Addresses")).toBe(true);
            expect(!!ds.child("contacts")).toBe(true);
            expect(!!ds.child("contacts").child("addresses")).toBe(true);
        });

        it("should create path routes", function () {
            var ds = pathRoutesDS();
            expect(!!ds.child("contacts")).toBe(true);
            expect(!!ds.child("contacts").child("addresses")).toBe(true);
        });

    });

});