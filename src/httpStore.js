/**
 * @ngdoc provider
 * @name atsid.data:httpStore
 *
 * @description
 * An HTTP based data store used by a data source.
 */
angular.module("atsid.data.httpStore", [
    require("./baseStore")
]).provider("httpStore", [function () {

    // Map of default store configurations.
    var defaultConfigs = {};

    /**
     * Add a default store config that can be accessed by name.
     * @param {String} name   A name to identify the store.
     */
    this.addStore = function (config) {
        if (!angular.isString(config.name)) {
            throw new Error("Global http store defaults require a name.");
        }
        defaultConfigs[config.name] = config;
    };

    this.$get = ["$http", "baseStore", "$cacheFactory", function ($http, baseStore, $cacheFactory) {

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
            this.buildTransformers(config.transformers || []);
        }

        HTTPStore.prototype = baseStore({

            /**
             * Parses the response of an http request.
             * @param  {String} method The method of the request.
             * @param  {Object} config the HTTPStore configuration.
             * @param  {Object} resp   the resp of the request.
             * @return {Object}        A dataSource compliant response object.
             */
            parseResponse: function (method, config, resp) {
                var respConfig = this.getValueAtPath("methods/" + method + "response", config) || config.response,
                    paths = respConfig.paths || {},
                    data = this.getValueAtPath(paths.data, resp) || resp,
                    isArray = angular.isArray(data);

                if (this.hasTransformers("response")) {
                    data = this.runTransformers("response", data, []);
                    if (data && !isArray) {
                        data = data[0];
                    }
                }

                return this.createResponse(data, this.getValueAtPath(paths.offset, resp), this.getValueAtPath(paths.total, resp));
            },

            /**
             * Builds the url for an http request.
             * @param  {String} url The route"s url.
             * @return {String}
             */
            buildUrl: function (url, query) {
                url = url || "";
                var baseUrl = this.config.baseUrl || "";
                var queryList = [];
                var separator = url && baseUrl.charAt(baseUrl.length - 1) !== "/" ? "/" : "";

                url = baseUrl + separator + url;
                angular.forEach(query, function (value, name) {
                    queryList.push(name + "=" + encodeURIComponent(value));
                });
                if (queryList.length) {
                    url += "?" + queryList.join("&");
                }
                return url;
            },

            getCache: function (cacheId) {
                if (!this.cache) {
                    this.cache = $cacheFactory(cacheId);
                }
                return this.cache;
            },

            invalidateCache: function () {
                if (this.cache) {
                    this.cache.removeAll();
                    //this.cache.destroy();
                    //this.cache = null;
                }
            },

            /**
             * Performs an HTTP request.
             * @param  {String} method
             * @param  {String} url
             * @param  {Object} params
             * @param  {Object} data
             * @param  {Object} deferred         A defer object to pass the response to.
             */
            doRequest: function (method, url, query, headers, data, storeParams) {
                var config = this.config;
                var self = this;
                var isArray = angular.isArray(data);
                if (this.hasTransformers("request")) {
                    data = this.runTransformers("request", data);
                    if (data && !isArray) {
                        data = data[0];
                    }
                }
                return $http({
                    method: method,
                    url: this.buildUrl(url, query),
                    data: data || '',
                    headers: angular.extend(angular.extend({}, this.config.headers), headers),
                    cache: storeParams.cache ? this.getCache(url) : false
                }).then(function (resp) {
                    return self.parseResponse(method.toLowerCase(), config, resp.data);
                });
            },

            read: function (url, query, data, storeParams) {
                return this.doRequest("GET", url, query, {}, data, storeParams);
            },

            create: function (url, query, data, storeParams) {
                this.invalidateCache();
                return this.doRequest("POST", url, query, {}, data, storeParams);
            },

            update: function (url, query, data, storeParams) {
                this.invalidateCache();
                return this.doRequest("PUT", url, query, {}, data, storeParams);
            },

            patch: function (url, query, data, storeParams) {
                this.invalidateCache();
                return this.doRequest("PATCH", url, query, {}, data, storeParams);
            },

            "delete": function (url, query, data, storeParams) {
                this.invalidateCache();
                return this.doRequest("DELETE", url, query, { "Content-Type": angular.isArray(data) ? "application/json" : null }, data, storeParams);
            },

            buildTransformers: function (transformers) {
                var tMap = this.transformerMap = {};
                (transformers || []).forEach(function (transformer) {
                    var tList = tMap[transformer.type] = tMap[transformer.type] || [];
                    tList.push(transformer);
                });
            },

            runTransformers: function (type, newItems, oldItems) {
                var tMap = this.transformerMap;
                var items = newItems;

                var tList = tMap[type];
                if (tList && newItems) {
                    tList.forEach(function (transformer) {
                        items = transformer.transform(items, oldItems);
                    });
                }

                return items;
            },

            hasTransformers: function (transformerType) {
                return this.transformerMap && this.transformerMap[transformerType];
            }

        });

        return function (config) {
            config = angular.isString(config) ? { name: config } : config || {};
            return new HTTPStore(config);
        };

    }];
}]);

module.exports = "atsid.data.httpStore";
