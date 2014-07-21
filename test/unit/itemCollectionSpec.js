describe('Service: dataSource', function () {
    var dataSourceService;
    var errors;
    var storeService;
    var arrayStoreService;
    var q;
    var scope;
    var itemCollection;

    beforeEach(module("atsid.data"));
    beforeEach(module("atsid.data.itemCollection"));
    beforeEach(inject(["dataSource", "store", "arrayStore", "$q", "$rootScope", "itemCollection", function (dataSource, store, arrayStore, $q, $rootScope, ic) {
        dataSourceService = dataSource;
        errors = dataSource.errors;
        storeService = store;
        arrayStoreService = arrayStore;
        q = $q;
        scope = $rootScope;
        itemCollection = ic;
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

    function createItemCollections(addressIdx){
        var ds = embededRoutesDS();
        var contactsDs = ds.child("Contacts");
        var contactsColl = itemCollection({
            dataSource: contactsDs,
            saveChildren: true,
            children: {
                Addresses: {
                    dataSource: "Addresses"
                }
            }
        });
        contactsColl.query();
        scope.$apply();

        var addressesColl = contactsColl.get(addressIdx).child("Addresses");
        addressesColl.query();
        scope.$apply();
        return {
            contacts: contactsColl,
            addresses: addressesColl
        };
    }

    describe('ItemCollection', function () {

        it("should have the correct number of items after a query", function () {
            var ds = embededRoutesDS();
            var contactsColl = itemCollection({
                dataSource: ds.child("Contacts")
            });
            contactsColl.query();
            scope.$apply();
            expect(contactsColl.getAll().length).toBe(5);
        });

        it("should have the correct number of items for a child collection after a query", function () {
            var ics = createItemCollections(3);
            expect(ics.addresses.getAll().length).toBe(5);
        });

        it("should return false if a child has changes if you call hasChanges on the parent without the deep flag", function () {
            var ics = createItemCollections(3);
            ics.addresses.get(0).street = "Ugaly Bugaly";

            expect(ics.contacts.hasChanges()).toBe(false);
            expect(ics.addresses.hasChanges()).toBe(true);
            expect(ics.addresses.get(0).hasChanges()).toBe(true);
            expect(ics.addresses.get(1).hasChanges()).toBe(false);
        });

        it("should return true if a child has changes if you call hasChanges on the parent with the deep flag", function () {
            var ics = createItemCollections(3);
            ics.addresses.get(0).street = "Ugaly Bugaly";

            expect(ics.contacts.hasChanges(true)).toBe(true);
            expect(ics.addresses.hasChanges(true)).toBe(true);
            expect(ics.addresses.get(0).hasChanges(true)).toBe(true);
            expect(ics.addresses.get(1).hasChanges(true)).toBe(false);
        });

        it("should return false if a child doesn't have changes and if you call hasChanges on the parent with the deep flag", function () {
            var ics = createItemCollections(3);

            expect(ics.contacts.hasChanges(true)).toBe(false);
            expect(ics.addresses.hasChanges(true)).toBe(false);
            expect(ics.addresses.get(0).hasChanges(true)).toBe(false);
            expect(ics.addresses.get(1).hasChanges(true)).toBe(false);
        });
    });
});