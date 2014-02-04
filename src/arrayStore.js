"use strict";

angular.module("atsid.data.store").provider("arrayStore", [function () {

    this.$get = ["store", function (store) {

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
            this.sanitize = config.hasOwnProperty("sanitize") ? config.sanitize : true;
            if (config.getId) {
                this.getId = config.getId;
            }
            this.uid = 0;

            if (this.array.length) {
                this.array.splice(0, this.array.length).forEach(function (item) {
                    this._addItem(item);
                }, this);
            }
        }

        ArrayStore.prototype = store({

            _addItem: function (item, replace) {
                var idProperty = this.idProperty;
                if (!item[idProperty]) {
                    item[idProperty] = this.getId();
                }
                if (this.idToItems[item[idProperty]]) {
                    if (replace) {
                        var index = this.array.indexOf(item);
                        this.array.splice(index, 1);
                    } else {
                        return;
                    }
                }

                if (this.sanitize) {
                    item = this.sanitizeData(item);
                }
                this.idToItems[item[idProperty]] = item;
                this.array.push(item);

                return this.sanitize ? angular.copy(item) : item;
            },

            getId: function () {
                do { this.uid += 1; } while (this.idToItems[this.uid]);
                return this.uid;
            },

            findItem: function (path) {
                var item = this.idToItems[path];
                if (item && this.sanitize) {
                    item = angular.copy(item);
                }
                return item;
            },

            hasItem: function (item) {
                if (angular.isArray(item)) {
                    return item.every(function (i) {
                        return this.hasItem(i);
                    }, this);
                } else if (item[this.idProperty]) {
                    return !!this.idToItems[item[this.idProperty]];
                }
                return !!this.idToItems[item];
            },

            syncRead: function (path, params) {
                var item = path !== undefined && path !== null ? this.findItem(path) : angular.copy(this.array);
                if (item) {
                    return this.createResponse(item);
                }
            },

            syncCreate: function (path, params, item) {
                var idProperty = this.idProperty;

                if (angular.isArray(item)) {
                    return this.createResponse(item.map(function (item) {
                        return this._addItem(item);
                    }, this));
                }
                return this.createResponse(this._addItem(item));
            },

            syncUpdate: function (path, params, changedItem) {
                if (angular.isArray(changedItem)) {
                    if (this.hasItem(changedItem)) {
                        return this.createResponse(changedItem.map(function (item) {
                            return this._addItem(item, true);
                        }, this));
                    }
                } else {
                    if (this.hasItem(path)) {
                        return this.createResponse(this._addItem(changedItem, true));
                    }
                }
            },

            syncPatch: function (path, params, changedItem) {
                if (angular.isArray(changedItem)) {
                    if (this.hasItem(changedItem)) {
                        return this.createResponse(changedItem.map(function (changedItem) {
                            var item = this.findItem(changedItem[this.idProperty]);
                            angular.extend(item, changedItem);
                            return this._addItem(item, true);
                        }, this));
                    }
                } else {
                    var item = this.findItem(path);
                    if (item) {
                        angular.extend(item, changedItem);
                        return this.createResponse(this._addItem(item, true));
                    }
                }
            },

            syncDelete: function (path, params, items) {
                if (items) {
                    if (this.hasItem(items)) {
                        items.forEach(function (item) {
                            item = this.idToItems[item[this.idProperty]];
                            var index = this.array.indexOf(item);
                            this.array.splice(index, 1);
                            delete this.idToItems[item[this.idProperty]];
                        }, this);
                        return this.createResponse(null);
                    }
                } else {
                    var item = {};
                    item[this.idProperty] = path;
                    return this.syncDelete(null, params, [item]);
                }
            },

            read: function (path, params, data, deferred) {
                var resp = this.syncRead(path, params);
                if (resp) {
                    deferred.resolve(resp);
                } else {
                    deferred.reject(new Error ("No item at path " + path));
                }
            },

            create: function (path, params, data, deferred) {
                var resp = this.syncCreate(path, params, data);
                deferred.resolve(resp);
            },

            update: function (path, params, data, deferred) {
                var resp = this.syncUpdate(path, params, data);
                if (resp) {
                    deferred.resolve(resp);
                } else {
                    deferred.reject(new Error ("No item at path " + path));
                }
            },

            patch: function (path, params, data, deferred) {
                var resp = this.syncPatch(path, params, data);
                if (resp) {
                    deferred.resolve(resp);
                } else {
                    deferred.reject(new Error ("No item at path " + path));
                }
            },

            "delete": function (path, params, data, deferred) {
                var resp = this.syncDelete(path, params, data);
                if (resp) {
                    deferred.resolve(resp);
                } else {
                    deferred.reject(new Error ("No item at path " + path));
                }
            }

        });

        return function (config) {
            return new ArrayStore(config);
        };

    }];
}]);