angular.module("atsid.data.store",[

/**
 * @ngdoc provider
 * @name atsid.data:httpStore
 *
 * @description
 * An HTTP based data store used by a data source.
 */
]).provider("httpStore", ["$httpProvider", function ($httpProvider) {
    var deleteRequests = $httpProvider.defaults.headers["delete"] = $httpProvider.defaults.headers["delete"] || {};
    deleteRequests["Content-Type"] = "application/json;charset=utf-8";

    /**
     * Angular doesn"t understand our response object and assumes the raw data is returned rather
     * than a response object with a status and data field.  For bulk responses we must transform the
     * response so angular can understand it properly, as it tries to perform its own transformation internally
     * by making each object a Resource object.
     */
    $httpProvider.responseInterceptors.push(["$q", function ($q) {
        return function (promise) {
            return promise.then(function (resp) {
                var method = resp.config.method.toLowerCase();
                if ((method === "post" || method === "put") && resp.data.data && angular.isArray(resp.data.data)) {
                    resp.data = resp.data.data;
                }
                return resp;
            });
        };
    }]);

    // Map of default store configurations.
    var defaultConfigs = {};

    /**
     * Add a default store config that can be accessed by name.
     * @param {String} name   A name to identify the store.
     */
    this.addStore = function (config) {
        if (!angular.isString(config.name)) {
            throw new Error("global http store defaults require a name.");
        }
        defaultConfigs[config.name] = config;
    };

    this.$get = ["$http", function ($http) {

        /**
         * @constructor
         * The constructor for a new HTTP store.
         * @param {Object} config default configurations.
         */
        function HTTPStore (config) {
            var defaults = angular.extend({
                response: {
                    paths: {
                        count: "count",
                        data: "data",
                        offset: "offset",
                        total: "total"
                    }
                },
                methods: {
                    get: null,
                    put: null,
                    patch: null,
                    post: null,
                    "delete": null
                }
            }, defaultConfigs[config.name] || {});
            this.config = angular.extend(angular.extend({}, defaults), config);
        }

        /**
         * Gets the value of a property from the given path.
         * @param  {String} path   The path to the property.
         * @param  {Object} object The object they path searches.
         * @return {*}        The value of the path.
         */
        function getValueAtPath (path, object) {
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

        /**
         * Parses the response of an http request.
         * @param  {String} method The method of the request.
         * @param  {Object} config the HTTPStore configuration.
         * @param  {Object} resp   the resp of the request.
         * @return {Object}        A dataSource compliant response object.
         */
        function parseResponse (method, config, resp) {
            var respConfig = getValueAtPath("methods/" + method + "response", config) || config.response,
                paths = respConfig.paths || {},
                data = getValueAtPath(paths.data, resp) || resp,
                count = angular.isArray(data) ? data.length : 1;

            return {
                data: data,
                count: count,
                offset: getValueAtPath(paths.offset, resp) || 0,
                total: getValueAtPath(paths.total, resp) || count
            };
        }

        HTTPStore.prototype = {

            /**
             * Builds the url for an http request.
             * @param  {String} url The route"s url.
             * @return {String}
             */
            buildUrl: function (url, params) {
                var baseUrl = this.config.baseUrl || "",
                    paramList = [];
                url = baseUrl + "/" + url;
                angular.forEach(params, function (value, name) {
                    paramList.push(name + "=" + value);
                });
                if (paramList.length) {
                    url += "?" + paramList.join("&");
                }
                return url;
            },

            /**
             * Performs an HTTP request.
             * @param  {String} method
             * @param  {String} url
             * @param  {Object} params
             * @param  {Object} data
             * @param  {Object} deferred         A defer object to pass the response to.
             */
            doRequest: function (method, url, params, data, deferred) {
                var config = this.config;
                return $http(angular.extend({
                    method: method,
                    url: this.buildUrl(url, params),
                    data: data || null,
                    headers: this.config.headers
                }), params).then(function (resp) {
                    deferred.resolve(parseResponse(method.toLowerCase(), config, resp.data));
                }, function (err) {
                    deferred.reject(err);
                });
            },

            read: function (url, params, deferred) {
                this.doRequest("GET", url, params, null, deferred);
            },

            create: function (url, params, data, deferred) {
                this.doRequest("POST", url, params, data, deferred);
            },

            update: function (url, params, data, deferred) {
                this.doRequest("PUT", url, params, data, deferred);
            },

            patch: function (url, params, data, deferred) {
                this.doRequest("PATCH", url, params, data, deferred);
            },

            "delete": function (url, params, data, deferred) {
                this.doRequest("DELETE", url, params, null, deferred);
            }

        };

        return function (config) {
            config = angular.isString(config) ? { name: config } : config;
            return new HTTPStore(config);
        };

    }];
}]);