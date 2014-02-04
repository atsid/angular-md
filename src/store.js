"use strict";

angular.module("atsid.data.store", ["atsid.eventable"]).provider("store", function () {

    var errorFactory = function (name, defaultMessage) {
        var ErrorCtr = function (message) {
            this.name = name;
            this.message = message || defaultMessage;
        };
        ErrorCtr.prototype = Error.prototype;

        return ErrorCtr;
    };

    var errors = {
        NotImlementedError: errorFactory("NotImlementedError", "Not implemented")
    };

    this.$get = ["eventable", function (eventable) {
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
                }


            }, config));

        };

        storeFactory.errors = errors;

        return storeFactory;
    }];

});