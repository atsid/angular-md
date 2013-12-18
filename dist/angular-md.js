"use strict";
/**
 * @ngdoc provider
 * @name atsid.data:dataSource
 *
 * @description
 * Represents a data source.
 */
angular.module("atsid.data",[
    "atsid.data.store"
]).provider("dataSource", [function () {

    /**
     * Creates a configurator for a config object.  The config can then be passed into
     * a new DataSource constructor.
     * @param {Object} configObject The output object where the configurations will be set.
     */
    function dataSourceConfigurationFactory (configObject) {
        angular.extend(configObject, {
            defaults: {
                idProperty: "id",
                fields: null,
                fetches: null,
                q: null,
                count: 100,
                offset: 0
            },
            storeConfig: "http",
            routes: []
        });

        return {

            /**
             * Set the defaults for the data source, such as the
             * fields, count, or the identifier property for items.
             * @param {Object} defaults
             */
            setDefaults: function (defaults) {
                angular.extend(configObject.defaults, defaults);
            },

            /**
             * Set a store for the data source.  this must be an
             * instane of a store that complies with the data source"s
             * store interfaces.
             */
            setStore: function (store) {
                configObject.store = store;
                configObject.storeConfig = null;
            },

            /**
             * Set a store configuration.  Rather than setting
             * a store instance, this will create a new instance
             * based on the type property.  The supported stores
             * are "http" and "array".  By default, the data source
             * uses an HTTP store.
             * @param {Object} storeConfig
             */
            setStoreConfig: function (storeConfig) {
                configObject.storeConfig = storeConfig;
                configObject.store = null;
            },

            /**
             * Set the base url for the default HTTP store.
             * @param {String} url
             */
            setStoreUrl: function (url) {
                configObject.storeConfig = { type: "http", baseUrl: url};
                configObject.store = null;
            },

            /**
             * Adds resource routes to the data source.  A route is a path to a
             * particular child data source within the root source.
             * Depending on the store, this could be handled differently.  An HTTP store
             * will translate a route's path to the URL of the HTTP server, while an array
             * store will use it as a path within an object graph.
             * @param {Object[]} routeConfigs
             *
             * @example
             * {
             *     path: "contacts/:contactId/addresses/:addressId",
             *     fields: "name,phoneNumber"
             * }
             *
             * Route Examples:
             * routeName/:routeParam
             * routeName1/routeName2/:route2Param
             * contacts/:contactId/addresses/:addressId
             */
            addRoutes: function (routeConfigs) {
                routeConfigs = angular.isArray(routeConfigs) ? routeConfigs : [routeConfigs];
                configObject.routes.push.apply(configObject.routes, routeConfigs);
            }
        };
    }

    var globalConfig = {};
    angular.extend(this, dataSourceConfigurationFactory(globalConfig));

    this.$get = ["$q", "httpStore", function ($q, httpStore) {

        /**
         * Gets a data store based on a configuration.
         * @param  {Object} storeConfig A configuration with a type property indicating the type of store.
         * @return {Object}
         * @private
         */
        function getStore (storeConfig) {
            storeConfig = angular.isString(storeConfig) ? { type: "http", name: storeConfig } : storeConfig;
            return {
                $: httpStore,
                http: httpStore
            }[storeConfig.type || "$"](storeConfig);
        }

        /**
         * Gets the path for a service config.  If pathParams is not
         * passed in, the path will use the parameters' placeholder values.
         * @param  {Object} pathComponents Components for the path.
         * @param  {Object} [pathParams] parameters to be inserted into the path.
         * @return {String} The path
         * @private
         */
        function buildPath (pathComponents, pathParams) {
            var path = [];
            var lastIndex = pathComponents.length - 1;
            pathComponents.forEach(function (pathComponent) {
                var pathParam = pathParams ? pathParams[pathComponent.param] || null : ":" + pathComponent.param;
                path.push(pathComponent.name);
                if (pathParam !== null) {
                    path.push(pathParam);
                }
            });
            return path.join("/");
        }

        /**
         * TODO: Possibly add support for multiple params at a single route.
         * Builds the path components for a route configuration.  If a path property is present,
         * it is used, otherwise the parentRoute's path components are appended with the route
         * config's name property.
         * @param  {Object} routeConfig
         * @param  {Object} parentRoute
         * @return {Object[]} An array of path components.
         */
        function buildPathComponents (routeConfig, parentRoute) {
            var path = routeConfig.path;
            var pathComponents = !path && parentRoute ? parentRoute.pathComponents.slice(0) : [];

            if (path) {
                path = path.replace(/^\/|\/$/, ""); // remove slashes at the beginning and end.
                path = path.split("/");
                var i = 0;
                while(i < path.length) {
                    var name = path[i];
                    var param = path[i + 1];

                    if (param.charAt(0) === ":") {
                        param = param.substr(1);
                    } else {
                        param = null;
                    }
                    pathComponents.push({
                        name: name,
                        param: param
                    });
                    i += param ? 2 : 1;
                }
            } else if (routeConfig.name) {
                pathComponents.push({
                    name: routeConfig.name,
                    param: "id" + (parentRoute.level + 1)
                });
            }

            return pathComponents;
        }

        /**
         * @constructor
         * @description
         * A route within a data source.  Externally, a route
         * is represented as its own independent data source.
         * Except for the root route, which inherits from the constructor
         * itself, all other routes are viewed as branches of the root.
         * They are instead inherited from their parent routes.
         * @param {Object} config
         * @param {Object} parentRoute
         */
        function Route (config, parentRoute) {
            var route = this;
            config = config || {};

            if (parentRoute) {
                var SubRoute = function () {};
                SubRoute.prototype = parentRoute;
                route = new SubRoute();
            }

            var pathComponents = route.pathComponents = buildPathComponents(config, parentRoute);
            var lastPathComponent = pathComponents[pathComponents.length - 1];

            // Things we don't want to inherit from parent routes.
            route.path = buildPath(pathComponents);
            route.level = parentRoute ? parentRoute.level + 1 : 1;
            route.idProperty = config.idProperty || "id";
            route.parent = parentRoute;
            route.name = config.name || (lastPathComponent && lastPathComponent.name) || "";
            route.pathParams = {};
            route.params = config.params || {};
            route.routes = {};
            route.fields = config.fields;
            route.fetches = config.fetches;
            route.q = config.q;

            // Things that can be inherited
            if (config.count) {
                route.count = config.count;
            }
            if (config.offset) {
                route.offset = config.offset;
            }

            // Things that must be inherited
            if (config.store && !parentRoute) {
                route.store = config.store;
            }

            if (config.routes) {
                config.routes.forEach(function (routeConfig) {
                    route.addRoute(routeConfig);
                });
            }

            return route;
        }
        Route.prototype = {

            /**
             * Add a new route.  This will add a permanent child route with
             * the configuration set as the default.
             * @param {Object} routeConfig
             */
            addRoute: function (routeConfig) {
                var parentRoute = routeConfig.path ? this.getRouteByPath(routeConfig.path, true) : this;
                var route = new Route(routeConfig, parentRoute);
                parentRoute.routes[route.name] = route;
            },

            /**
             * Get a child route.  If the route doesn't exist, it returns a new temporary
             * route.
             * @param  {Object} routeConfig
             * @return {Object}
             */
            child: function (routeConfig) {
                routeConfig = angular.isString(routeConfig) ? { name: routeConfig } : routeConfig;
                if (!routeConfig.name && !routeConfig.path) {
                    throw new Error("Cannot create route without a name or path.");
                }
                var route = this.routes[routeConfig.name];
                return route ? route.getInstance(routeConfig) : new Route(routeConfig, this);
            },

            /**
             * Gets an existing route by path.
             * @param  {String} path
             * @param  {Boolean} [skipLast] Skip the last route.
             * @return {Object}
             */
            getRouteByPath: function (path, skipLast) {
                return this.getRouteByPathComponents(buildPathComponents({ path: path }), skipLast);
            },

            /**
             * Get an existing route by path components.
             * @param  {Objectp[]} pathComponents
             * @param  {Boolean} skipLast Skip the last route.
             * @return {Object}
             */
            getRouteByPathComponents: function (pathComponents, skipLast) {
                var route = this;
                if (skipLast) {
                    pathComponents = pathComponents.slice(0, pathComponents.length - 1);
                }
                pathComponents.forEach(function (pathComponent) {
                    var childRoute = route.routes[pathComponent.name];
                    if (childRoute) {
                        route = childRoute;
                    } else {
                        throw new Error("Missing route " + pathComponent.name + " when creating " + route.path + ".");
                    }
                });
                return route;
            },

            /**
             * Get a parent route by name. If no name is given, it gets the first parent.
             * @param  {String} parentName
             * @return {Object}
             */
            getParent: function (parentName) {
                var parent = this.parent;
                if (parent) {
                    if (!parentName || parent.name === parentName) {
                        return parent;
                    } else {
                        return parent.getParent(parentName);
                    }
                }
            },

            /**
             * Sets a parent item's path parameter.  This presets the
             * path parameter of a parent route's item for a child route.
             * @param {String} parentName
             * @param {Object} item An item that conforms to the parent route.
             */
            setParentItem: function (parentName, item) {
                if (!item) {
                    item = parentName;
                    parentName = null;
                }

                var parentPC;
                var pcs = this.pathComponents;
                var parent = this.getParent(parentName);
                var idProperty = (parent && parent.idProperty) || "id";

                // TODO:  Would be nice to not have to do two lookups (the parent route and the path component)
                if (pcs.length > 1) {
                    if (!parentName) {
                        parentPC = pcs[pcs.length - 2];
                    } else {
                        pcs.some(function (pc) {
                            if (pc.name === parentName) {
                                parentPC = pc;
                                return true;
                            }
                        });
                    }

                    if (parentPC) {
                        this.pathParams[parentPC.param] = item[idProperty];
                    }
                }
            },

            /**
             * Returns an data source instance of a route.  This allows the instance
             * to be modified with its own configuration while keeping the original defaults
             * clean.
             * @param  {Object} config
             * @return {Object} New data source instance for a route.
             */
            getInstance: function (config) {
                var instance;
                if (Object.create) {
                    instance = Object.create(this);
                } else {
                    var InstanceProto = function () {};
                    InstanceProto.prototype = this;
                    instance = new InstanceProto();
                }
                return angular.extend(instance, config || {});
            },

            /**
             * Get all the path params, including the current route's form
             * the params argument.
             * @param  {Object} params Used to retrieve the current route's path param.
             * @return {Object} All the path params
             */
            getPathParams: function (params) {
                var pathParams = angular.extend({}, this.pathParams),
                    pathParamName = this.pathComponents[this.pathComponents.length - 1].param,
                    pathParam = (params && (params[pathParamName] || params.id)) || null;

                pathParams[pathParamName] = pathParam;
                return pathParams;
            },

            /**
             * Gets the path of the route with all the params filled in.
             * @param  {Object} params The params of the current route.
             * @return {String} The final path.
             */
            getPath: function (params) {
                var pathParams = this.getPathParams(params);
                return buildPath(this.pathComponents, pathParams);
            },

            /**
             * The params sent to the data store.
             * @param  {Object} params
             * @return {Object}
             */
            getStoreParams: function (params) {
                var storeParams = angular.extend(angular.extend({
                    fields: this.fields,
                    fetches: this.fetches,
                    q: this.q,
                    count: this.count,
                    offset: this.offset
                }, this.params || {}), params);

                this.pathComponents.forEach(function (pc) {
                    if (storeParams[pc.name]) {
                        delete storeParams[pc.name];
                    }
                });
                // Remove any undefined properties incase stores do not handle them properly.
                angular.forEach(storeParams, function (value, name) {
                    if (value === null || value === undefined) {
                        delete storeParams[name];
                    }
                });

                return storeParams;
            },

            /**
             * Helper method to perform CRUD requests.
             * @param  {String} method The crud method.
             * @param  {Object} params parameters to send with the method.
             * @param  {*} [item]   The item to send with the request.
             * @return {Object} A promise to handle the response.
             */
            doRequest: function (method, params, item) {
                var deferred = $q.defer();
                params = params || {};

                if (method === "read") {
                    this.store[method](this.getPath(params), this.getStoreParams(params), deferred);
                } else {
                    this.store[method](this.getPath(params), this.getStoreParams(params), item, deferred);
                }
                return deferred.promise;
            },

            /**
             * Query for a list of items.
             * @param  {Object} params
             * @return {Object} promise
             */
            query: function (params) {
                return this.doRequest("read", params);
            },

            /**
             * Get an item by id.
             * @param  {Object} idOrParams
             * @return {Object} promise
             */
            get: function (idOrParams) {
                idOrParams = !angular.isObject(idOrParams) ? { id: idOrParams } : idOrParams;
                return this.query(idOrParams);
            },

            /**
             * Create a new item.
             * @param  {*} item  The item to create.
             * @return {Object} promise
             */
            create: function (item) {
                return this.doRequest("create", null, item);
            },

            /**
             * Update an existing item.
             * @param  {*} item
             * @return {Object} promise
             */
            update: function (item) {
                var params = {};
                params[this.idProperty] = item[this.idProperty];
                return this.doRequest("update", params, item);
            },

            /**
             * Save an item.  If the item does not have an id, it will
             * be created, otherwise, it'll be updated.
             * @param  {*} item  The item to save.
             * @return {Object} promise
             */
            save: function (item) {
                if (item.hasOwnProperty(this.idProperty)) {
                    return this.update(item);
                } else {
                    return this.create(item);
                }
            },

            /**
             * Deletes an item.
             * @param  {*} item  The item to delete.
             * @return {Object} promise
             */
            "delete": function (item) {
                var params = {};
                params[this.idProperty] = item[this.idProperty];
                return this.doRequest("delete", params);
            },

            /**
             * Same as delete, but doesn't have to be in square brackets to use.
             * @param  {*} item
             * @return {Object} promise
             */
            remove: function (item) {
                return this["delete"](item);
            }
        };

        function DataSource (config) {
            var rootRoute = new Route(angular.extend({
                store: config.store || getStore(config.storeConfig),
                routes: config.routes
            }, config.defaults));
            return rootRoute;
        }

        var globalDataSource = new DataSource(globalConfig);
        var dataSource = function (routeConfig) {
            return routeConfig ? globalDataSource.child(routeConfig) : globalDataSource;
        };

        dataSource.createDataSource = function (configFunc) {
            var config = {};
            configFunc(dataSourceConfigurationFactory(config));
            return new DataSource(config);
        };

        return dataSource;
    }];

}]);
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