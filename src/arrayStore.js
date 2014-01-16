"use strict";

angular.module("atsid.data.store").provider("arrayStore", [function () {

    this.$get = [function () {

        /**
         * @constructor
         * The constructor for a new Array store.
         * @param {Object} config default configurations.
         */
        function ArrayStore (config) {
            config = config || {};
            this.array = angular.isArray(config) ? config : config.array || [];
            this.idProperty = config.idProperty || "id";
            this.idToItems = {};
            if (config.getId) {
                this.getId = config.getId;
            }
            this.uid = 0;
        }

        ArrayStore.prototype = {

            getId: function () {
                this.uid += 1;
                return this.uid;
            },

            findItem: function (path) {
                return this.idToItems[path];
            },

            syncRead: function (path, params) {
                return this.findItem(path);
            },

            syncCreate: function (path, params, item) {
                var idProperty = this.idProperty;

                if (angular.isArray(item)) {
                    return item.map(function (item) {
                        return this.syncCreate(item);
                    }, this);
                }
                if (!item[idProperty]) {
                    item[idProperty] = this.getId();
                }
                if (!this.idToItems[idProperty]) {
                    this.array.push(item);
                    this.idToItems[item[idProperty]] = item;
                    return item;
                }
            },

            syncUpdate: function (path, params, changedItem) {
                if (angular.isArray(changedItem)) {
                    return changedItem.map(function (item) {
                        return this.syncUpdate(item);
                    }, this);
                }
                var item = this.findItem(path);
                if (item) {
                    var index = this.array.indexOf(item);
                    this.array.splice(index, 1, changedItem);
                    delete this.idToItems[path];
                    this.idToItems[item[this.idProperty]] = item;
                    return changedItem;
                }
            },

            syncPatch: function (path, params, changedItem) {
                if (angular.isArray(changedItem)) {
                    return changedItem.map(function (item) {
                        return this.syncPatch(item);
                    }, this);
                }
                var item = this.findItem(path);
                if (item) {
                    angular.extend(item, changedItem);
                    return item;
                }
            },

            syncDelete: function (path, params, item) {
                if (angular.isArray(item)) {
                    return item.map(function (item) {
                        return this.syncDelete(item);
                    }, this);
                }
                item = this.findItem(path);
                if (item) {
                    var index = this.array.indexOf(item);
                    this.array.splice(index, 1);
                    delete this.idToItems[item[this.idProperty]];
                    return item;
                }
            },

            read: function (path, params, deferred) {
                var item = this.syncRead(path, params);
                if (item) {
                    deferred.resolve(angular.copy(item));
                } else {
                    deferred.resolve(new Error ("No item at path " + path));
                }
            },

            create: function (path, params, data, deferred) {
                var item = this.syncCreate(path, params, data);
                deferred.resolve(item);
            },

            update: function (path, params, data, deferred) {
                var item = this.syncUpdate(path, params, data);
                if (item) {
                    deferred.resolve(angular.copy(item));
                } else {
                    deferred.resolve(new Error ("No item at path " + path));
                }
            },

            patch: function (path, params, data, deferred) {
                var item = this.syncPath(path, params, data);
                if (item) {
                    deferred.resolve(angular.copy(item));
                } else {
                    deferred.resolve(new Error ("No item at path " + path));
                }
            },

            "delete": function (path, params, data, deferred) {
                var item = this.syncDelete(path, params, data);
                if (item) {
                    deferred.resolve({});
                } else {
                    deferred.resolve(new Error ("No item at path " + path));
                }
            }

        };

        return function (config) {
            config = angular.isString(config) ? { name: config } : config;
            return new ArrayStore(config);
        };

    }];
}]);