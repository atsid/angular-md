"use strict";

angular.module("atsid.data.store").provider("arrayStore", [function () {

    this.$get = ["store", "namedError", function (store) {
        /**
         * @constructor
         * The constructor for a new Array store.
         * @param {Object} config default configurations.
         */
        function ArrayStore (config) {
            config = config || {};
            this.array = [];
            this.idProperty = config.idProperty || "id";
            this.idToItems = {};
            this.sanitize = config.hasOwnProperty("sanitize") ? config.sanitize : true;
            if (config.getId) {
                this.getId = config.getId;
            }
            this.uid = 0;
            this.setItems(angular.isArray(config) ? config : config.array || []);
        }

        ArrayStore.prototype = store({

            _addItem: function (item, replace) {
                var idProperty = this.idProperty;
                if (item[idProperty] === null || item[idProperty] === undefined) {
                    item[idProperty] = this.getId();
                }

                if (this.sanitize) {
                    item = this.sanitizeData(item);
                }

                if (this.idToItems[item[idProperty]]) {
                    if (replace) {
                        var index = this.array.indexOf(item);
                        this.array.splice(index, 1, item);
                    } else {
                        return;
                    }
                } else {
                    this.array.push(item);
                }
                this.idToItems[item[idProperty]] = item;

                return this.sanitize ? angular.copy(item) : item;
            },

            getId: function () {
                do { this.uid += 1; } while (this.idToItems[this.uid]);
                return this.uid;
            },

            setItems: function (items) {
                this.array.splice(0, this.array.length);
                this.idToItems = {};
                this.uid = 0;
                items.forEach(function (item) {
                    this._addItem(item);
                }, this);
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
                } else if (item[this.idProperty] !== undefined && item[this.idProperty] !== null) {
                    return !!this.idToItems[item[this.idProperty]];
                }
                return !!this.idToItems[item];
            },

            refreshItemId: function (id, item) {
                if (this.idToItems[id]) {
                    delete this.idToItems[id];
                    this.idToItems[item[this.idProperty]] = item;
                    this._addItem(item, true);
                }
            },

            read: function (path, params, data) {
                var item;
                if (path !== undefined && path !== null) {
                    item = this.findItem(path);
                } else {
                    item = this.sanitize ? angular.copy(this.array) : this.array.slice(0);
                }
                if (item) {
                    return this.createResponse(item);
                }
                return new store.errors.NotFoundError("No item at path " + path);
            },

            create: function (path, params, data) {
                var idProperty = this.idProperty;

                if (angular.isArray(data)) {
                    return this.createResponse(data.map(function (item) {
                        return this._addItem(item);
                    }, this));
                }
                return this.createResponse(this._addItem(data));
            },

            update: function (path, params, data) {
                if (angular.isArray(data)) {
                    if (this.hasItem(data)) {
                        return this.createResponse(data.map(function (item) {
                            return this._addItem(item, true);
                        }, this));
                    }
                } else if (this.hasItem(path || params[this.idProperty])) {
                    return this.createResponse(this._addItem(data, true));
                }
                return new store.errors.NotFoundError("No item at path " + path);
            },

            patch: function (path, params, data) {
                if (angular.isArray(data)) {
                    if (this.hasItem(data)) {
                        return this.createResponse(data.map(function (changedItem) {
                            var item = this.findItem(changedItem[this.idProperty]);
                            angular.extend(item, changedItem);
                            return this._addItem(item, true);
                        }, this));
                    }
                } else {
                    var item = this.findItem(path);
                    if (item) {
                        angular.extend(item, data);
                        return this.createResponse(this._addItem(item, true));
                    }
                }
                return new store.errors.NotFoundError("No item at path " + path);
            },

            "delete": function (path, params, data) {
                if (data) {
                    if (this.hasItem(data)) {
                        data.forEach(function (item) {
                            item = this.idToItems[item[this.idProperty]];
                            var index = this.array.indexOf(item);
                            this.array.splice(index, 1);
                            delete this.idToItems[item[this.idProperty]];
                        }, this);
                        return this.createResponse(null);
                    }
                    return new store.errors.NotFoundError("No item at path " + path);
                } else {
                    var item = {};
                    item[this.idProperty] = params[this.idProperty];
                    return this["delete"](null, params, [item]);
                }
            }

        });

        return function (config) {
            return new ArrayStore(config);
        };

    }];
}]);