"use strict";

angular.module("atsid.data.store", ["atsid.namedError", "atsid.eventable"]).provider("store", function () {

    this.$get = ["namedError", "eventable", function (namedError, eventable) {
        var errors = {
            NotImlementedError: namedError("NotImlementedError", "Not implemented")
        };
        var storeFactory = function (config) {
            return eventable(angular.extend({

                config: {},

                read: function (url, query, data, deferred) {
                    throw new errors.NotImlementedError();
                },

                create: function (url, query, data, deferred) {
                    throw new errors.NotImlementedError();
                },

                update: function (url, query, data, deferred) {
                    throw new errors.NotImlementedError();
                },

                patch: function (url, query, data, deferred) {
                    throw new errors.NotImlementedError();
                },

                "delete": function (url, query, data, deferred) {
                    throw new errors.NotImlementedError();
                },

                createResponse: function (data, offset, total) {
                    var isArray = data instanceof Array;
                    var count = isArray ? data.length : 1;
                    return {
                        data: data,
                        count: count,
                        offset: offset || 0,
                        total: total || count
                    };
                },

                sanitizeData: function (data) {
                    var safeData = {};
                    var keys = Object.keys(data);
                    var i = keys.length;
                    var key;
                    while (i --> 0) {
                        key = keys[i];
                        if (!/^[$]/.test(keys[i])) {
                            safeData[key] = angular.copy(data[key]);
                        }
                    }

                    return safeData;
                },

                /**
                 * Gets the value of a property from the given path.
                 * @param  {String} path   The path to the property.
                 * @param  {Object} object The object they path searches.
                 * @return {*}        The value of the path.
                 */
                getValueAtPath: function (path, object) {
                    var pathComponents = (path || "").split("/"),
                        value;

                    var currentObject;
                    if (pathComponents.length > 1 || pathComponents[0]) {
                        currentObject = object;
                        pathComponents.every(function (pathComponent) {
                            currentObject = currentObject[pathComponent];
                            if (currentObject) {
                                value = currentObject;
                                return true;
                            }
                        });
                    }

                    return currentObject;
                },


            }, config));

        };

        storeFactory.errors = errors;

        return storeFactory;
    }];

});