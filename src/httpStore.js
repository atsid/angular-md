"use strict";

/**
 * @ngdoc provider
 * @name atsid.data:httpStore
 *
 * @description
 * An HTTP based data store used by a data source.
 */
angular.module("atsid.data.store").provider("httpStore", [function () {

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

    this.$get = ["$http", "store", function ($http, store) {

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

        HTTPStore.prototype = store({

            /**
             * Parses the response of an http request.
             * @param  {String} method The method of the request.
             * @param  {Object} config the HTTPStore configuration.
             * @param  {Object} resp   the resp of the request.
             * @return {Object}        A dataSource compliant response object.
             */
            parseResponse: function (method, config, resp) {
                var respConfig = getValueAtPath("methods/" + method + "response", config) || config.response,
                    paths = respConfig.paths || {},
                    data = getValueAtPath(paths.data, resp) || resp;

                return this.createResponse(data, getValueAtPath(paths.offset, resp), getValueAtPath(paths.total, resp));
            },

            /**
             * Builds the url for an http request.
             * @param  {String} url The route"s url.
             * @return {String}
             */
            buildUrl: function (url, query) {
                var baseUrl = this.config.baseUrl || "",
                    queryList = [];
                url = baseUrl + "/" + url;
                angular.forEach(query, function (value, name) {
                    queryList.push(name + "=" + value);
                });
                if (queryList.length) {
                    url += "?" + queryList.join("&");
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
            doRequest: function (method, url, query, headers, data, deferred) {
                var config = this.config;
                var self = this;
                return $http({
                    method: method,
                    url: this.buildUrl(url, query),
                    data: data || '',
                    headers: angular.extend(angular.extend({}, this.config.headers), headers)
                }).then(function (resp) {
                    deferred.resolve(self.parseResponse(method.toLowerCase(), config, resp.data));
                }, function (err) {
                    deferred.reject(err);
                });
            },

            read: function (url, query, data, deferred) {
                this.doRequest("GET", url, query, {}, null, deferred);
            },

            create: function (url, query, data, deferred) {
                this.doRequest("POST", url, query, {}, data || null, deferred);
            },

            update: function (url, query, data, deferred) {
                this.doRequest("PUT", url, query, {}, data || null, deferred);
            },

            patch: function (url, query, data, deferred) {
                this.doRequest("PATCH", url, query, {}, data || null, deferred);
            },

            "delete": function (url, query, data, deferred) {
                this.doRequest("DELETE", url, query, { "Content-Type": angular.isArray(data) ? "application/json" : null }, data || null, deferred);
            }

        });

        return function (config) {
            config = angular.isString(config) ? { name: config } : config;
            return new HTTPStore(config);
        };

    }];
}]);