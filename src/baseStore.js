var errors = require("./errors");

angular.module("atsid.data.baseStore", [
    require("./eventable")
]).provider("baseStore", function () {

    this.$get = ["eventable", function (eventable) {

        function BaseStore () {}
        BaseStore.prototype = eventable({
            config: {},

            read: function (url, query, data, storeParams) {
                throw new errors.NotImlementedError();
            },

            create: function (url, query, data, storeParams) {
                throw new errors.NotImlementedError();
            },

            update: function (url, query, data, storeParams) {
                throw new errors.NotImlementedError();
            },

            patch: function (url, query, data, storeParams) {
                throw new errors.NotImlementedError();
            },

            "delete": function (url, query, data, storeParams) {
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
            }
        });

        var storeFactory = function (config) {
            function Store () {}
            Store.prototype = new BaseStore();
            angular.extend(Store.prototype, config);
            return new Store();
        };

        storeFactory.errors = errors;

        return storeFactory;
    }];

});

module.exports = "atsid.data.baseStore";
