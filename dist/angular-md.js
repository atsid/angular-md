(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var errors = require("./errors");

angular.module("atsid.data.arrayStore", [
    require("./baseStore")
]).provider("arrayStore", [function () {

    this.$get = ["baseStore", function (baseStore) {
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

        ArrayStore.prototype = baseStore({

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
                return new errors.NotFoundError("No item at path " + path);
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
                return new errors.NotFoundError("No item at path " + path);
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
                return new errors.NotFoundError("No item at path " + path);
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
                    return new errors.NotFoundError("No item at path " + path);
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

module.exports = "atsid.data.arrayStore";

},{"./baseStore":2,"./errors":4}],2:[function(require,module,exports){
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

},{"./errors":4,"./eventable":5}],3:[function(require,module,exports){
var errors = require("./errors");

/**
 * @ngdoc provider
 * @name atsid.data:dataSource
 *
 * @description
 * Represents a data source.
 */
angular.module("atsid.data",[
    require("./eventable"),
    require("./httpStore"),
    require("./arrayStore")
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
                orderBy: null,
                count: 100,
                offset: 0,

                // If a route doesn't exist when the child() method is used, it is auto created on the fly.
                allowAutomaticRoutes: true
            },
            storeConfig: "http",
            routes: {}
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

            setStoreTransformers: function (transformers) {
                configObject.storeConfig.transformers = transformers;
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
             * name: {
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
                angular.extend(configObject.routes, routeConfigs);
            }
        };
    }

    var globalConfig = {};
    angular.extend(this, dataSourceConfigurationFactory(globalConfig));

    this.$get = ["$q", "httpStore", "arrayStore", "eventable", function ($q, httpStore, arrayStore, eventable) {

        /**
         * Gets a data store based on a configuration.
         * @param  {Object} storeConfig A configuration with a type property indicating the type of store.
         * @return {Object}
         * @private
         */
        function getStore (storeConfig) {
            storeConfig = angular.isString(storeConfig) ? { type: "http", name: storeConfig } : storeConfig;
            return {
                http: httpStore,
                array: arrayStore
            }[storeConfig.type || "http"](storeConfig);
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
                if (pathComponent.name !== null) {
                    path.push(pathComponent.name);
                }
                if (pathComponent.param !== null) {
                    var paramValue = pathParams ? pathParams[pathComponent.param] || null : ":" + pathComponent.param;
                    if (paramValue) {
                        path.push(paramValue);
                    }
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

                    if (name.charAt(0) === ":") {
                        param = name;
                        name = null;
                        i -= 1;
                    }

                    if (param && param.charAt(0) === ":") {
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
            route.config = config;

            // Things we don't want to inherit from parent routes.
            route.path = buildPath(pathComponents);
            route.level = parentRoute ? parentRoute.level + 1 : 1;
            route.idProperty = config.idProperty || "id";
            route.parent = parentRoute;
            route.pathName = (lastPathComponent && lastPathComponent.name) || "";
            route.name = config.name || route.pathName;
            route.pathParam = (lastPathComponent && lastPathComponent.param) || "";
            route.params = config.params || {};
            route.routes = {};
            route.fields = config.fields;
            route.fetches = config.fetches;
            route.q = config.q;
            route.orderBy = config.orderBy;
            route.transformers = config.transformers || [];
            route.buildTransformers(route.transformers);
            route.cache = config.cache || false;

            // Things that can be inherited
            if (config.count) {
                route.count = config.count;
            }
            if (config.offset) {
                route.offset = config.offset;
            }

            // Things that must be inherited
            if (!parentRoute) {
                route.nameToRoute = {};
                route.allowAutomaticRoutes = config.allowAutomaticRoutes;
                route.root = this;
                if (config.store) {
                    route.setStore(config.store);
                }
            } else {
                route.nameToRoute = Object.create(route.nameToRoute);
                parentRoute.routes[route.pathName] = route;
            }

            if (config.routes) {
                angular.forEach(config.routes, function (routeConfig, path) {
                    if (!routeConfig.path) {
                        routeConfig.path = path;
                    } else {
                        routeConfig.name = path;
                    }
                    route.addRoute(routeConfig);
                });
            }
            // Used for testing equality with instances of the same route.
            route._self = route;
            return route;
        }
        Route.prototype = eventable({

            setStore: function (store) {
                if (this.root !== this) {
                    throw new errors.NotRootRouteError("Must be the root route to set the store");
                }

                var currentStore = this.store;
                if (currentStore && this.storeListeners) {
                    this.storeListeners.forEach(function (storeListener) {
                        storeListener.remove();
                    });
                }

                this.store = store;
                if (store) {
                    this.storeListeners = [
                        store.on("message", function (e, message) {
                            var args = Array.prototype.slice.call(arguments, 1);
                            this.emit.apply(this, args);
                        })
                    ];
                }
            },

            /**
             * Add a new route.  This will add a permanent child route with
             * the configuration set as the default.
             * @param {Object} routeConfig
             */
            addRoute: function (routeConfig) {
                this._adding = true;
                if (!routeConfig || (!routeConfig.path && !routeConfig.name)) {
                    throw new errors.ParameterError("Cannot create route without a name or path.");
                }
                if (routeConfig.path && routeConfig.path.charAt(0) !== "/" && this.path) {
                    routeConfig.path = this.path + "/" + routeConfig.path;
                }
                var parentRoute = routeConfig.path ? this.root.getRouteByPath(routeConfig.path, true) : this;
                var route = new Route(routeConfig, parentRoute);
                if (routeConfig.name) {
                    // TODO: Remove the root nameToRoute mapping at some point.  This is for backwards compatibility.
                    this.root.nameToRoute[routeConfig.name] = this.nameToRoute[routeConfig.name] = route;
                }
                this._adding = false;
                return route;
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
                    throw new errors.ParameterError("Cannot create route without a name or path.");
                }
                var route = this._getRouteByNameOrPath(routeConfig.path || routeConfig.name);
                if (!route) {
                    if(this.allowAutomaticRoutes) {
                        route = new Route(routeConfig, this);
                    } else {
                        throw new Error("Route \"" + (routeConfig.path || routeConfig.name) + "\" does not exist.");
                    }
                }
                return route.getInstance(routeConfig, this.isEqual(this.root) ? null : this);
            },

            _getRouteByNameOrPath: function (name) {
                return this.nameToRoute[name] || this.getRouteByPath(name);
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
             * @param  {Object[]} pathComponents
             * @param  {Boolean} skipLast Skip the last route.
             * @return {Object}
             */
            getRouteByPathComponents: function (pathComponents, skipLast) {
                var currentRoute = this;
                if (skipLast) {
                    pathComponents = pathComponents.slice(0, pathComponents.length - 1);
                }
                pathComponents.every(function (pathComponent) {
                    var route = currentRoute.routes[pathComponent.name];
                    if (!route) {
                        if (currentRoute._adding || currentRoute.allowAutomaticRoutes) {
                            route = currentRoute.addRoute({ path: pathComponent.name });
                        } else {
                            throw new errors.RouteNotFoundError("The route, \"" + pathComponent.name + "\", does not exist");
                        }
                    }
                    currentRoute = route;
                    return true;
                });
                return currentRoute;
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

                var parent = this.getParent(parentName);
                if (parent) {
                    parent.setItem(item);
                }
                this.emit('parentItemChanged', item);
            },

            /**
             * Get all the path params, including the current route's from
             * the params argument.
             * @param  {Object} params Used to retrieve the current route's path param.
             * @return {Object} All the path params
             */
            getPathParams: function (params) {
                var pathParams = {};
                var parent = this.getParent();
                var pcs = this.pathComponents;
                var i = pcs.length - 2;
                var pc = pcs[i];
                var itemParam = params[this.idProperty] || params[this.pathParam];

                if (itemParam !== undefined && itemParam !== null) {
                    pathParams[this.pathParam] = itemParam;
                }

                while (parent && pc) {
                    pathParams[pc.param] = (parent.currentItem && parent.currentItem[parent.idProperty]) || params[pc.param];
                    parent = parent.getParent();
                    i -= 1;
                    pc = pcs[i];
                }

                return pathParams;
            },

            setItem: function (item) {
                this.currentItem = item;
                this.emit('itemChanged', item);
            },

            /**
             * Returns an data source instance of a route.  This allows the instance
             * to be modified with its own configuration while keeping the original defaults
             * clean.
             * @param  {Object} config
             * @return {Object} New data source instance for a route.
             */
            getInstance: function (config, parent) {
                var instance;
                if (Object.create) {
                    instance = Object.create(this);
                } else {
                    var InstanceProto = function () {};
                    InstanceProto.prototype = this;
                    instance = new InstanceProto();
                }
                instance.config = angular.extend(angular.extend({}, this.config), config);
                if (parent) {
                    instance.parent = parent;
                } else if (instance.parent) {
                    instance.parent = instance.parent.getInstance();
                }
                return angular.extend(instance, config || {});
            },

            /**
             * Gets the path of the route with all the params filled in.
             * @param  {Object} params The params of the current route.
             * @return {String} The final path.
             */
            getPath: function (params) {
                var pathParams = this.getPathParams(params || {});
                return buildPath(this.pathComponents, pathParams);
            },

            /**
             * Returns the url of the route.
             * @param  {Object} pathParams
             * @param  {Object} queryParams
             * @return {String}
             */
            getUrl: function (pathParams, queryParams) {
                var url = this.getPath(pathParams);
                return this.store.buildUrl(url, this.getStoreParams(queryParams || {}));
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
                    offset: this.offset,
                    orderBy: this.orderBy
                }, this.params || {}), params);

                this.pathComponents.forEach(function (pc) {
                    if (storeParams[pc.param]) {
                        delete storeParams[pc.param];
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
             * Is the route instance the same as another.
             * @param {Route} otherDataSource Route to compare to.
             */
            isEqual: function (otherDataSource) {
                return otherDataSource._self === this._self;
            },

            buildTransformers: function (transformers) {
                var tMap = this.transformerMap = {};
                (transformers || []).forEach(function (transformer) {
                    var tList = tMap[transformer.type] = tMap[transformer.type] || [];
                    tList.push(transformer);
                });
            },

            /**
             * Runs any transformers of a given type.
             * @param {String} type
             * @param {Object[]} newItems the source to transform.
             * @param {Object[]} oldItems the original items before a request to the server (if the type is response).
             * @private
             */
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
                var isArray = angular.isArray(item);
                var oldItems = !item || isArray ? item : [item];
                var self = this;

                params = angular.extend(angular.copy(this.params || {}), params || {});
                var path = this.getPath(params);
                var queryParams = this.getStoreParams(params);
                var storeParams = {
                    cache: this.cache
                };

                if (this.hasTransformers("request")) {
                    item = this.runTransformers("request", oldItems);
                    if (item && !isArray) {
                        item = item[0];
                    }
                }

                this.emit("request", {
                    method: method,
                    path: path,
                    params: queryParams,
                    data: item
                });

                var result = this.store[method](path || null, queryParams, item, storeParams);
                if (result.then) {
                    result.then(function (resp) {
                        deferred.resolve(self._resolveRequest(method, path, queryParams, oldItems, resp));
                    }, function (err) {
                        self.emit("error", err);
                        deferred.reject(err);
                    });
                } else if (result instanceof Error) {
                    self.emit("error", result);
                    deferred.reject(result);
                } else {
                    deferred.resolve(this._resolveRequest(method, path, queryParams, oldItems, result));
                }

                return deferred.promise;
            },

            _resolveRequest: function (method, path, queryParams, oldItems, resp) {
                var isArray = angular.isArray(resp.data);
                var newItems = !resp.data || isArray ? resp.data : [resp.data];

                if (this.hasTransformers("response")) {
                    newItems = this.runTransformers("response", newItems, oldItems || []);
                    if (newItems && !isArray) {
                        newItems = newItems[0];
                    }
                    resp.data = newItems;
                }

                this.emit("response", {
                    method: method,
                    path: path,
                    params: queryParams,
                    response: resp
                });

                this.emit(method, resp.data);

                return resp;
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
                if (!idOrParams.id) {
                    throw new errors.ParameterError("Requires an item id or parameters that include an id.");
                }
                return this.query(idOrParams);
            },

            /**
             * Create a new item.
             * @param  {*} item  The item to create.
             * @param  {Object} [params]
             * @return {Object} promise
             */
            create: function (item, params) {
                if (!item) { throw new errors.ParameterError("Requires an item to create."); }
                //var itemParam = item[this.idProperty] || item[this.pathParam];
                params = params || {};
                // if (itemParam) {
                //     params[this.pathParam] = itemParam;
                // }
                return this.doRequest("create", params, item);
            },

            /**
             * Update an existing item.
             * @param  {*} item
             * @param  {Object} [params]
             * @return {Object} promise
             */
            update: function (item, params) {
                if (!item) { throw new errors.ParameterError("Requires an item to update."); }
                params = params || {};
                params[this.idProperty] = item[this.idProperty];
                return this.doRequest("update", params, item);
            },

            /**
             * Save an item.  If the item does not have an id, it will
             * be created, otherwise, it'll be updated.
             * @param  {*} item  The item to save.
             * @param  {Object} [params]
             * @return {Object} promise
             */
            save: function (item, params) {
                if (item.hasOwnProperty(this.idProperty)) {
                    return this.update(item, params);
                } else {
                    return this.create(item, params);
                }
            },

            /**
             * Deletes an item.
             * @param  {*} item  The item to delete.
             * @param  {Object} [params]
             * @return {Object} promise
             */
            "delete": function (item, params) {
                if (!item) { throw new errors.ParameterError("Requires an item to delete."); }
                params = params || {};
                if (!angular.isArray(item)) {
                    params[this.idProperty] = item[this.idProperty];
                    return this.doRequest("delete", params);
                }
                return this.doRequest("delete", params, item);
            },

            /**
             * Same as delete, but doesn't have to be in square brackets to use.
             * @param  {*} item
             * @param  {Object} [params]
             * @return {Object} promise
             */
            remove: function (item, params) {
                return this["delete"](item, params);
            },

            /**
             * Perform a batch of operations without dealing with promise management.
             * A function is passed in, with the route as a parameter.  The batchFn's scope
             * is a custom batch route.  Within the batch function, you'd call the actions as "this.read()".
             * This essentially creates a client side transaction. An array can optionally be passed in to
             * run the batch function on each item.  It still only creates a single transaction.
             * @example
             *     route.batch(function () {
             *         this.create(newItems);
             *         this.remove(deletedItems);
             *     }).then(function ()) {
             *         ...
             *     })
             *     route.batch(items, function (item) {
             *         this.setParentItem(item);
             *         this.query().then(function (resp) {
             *             item.childern = resp.data;
             *         });
             *     }).then(function () {
             *         // handle item manipulation after children are all loaded.
             *     });
             * @param {Object[]} [array] An array of items.
             * @param  {Function} batchFn
             * @return {Promise}
             */
            batch: function (array, batchFn) {
                var promises = [];

                if (!batchFn) {
                    batchFn = array;
                    array = null;
                }

                var addPromise = function (newPromise, oldPromise) {
                    // No need to wait on a promise if there are ones after it.
                    if (oldPromise) {
                        promises.splice(promises.indexOf(oldPromise), 1);
                    }
                    promises.push(newPromise);
                    return newPromise;
                };

                var createFakePromise = function (promise, addedPromise) {
                        return {
                            then: function (success, error) {
                                var p = addPromise(promise.then(success, error), promise);
                                return createFakePromise(p);
                            }
                        };
                    },
                    callMethod = function (route, methodName, args) {
                        var promise = addPromise(route[methodName].apply(route, args));

                        return createFakePromise(promise, function (oldPromise) {
                            promises.splice(promises.indexOf(promise), 1);
                        });
                    };

                var fakeRoute = this.getInstance({
                    query: function () {
                        return callMethod(fakeRoute, "query", arguments);
                    },
                    get: function () {
                        return callMethod(fakeRoute, "get", arguments);
                    },
                    create: function () {
                        return callMethod(fakeRoute, "create", arguments);
                    },
                    update: function () {
                        return callMethod(fakeRoute, "update", arguments);
                    },
                    save: function () {
                        return callMethod(fakeRoute, "save", arguments);
                    },
                    "delete": function () {
                        return callMethod(fakeRoute, "delete", arguments);
                    },
                    remove: function () {
                        return callMethod(fakeRoute, "delete", arguments);
                    }
                });

                if (array) {
                    array.forEach(batchFn, fakeRoute);
                } else {
                    batchFn.call(fakeRoute);
                }

                return $q.all(promises);
            }
        });

        function DataSource (config) {
            var rootRoute = new Route(angular.extend({
                store: config.store || getStore(config.storeConfig),
                routes: config.routes
            }, config.defaults));
            return rootRoute;
        }

        var globalDataSource = new DataSource(globalConfig);
        var dataSource = function (routeConfig) {
            return routeConfig ? globalDataSource.child(routeConfig) : globalDataSource.getInstance();
        };

        dataSource.createDataSource = function (configFunc) {
            var config = {};
            var configObj = dataSourceConfigurationFactory(config);
            if (angular.isFunction(configFunc)) {
                configFunc.call(configObj, configObj);
            } else if (angular.isObject(configFunc)) {
                configObj.setDefaults(configFunc);
            }
            return new DataSource(config);
        };

        dataSource.errors = errors;

        return dataSource;
    }];

}]);

module.exports = "atsid.data";

},{"./arrayStore":1,"./errors":4,"./eventable":5,"./httpStore":6}],4:[function(require,module,exports){
function createNamedError(name, defaultMessage) {
    var ErrorCtr = function () {};
    ErrorCtr.prototype = new Error(defaultMessage);
    ErrorCtr.prototype.name = name;
    return ErrorCtr;
}

function generateErrorsFromMap(map) {
    var newMap = {};
    for (var errorName in map) {
        newMap[errorName] = createNamedError(errorName, map[errorName]);
    }
    return newMap;
}

module.exports = generateErrorsFromMap({
    // General Errors
    NotImlementedError: "Not implemented",
    NotFoundError: "Not Found",

    // Data Source Errors
    NotRootRouteError: "Must be the root route to use this feature",
    ParameterError: "Missing Parameter",
    RouteNotFoundError: "The route does not exist"
});
},{}],5:[function(require,module,exports){
angular.module("atsid.eventable",[]).provider("eventable", [function () {

    /**
     * @constructor
     *
     * @description
     * Adds message based eventing to objects.  Used by
     * Item and ItemCollection.
     */
    function Eventable (config, scope) {
        angular.extend(this, config);
    }

    Eventable.prototype = {
        _getEventableScope: function () {
            return this;
        },

        /**
         * Gets all the event listeners for a message.
         * @param  {String} message The message of the event.
         * @return {Object[]} An array of listeners.
         */
        _getEventListeners: function (message) {
            var scope = this._getEventableScope();
            var messages = scope.$eventMessages = scope.$eventMessages || {};
            var listeners = messages[message];
            if (!listeners) {
                listeners = messages[message] = [];
            }
            return listeners;
        },

        hasListeners: function (message) {
            return !!this._getEventableScope()._getEventListeners(message);
        },

        /**
         * Emit a message.
         * @param  {String} message The message to emit.
         * @return {Event} The event used to send the message.
         */
        emit: function (message, data) {
            var args = Array.prototype.slice.call(arguments, 1);
            var listeners = this._getEventListeners(message);
            var event = {
                    message: message,
                    data: data,
                    preventDefault: function() {
                        event.defaultPrevented = true;
                    },
                    defaultPrevented: false
                };

            args.unshift(event);

            listeners.forEach(function (listener) {
                listener.fn.apply(listener.target, args);
            });

            return event;
        },

        /**
         * Add an event listener for a given message.
         * @param  {String} message The message for the listener.
         * @param  {Function} listenerFn The function that is called to handle the event.
         * @return {Object} The listener.  To remove, use listener.remove().
         */
        on: function (message, listenerFn) {
            var listeners = this._getEventListeners(message);
            var listener = {
                fn: listenerFn,
                target: this,
                remove: function () {
                    var index = listeners.indexOf(this);
                    listeners.splice(index, 1);
                }
            };

            listeners.push(listener);
            return listener;
        }

    };

    this.$get = function () {
        return function (config, scope) {
            return new Eventable(config, scope);
        };
    };

}]);

module.exports = "atsid.eventable";

},{}],6:[function(require,module,exports){
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

},{"./baseStore":2}],7:[function(require,module,exports){
angular.module("atsid.data.itemCollection", [
    require("./eventable"),
    require("./data")
]).provider("itemCollection", [function () {
    this.$get = ["dataSource", "arrayStore", "eventable", "$q", "$timeout", function (dataSource, arrayStore, eventable, $q, $timeout) {

        /**
         * @constructor
         * @param {Object} itemData The initial data of the item.
         * @param {ItemCollection} collection The collection that manages the item.
         * Each item requires a collection to work properly.
         */
        function Item (itemData, collection) {
            // Private meta data
            var meta = {
                collection: collection,

                /**
                 * The original data since the item was last saved.
                 * Used to diff the item for any unsaved changes.
                 * @type {Object}
                 */
                originalData: {},

                /**
                 * In certain cases, a child collection's parent item may
                 * not yet exist in the persistent store.  In those cases
                 * the child item cannot be saved.  ItemCollection still adds these
                 * items as if they were saved, but internally flags the item as unsaved.
                 * When the parent item is finally saved it tells all child collections
                 * to save any items that are marked with the "unsaved" flag.
                 * @type {Boolean}
                 */
                unsaved: false
            };

            /**
             * Meta data is accessed via a getter function so angular doesn't have circular dependency issues
             * when copying.
             * @return {Object}
             */
            this.$meta = function () {
                return meta;
            };

            this.setData(itemData);

        }
        Item.prototype = angular.extend(eventable(), {

            /**
             * Gets a flat copy of the item's data that is usable with
             * data sources.
             * @param {Boolean} useOriginalData Get the original / saved data without any changes.
             * @return {Object}
             */
            getData: function (useOriginalData, includeTempId) {
                var data = {};
                var source = useOriginalData ? this.$meta().originalData : this;
                var exists = this.exists();

                for (var propName in source) {
                    if (source.hasOwnProperty(propName) && propName.charAt(0) !== "$" && (propName !== this.$meta().collection.idProperty || exists || includeTempId)) {
                        data[propName] = source[propName];
                    }
                }
                return data;
            },

            /**
             * Sets data on the item.  This is used to apply data
             * that is assumed to already exist in the persistent store.
             * An example is applying missing fields that were queried.
             * @param {Object} data
             * @param {Boolean} perserveChanges Does not overwrite changed fields.
             */
            setData: function (data, perserveChanges) {
                var originalData = this.$meta().originalData;
                var keys = Object.keys(data);
                var propName;

                for (var i = 0; i < keys.length; i++) {
                    propName = keys[i];
                    if (propName !== "$meta") {
                        if (!perserveChanges || (!this.hasOwnProperty(propName) || originalData[propName] === this[propName])) {
                            // TODO: doing a deep copy to support complex objects.  Need to optimize this.
                            this[propName] = angular.copy(data[propName]);
                        }
                        originalData[propName] = data[propName];
                    }
                }
            },

            forEachChild: function (func) {
                var results = [];
                var cols = this.$meta().collectionCache;
                var stop = false;
                var stopFn = function () {
                    stop = true;
                };
                if (cols) {
                    Object.keys(cols).some(function (colName) {
                        results.push(func(cols[colName], stopFn));
                        return stop;
                    });
                }
                return results;
            },

            /**
             * Reverts any client side changes to an item.
             */
            revertChanges: function () {
                this.setData(this.$meta().originalData);
                this.forEachChild(function (col) {
                    col.revertChanges();
                });
                this.emit("didRevertChanges", this);
            },

            /**
             * Determines if the item has changes.
             * @return {Boolean}
             */
            hasChanges: function (includeChildren) {
                var changed = !angular.equals(this.getData(), this.$meta().originalData);
                if (!changed && includeChildren) {
                    this.forEachChild(function (col, stop) {
                        changed = col.hasChanges();
                        if (changed) {
                            stop();
                        }
                    });
                }
                return changed;
            },

            /**
             * Query extra fields or other information.
             * @param  {Object} params
             * @return {Object} promise
             */
            query: function (params) {
                var self = this;
                return this.$meta().collection.queryItem(this, params);
            },

            /**
             * Save the item.
             * @return {Object} promise
             */
            save: function (persist) {
                var self = this;
                var deferred = $q.defer();
                this.$meta().collection.saveItem(this, persist || false).then(function (item, tempSave) {
                    var promises = [];
                    self.$meta().unsaved = tempSave;
                    item.emit("didSave", item, function (promise) {
                        promises.push(promise);
                    });
                    $q.all(promises).then(function() {
                        deferred.resolve(item);
                    }, function (error) {
                        deferred.resolve(item);
                    });
                });
                return deferred.promise;
            },

            /**
             * If the item is termporarily saved in the collection, not the actual persistent store,
             * it returns false.
             * @return {Boolean}
             */
            isSaved: function () {
                return !this.$meta().unsaved;
            },

            /**
             * The item has been deleted.
             * @return {Boolean}
             */
            isDeleted: function () {
                return this.$meta().deleted;
            },

            /**
             * Determines if the item exists in the persistent store.
             * @return {Boolean} True if it has been persisted.
             */
            exists: function () {
                var idProperty = this.$meta().collection.idProperty;
                return String(this[idProperty]).search("temp") !== 0 && !this.isDeleted() && this.isSaved() && this[idProperty] !== undefined && this[idProperty] !== null;
            },

            /**
             * Deletes the item.
             * @return {Object} promise
             */
            "delete": function (persist) {
                var self = this;
                return this.$meta().collection.deleteItem(this, persist || false).then(function () {
                    self.$meta().unsaved = false;
                    self.$meta().deleted = true;
                });
            },

            /**
             * Deletes the item.
             * @return {Object} promise
             */
            remove: function (persist) {
                return this["delete"](persist);
            },

            /**
             * Selects the item.
             */
            select: function (deselectOthers) {
                this.$meta().collection.selectItem(this, deselectOthers);
            },

            /**
             * Determines if the ite  is within an item collection.
             * @param  {ItemCollection}  collection
             * @return {Boolean}
             */
            isIn: function (collection) {
                return this.$meta().collection === collection;
            },

            /**
             * Gets a child collection.
             * @param  {String|Object} nameOrConfig Either the name of the child data
             * source or a configuration for the child collection.
             * @return {ItemCollection}
             */
            child: function (nameOrConfig) {
                var userConfig = angular.isString(nameOrConfig) ? { name: nameOrConfig } : nameOrConfig;
                var meta = this.$meta();
                var collection = meta.collection;
                var collectionCache = meta.collectionCache;
                var childMapper = collection.children || {};
                var mapperConfig;

                if (!collectionCache) {
                    collectionCache = meta.collectionCache = {};
                }

                if (collectionCache[userConfig.name]) {
                    return collectionCache[userConfig.name];
                }

                if (childMapper) {
                    mapperConfig = childMapper[userConfig.name] || {};
                    angular.extend(userConfig, angular.isString(mapperConfig) ? { dataSource: mapperConfig } : mapperConfig);
                    userConfig.items = this[userConfig.name];
                } else {
                    userConfig = angular.isString(nameOrConfig) ? { dataSource: nameOrConfig } : nameOrConfig;
                }

                var config = angular.extend({
                    saveWithParent: collection.saveChildren,
                    saveChildren: collection.saveChildren
                }, userConfig);

                config.parentItem = this;
                var dataSource = config.dataSource = collection.dataSource.child(config.dataSource);
                dataSource.setParentItem(this);

                var childCollection = collectionCache[userConfig.name] = new ItemCollection(config);
                return childCollection;
            },

            saveChildren: function (saveOriginal) {
                var self = this;
                return $q.all(this.forEachChild(function (col) {
                    col.dataSource.setParentItem(self);
                    return col.saveChanges(saveOriginal);
                }));
            }

        });

        /**
         * @constructor
         * @param {Object} config
         */
        function ItemCollection (config) {
            angular.extend(this, angular.extend({
                saveWithParent: false
            }, config));

            this.dataSource = angular.isString(config.dataSource) ? dataSource(config.dataSource) : config.dataSource;
            this.idProperty = this.dataSource.idProperty;

            var parentItem = this.parentItem;
            if (parentItem) {
                var self = this;
                parentItem.on("didRevertChanges", function (e) {
                    self.revertChanges();
                });
            }

            // Setup initial item store.
            this.setItems(this.items || []);
        }

        ItemCollection.prototype = angular.extend(eventable(), {

            /**
             * Gets the ItemCollection's data source.
             * @return {DataSource}
             */
            getDataSource: function (persist) {
                return persist || (persist === undefined && this._canSave()) ? this.dataSource : this.tempDataSource;
            },

            /**
             * Refresh the items in the collection.
             * @param  {Object[]} itemDataList An array of raw data for the items.
             * @return {Item[]}
             * @private
             */
            _refreshItems: function (itemDataList, oldItemDataList) {
                oldItemDataList = oldItemDataList || [];
                return itemDataList.map(function (itemData, i) {
                    var itemId = (oldItemDataList[i] && oldItemDataList[i][this.idProperty]) || itemData[this.idProperty];
                    var resp = itemId !== undefined && itemId !== null && this.itemStore.read(itemId);
                    var item = resp && resp.data;
                    if (item) {
                        item.setData(itemData);
                        if (itemId !== itemData[this.idProperty]) {
                            this.itemStore.refreshItemId(itemId, item);
                        }
                    } else {
                        item = oldItemDataList[i];
                        if (item && item.isIn && item.isIn(this)) {
                            item.setData(itemData);
                        }
                        item = this.addItem(item || itemData);
                    }
                    return item;
                }, this);
            },

            /**
             * Determines if the ItemCollection is currently able to save.
             * @return {Boolean}
             * @private
             */
            _canSave: function () {
                return !this.saveWithParent && (!this.parentItem || this.parentItem.exists());
            },

            /**
             * Verify the item is valid for this collection.
             * @param  {Item} item
             */
            _verifyItem: function (item) {
                if (!item.isIn || !item.isIn(this)) {
                    throw new Error("Tried to perform an action on item that is not within the collection.");
                } else if (item.isDeleted()) {
                    throw new Error("Tried to perform an action on item that is deleted.");
                }
            },

            /**
             * Add an item to the collection.  If it is already an item from
             * a new collection, it will be copied into the collection.
             * @param {Item|Object} itemData
             */
            addItem: function (itemData) {
                var item = itemData.isIn && itemData.isIn(this) && !itemData.isDeleted() && itemData;
                return this.itemStore.create("", null, item || this.createItem(itemData)).data;
            },

            /**
             * Adds a list of items to the collection.
             * @param {Item[]|Object[]} items
             */
            addItems: function (items) {
                return items.map(function (item) {
                    return this.addItem(item);
                }, this);
            },

            setItems: function (items) {
                this.clear();
                this._refreshItems(items);
            },

            /**
             * Clear the collection, refreshing the internal store.
             * This removes all items and their changes from the collection.
             */
            clear: function () {
                this.deletedItems = [];
                var itemStore = this.itemStore = arrayStore({
                    sanitize: false,
                    array: [],
                    getId: function () {
                        if (!this.fakeUid) {
                            this.fakeUid = 0;
                        }
                        this.fakeUid += 1;
                        return "temp_" + this.fakeUid;
                    }
                });
                this.tempDataSource = dataSource.createDataSource(function (configurator) {
                    configurator.setStore(itemStore);
                });
            },

            revertChanges: function () {
                this.itemStore.array.forEach(function (item) {
                    item.revertChanges();
                });
                this.deletedItems.forEach(function (item) {
                    this.addItem(item.getData());
                }, this);
                this.deletedItems.splice(0, this.deletedItems.length);
            },

            hasChanges: function () {
                var changed = this.deletedItems.length;
                if (!changed) {
                    changed = this.itemStore.array.some(function (item) {
                        return item.hasChanges(true);

                    });
                }
                return changed;
            },

            /**
             * Query items from the data source to populate the collection.
             * @param  {Object} [params]  parameters for the query.
             * @param  {Boolean} replace Clears the current items in the collection.
             * @return {Promise}
             */
            query: function (params, replace) {
                var self = this;
                var deferred = $q.defer();

                this.emit("willQuery", params);
                if (!this.parentItem || this.parentItem.exists()) {
                    this.dataSource.query(params).then(function (resp) {
                        if (replace) {
                            self.clear();
                        }
                        resp = angular.extend({}, resp);
                        resp.data = self._refreshItems(resp.data);
                        self.serverTotal = resp.total;
                        deferred.resolve(resp);
                        self.emit("didQuery", self);
                    }, function (err) {
                        deferred.reject(err);
                    });
                } else {
                    self.emit("didQuery", self);
                    $timeout(function () {
                        deferred.resolve(self);
                    });
                }

                return deferred.promise;
            },

            /**
             * Saves all the changes within the item collection.
             * @param  {Boolean} saveOriginal If true, the original data of items are saved.
             * This is for cases in which an item was artificially saved client side, but has
             * not yet been persisted.
             * @return {Promise}
             */
            saveChanges: function (saveOriginal) {
                var idProperty = this.idProperty;
                var deferred = $q.defer();
                var self = this;
                var savedItems = [];
                var promises = [];

                var newItems = [];
                var newItemsWithIds = [];
                var changedItems = [];
                var deletedItems = this.deletedItems;

                // Find all the items that have changed or have been deleted.
                this.itemStore.array.forEach(function (item) {
                    if (!item.exists()) {
                        newItems.push(item.getData(saveOriginal));
                        newItemsWithIds.push(item);
                    } else if (item.hasChanges()) {
                        if (!saveOriginal || !item.isSaved()) {
                            changedItems.push(item.getData(saveOriginal));
                        }
                    }
                });

                this.emit("willSaveChanges", newItems.concat(changedItems), deletedItems);

                // Create operation.
                if (newItems.length) {
                    promises.push(this.dataSource.create(newItems).then(function (resp) {
                        savedItems = savedItems.concat(self._refreshItems(resp.data, newItemsWithIds));
                    }));
                }
                // Update operation.
                if (changedItems.length) {
                    promises.push(this.dataSource.update(changedItems).then(function (resp) {
                        savedItems = savedItems.concat(self._refreshItems(resp.data, changedItems));
                    }));
                }
                // Delete operation.
                if (deletedItems.length) {
                    promises.push(this.dataSource["delete"](deletedItems));
                }
                // Perform operations
                $q.all(promises).then(function () {
                    $q.all(self.itemStore.array.map(function (item) {
                        return item.saveChildren(saveOriginal);
                    })).then(function (resp) {
                        deferred.resolve(savedItems, deletedItems);
                        self.emit("didSaveChanges", savedItems, deletedItems);
                    }, function (err) {
                        deferred.reject(err);
                    });
                }, function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            },

            /**
             * Query unfetched fields of an item from the data source.
             * @param  {Item} item
             * @param  {Object} params
             * @return {Promise}
             */
            queryItem: function (item, params) {
                var idProperty = this.idProperty;
                var deferred = $q.defer();
                var self = this;

                if (item.isIn) {
                    this._verifyItem(item);
                }

                this.emit("willQueryItem", item, params);
                params = angular.extend({}, params);
                params[idProperty] = item[idProperty];
                this.dataSource.get(params).then(function (resp) {
                    if (item.isIn) {
                        item.setData(resp.data);
                    } else {
                        item = self.addItem(resp.data);
                    }
                    deferred.resolve(item);
                    self.emit("didQueryItem", item, params);
                }, function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            },

            /**
             * Save an item in the collection.
             * @param  {Item} item
             * @return {Promise}
             */
            saveItem: function (item, persist) {
                var dataSource = this.getDataSource(persist);
                var self = this;
                var promises = [];

                this._verifyItem(item);

                this.emit("willSaveItem", item);
                if (item.hasChanges()) {
                    promises.push(dataSource.save(item.getData()).then(function (resp) {
                        self._refreshItems([resp.data], [item]);
                    }, function (err) {
                        throw err;
                    }));
                }

                return $q.all(promises).then(function () {
                    return $q.all(persist ? [item.saveChildren()] : []).then(function (resp) {
                        self.emit("didSaveItem", item);
                        return item;
                    });
                }, function (err) {
                    throw err;
                });
            },

            /**
             * Delete an item in the collection.
             * @param  {Item} item
             * @return {Promise}
             */
            deleteItem: function (item, persist) {
                var idProperty = this.idProperty;
                var deferred = $q.defer();
                var self = this;

                this._verifyItem(item);

                this.emit("willDeleteItem", item);
                this.getDataSource(persist)["delete"](item.getData(false, true)).then(function (resp) {
                    self.itemStore["delete"]('', item);
                    // cache deleted items to properly delete later.
                    if (item.exists() && (persist === false || !self._canSave())) {
                        self.deletedItems.push(item);
                    }
                    if (self.selectedItem === item) {
                        self.selectItem(null);
                    }
                    deferred.resolve(item);
                    self.emit("didDeleteItem", item);
                }, function (err) {
                    deferred.reject(err);
                });

                return deferred.promise;
            },

            /**
             * Create a new item.  This item is not yet added to
             * the collection.  To automatically add a new item,
             * you can use addItem, which also takes arbritary data.
             * @param  {Object} data
             * @param  {Boolean} select Select the item after it has been created.
             * @return {Item}
             */
            createItem: function (data, select) {
                var item = new Item(data, this);
                if (select) {
                    item.select(true);
                }
                return item;
            },

            selectItem: function (item) {
                if (!item || item.isIn(this)) {
                    var e = this.emit("willSelectItem", item);
                    if (!e.defaultPrevented) {
                        this.selectedItem = item;
                    }
                    this.emit("didSelectItem", item);
                }
            },

            get: function (index) {
                return isNaN(index) ? this.getAll() : this.itemStore.array[index];
            },

            getAll: function () {
                return this.itemStore.array;
            },

            count: function () {
                return this.itemStore.array.length;
            },

            valueOf: function () {
                return this.itemStore.array.valueOf();
            },

            toString: function () {
                return this.itemStore.array.toString();
            }

        });

        return function (config) {
            return new ItemCollection(config);
        };
    }];

}]);

module.exports = "atsid.data.itemCollection";

},{"./data":3,"./eventable":5}]},{},[1,2,3,4,5,6,7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXJyYXlTdG9yZS5qcyIsInNyYy9iYXNlU3RvcmUuanMiLCJzcmMvZGF0YS5qcyIsInNyYy9lcnJvcnMuanMiLCJzcmMvZXZlbnRhYmxlLmpzIiwic3JjL2h0dHBTdG9yZS5qcyIsInNyYy9pdGVtQ29sbGVjdGlvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuMkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN01BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgZXJyb3JzID0gcmVxdWlyZShcIi4vZXJyb3JzXCIpO1xuXG5hbmd1bGFyLm1vZHVsZShcImF0c2lkLmRhdGEuYXJyYXlTdG9yZVwiLCBbXG4gICAgcmVxdWlyZShcIi4vYmFzZVN0b3JlXCIpXG5dKS5wcm92aWRlcihcImFycmF5U3RvcmVcIiwgW2Z1bmN0aW9uICgpIHtcblxuICAgIHRoaXMuJGdldCA9IFtcImJhc2VTdG9yZVwiLCBmdW5jdGlvbiAoYmFzZVN0b3JlKSB7XG4gICAgICAgIC8qKlxuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICogVGhlIGNvbnN0cnVjdG9yIGZvciBhIG5ldyBBcnJheSBzdG9yZS5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBkZWZhdWx0IGNvbmZpZ3VyYXRpb25zLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gQXJyYXlTdG9yZSAoY29uZmlnKSB7XG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XG4gICAgICAgICAgICB0aGlzLmFycmF5ID0gW107XG4gICAgICAgICAgICB0aGlzLmlkUHJvcGVydHkgPSBjb25maWcuaWRQcm9wZXJ0eSB8fCBcImlkXCI7XG4gICAgICAgICAgICB0aGlzLmlkVG9JdGVtcyA9IHt9O1xuICAgICAgICAgICAgdGhpcy5zYW5pdGl6ZSA9IGNvbmZpZy5oYXNPd25Qcm9wZXJ0eShcInNhbml0aXplXCIpID8gY29uZmlnLnNhbml0aXplIDogdHJ1ZTtcbiAgICAgICAgICAgIGlmIChjb25maWcuZ2V0SWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdldElkID0gY29uZmlnLmdldElkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy51aWQgPSAwO1xuICAgICAgICAgICAgdGhpcy5zZXRJdGVtcyhhbmd1bGFyLmlzQXJyYXkoY29uZmlnKSA/IGNvbmZpZyA6IGNvbmZpZy5hcnJheSB8fCBbXSk7XG4gICAgICAgIH1cblxuICAgICAgICBBcnJheVN0b3JlLnByb3RvdHlwZSA9IGJhc2VTdG9yZSh7XG5cbiAgICAgICAgICAgIF9hZGRJdGVtOiBmdW5jdGlvbiAoaXRlbSwgcmVwbGFjZSkge1xuICAgICAgICAgICAgICAgIHZhciBpZFByb3BlcnR5ID0gdGhpcy5pZFByb3BlcnR5O1xuICAgICAgICAgICAgICAgIGlmIChpdGVtW2lkUHJvcGVydHldID09PSBudWxsIHx8IGl0ZW1baWRQcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtW2lkUHJvcGVydHldID0gdGhpcy5nZXRJZCgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnNhbml0aXplKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLnNhbml0aXplRGF0YShpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pZFRvSXRlbXNbaXRlbVtpZFByb3BlcnR5XV0pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcGxhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IHRoaXMuYXJyYXkuaW5kZXhPZihpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXJyYXkuc3BsaWNlKGluZGV4LCAxLCBpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXJyYXkucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5pZFRvSXRlbXNbaXRlbVtpZFByb3BlcnR5XV0gPSBpdGVtO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2FuaXRpemUgPyBhbmd1bGFyLmNvcHkoaXRlbSkgOiBpdGVtO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZ2V0SWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkbyB7IHRoaXMudWlkICs9IDE7IH0gd2hpbGUgKHRoaXMuaWRUb0l0ZW1zW3RoaXMudWlkXSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudWlkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgc2V0SXRlbXM6IGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICAgICAgICAgIHRoaXMuYXJyYXkuc3BsaWNlKDAsIHRoaXMuYXJyYXkubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICB0aGlzLmlkVG9JdGVtcyA9IHt9O1xuICAgICAgICAgICAgICAgIHRoaXMudWlkID0gMDtcbiAgICAgICAgICAgICAgICBpdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2FkZEl0ZW0oaXRlbSk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBmaW5kSXRlbTogZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHRoaXMuaWRUb0l0ZW1zW3BhdGhdO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtICYmIHRoaXMuc2FuaXRpemUpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGFuZ3VsYXIuY29weShpdGVtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBoYXNJdGVtOiBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0uZXZlcnkoZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmhhc0l0ZW0oaSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbVt0aGlzLmlkUHJvcGVydHldICE9PSB1bmRlZmluZWQgJiYgaXRlbVt0aGlzLmlkUHJvcGVydHldICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhIXRoaXMuaWRUb0l0ZW1zW2l0ZW1bdGhpcy5pZFByb3BlcnR5XV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAhIXRoaXMuaWRUb0l0ZW1zW2l0ZW1dO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmVmcmVzaEl0ZW1JZDogZnVuY3Rpb24gKGlkLCBpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaWRUb0l0ZW1zW2lkXSkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5pZFRvSXRlbXNbaWRdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlkVG9JdGVtc1tpdGVtW3RoaXMuaWRQcm9wZXJ0eV1dID0gaXRlbTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWRkSXRlbShpdGVtLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICByZWFkOiBmdW5jdGlvbiAocGF0aCwgcGFyYW1zLCBkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgICAgICAgICAgaWYgKHBhdGggIT09IHVuZGVmaW5lZCAmJiBwYXRoICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmZpbmRJdGVtKHBhdGgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLnNhbml0aXplID8gYW5ndWxhci5jb3B5KHRoaXMuYXJyYXkpIDogdGhpcy5hcnJheS5zbGljZSgwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlUmVzcG9uc2UoaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgZXJyb3JzLk5vdEZvdW5kRXJyb3IoXCJObyBpdGVtIGF0IHBhdGggXCIgKyBwYXRoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKHBhdGgsIHBhcmFtcywgZGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBpZFByb3BlcnR5ID0gdGhpcy5pZFByb3BlcnR5O1xuXG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVSZXNwb25zZShkYXRhLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZEl0ZW0oaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlUmVzcG9uc2UodGhpcy5fYWRkSXRlbShkYXRhKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChwYXRoLCBwYXJhbXMsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc0l0ZW0oZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVJlc3BvbnNlKGRhdGEubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZEl0ZW0oaXRlbSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaGFzSXRlbShwYXRoIHx8IHBhcmFtc1t0aGlzLmlkUHJvcGVydHldKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVSZXNwb25zZSh0aGlzLl9hZGRJdGVtKGRhdGEsIHRydWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBlcnJvcnMuTm90Rm91bmRFcnJvcihcIk5vIGl0ZW0gYXQgcGF0aCBcIiArIHBhdGgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcGF0Y2g6IGZ1bmN0aW9uIChwYXRoLCBwYXJhbXMsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoYW5ndWxhci5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc0l0ZW0oZGF0YSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVJlc3BvbnNlKGRhdGEubWFwKGZ1bmN0aW9uIChjaGFuZ2VkSXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpdGVtID0gdGhpcy5maW5kSXRlbShjaGFuZ2VkSXRlbVt0aGlzLmlkUHJvcGVydHldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChpdGVtLCBjaGFuZ2VkSXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZEl0ZW0oaXRlbSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHRoaXMuZmluZEl0ZW0ocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChpdGVtLCBkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZVJlc3BvbnNlKHRoaXMuX2FkZEl0ZW0oaXRlbSwgdHJ1ZSkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgZXJyb3JzLk5vdEZvdW5kRXJyb3IoXCJObyBpdGVtIGF0IHBhdGggXCIgKyBwYXRoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIFwiZGVsZXRlXCI6IGZ1bmN0aW9uIChwYXRoLCBwYXJhbXMsIGRhdGEpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5oYXNJdGVtKGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5pZFRvSXRlbXNbaXRlbVt0aGlzLmlkUHJvcGVydHldXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLmFycmF5LmluZGV4T2YoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hcnJheS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmlkVG9JdGVtc1tpdGVtW3RoaXMuaWRQcm9wZXJ0eV1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGVSZXNwb25zZShudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IGVycm9ycy5Ob3RGb3VuZEVycm9yKFwiTm8gaXRlbSBhdCBwYXRoIFwiICsgcGF0aCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgaXRlbVt0aGlzLmlkUHJvcGVydHldID0gcGFyYW1zW3RoaXMuaWRQcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW1wiZGVsZXRlXCJdKG51bGwsIHBhcmFtcywgW2l0ZW1dKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXJyYXlTdG9yZShjb25maWcpO1xuICAgICAgICB9O1xuXG4gICAgfV07XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCJhdHNpZC5kYXRhLmFycmF5U3RvcmVcIjtcbiIsInZhciBlcnJvcnMgPSByZXF1aXJlKFwiLi9lcnJvcnNcIik7XG5cbmFuZ3VsYXIubW9kdWxlKFwiYXRzaWQuZGF0YS5iYXNlU3RvcmVcIiwgW1xuICAgIHJlcXVpcmUoXCIuL2V2ZW50YWJsZVwiKVxuXSkucHJvdmlkZXIoXCJiYXNlU3RvcmVcIiwgZnVuY3Rpb24gKCkge1xuXG4gICAgdGhpcy4kZ2V0ID0gW1wiZXZlbnRhYmxlXCIsIGZ1bmN0aW9uIChldmVudGFibGUpIHtcblxuICAgICAgICBmdW5jdGlvbiBCYXNlU3RvcmUgKCkge31cbiAgICAgICAgQmFzZVN0b3JlLnByb3RvdHlwZSA9IGV2ZW50YWJsZSh7XG4gICAgICAgICAgICBjb25maWc6IHt9LFxuXG4gICAgICAgICAgICByZWFkOiBmdW5jdGlvbiAodXJsLCBxdWVyeSwgZGF0YSwgc3RvcmVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLk5vdEltbGVtZW50ZWRFcnJvcigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAodXJsLCBxdWVyeSwgZGF0YSwgc3RvcmVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLk5vdEltbGVtZW50ZWRFcnJvcigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAodXJsLCBxdWVyeSwgZGF0YSwgc3RvcmVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLk5vdEltbGVtZW50ZWRFcnJvcigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcGF0Y2g6IGZ1bmN0aW9uICh1cmwsIHF1ZXJ5LCBkYXRhLCBzdG9yZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBlcnJvcnMuTm90SW1sZW1lbnRlZEVycm9yKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAodXJsLCBxdWVyeSwgZGF0YSwgc3RvcmVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLk5vdEltbGVtZW50ZWRFcnJvcigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY3JlYXRlUmVzcG9uc2U6IGZ1bmN0aW9uIChkYXRhLCBvZmZzZXQsIHRvdGFsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlzQXJyYXkgPSBkYXRhIGluc3RhbmNlb2YgQXJyYXk7XG4gICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gaXNBcnJheSA/IGRhdGEubGVuZ3RoIDogMTtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgICAgICAgICBjb3VudDogY291bnQsXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogb2Zmc2V0IHx8IDAsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsOiB0b3RhbCB8fCBjb3VudFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzYW5pdGl6ZURhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNhZmVEYXRhID0ge307XG4gICAgICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhkYXRhKTtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHZhciBrZXk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGkgLS0+IDApIHtcbiAgICAgICAgICAgICAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEvXlskXS8udGVzdChrZXlzW2ldKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2FmZURhdGFba2V5XSA9IGFuZ3VsYXIuY29weShkYXRhW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNhZmVEYXRhO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIHByb3BlcnR5IGZyb20gdGhlIGdpdmVuIHBhdGguXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGggICBUaGUgcGF0aCB0byB0aGUgcHJvcGVydHkuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRoZXkgcGF0aCBzZWFyY2hlcy5cbiAgICAgICAgICAgICAqIEByZXR1cm4geyp9ICAgICAgICBUaGUgdmFsdWUgb2YgdGhlIHBhdGguXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldFZhbHVlQXRQYXRoOiBmdW5jdGlvbiAocGF0aCwgb2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGhDb21wb25lbnRzID0gKHBhdGggfHwgXCJcIikuc3BsaXQoXCIvXCIpLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTtcblxuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50T2JqZWN0O1xuICAgICAgICAgICAgICAgIGlmIChwYXRoQ29tcG9uZW50cy5sZW5ndGggPiAxIHx8IHBhdGhDb21wb25lbnRzWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRPYmplY3QgPSBvYmplY3Q7XG4gICAgICAgICAgICAgICAgICAgIHBhdGhDb21wb25lbnRzLmV2ZXJ5KGZ1bmN0aW9uIChwYXRoQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50T2JqZWN0ID0gY3VycmVudE9iamVjdFtwYXRoQ29tcG9uZW50XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50T2JqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBjdXJyZW50T2JqZWN0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gY3VycmVudE9iamVjdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmFyIHN0b3JlRmFjdG9yeSA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIFN0b3JlICgpIHt9XG4gICAgICAgICAgICBTdG9yZS5wcm90b3R5cGUgPSBuZXcgQmFzZVN0b3JlKCk7XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChTdG9yZS5wcm90b3R5cGUsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFN0b3JlKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgc3RvcmVGYWN0b3J5LmVycm9ycyA9IGVycm9ycztcblxuICAgICAgICByZXR1cm4gc3RvcmVGYWN0b3J5O1xuICAgIH1dO1xuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBcImF0c2lkLmRhdGEuYmFzZVN0b3JlXCI7XG4iLCJ2YXIgZXJyb3JzID0gcmVxdWlyZShcIi4vZXJyb3JzXCIpO1xuXG4vKipcbiAqIEBuZ2RvYyBwcm92aWRlclxuICogQG5hbWUgYXRzaWQuZGF0YTpkYXRhU291cmNlXG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBSZXByZXNlbnRzIGEgZGF0YSBzb3VyY2UuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKFwiYXRzaWQuZGF0YVwiLFtcbiAgICByZXF1aXJlKFwiLi9ldmVudGFibGVcIiksXG4gICAgcmVxdWlyZShcIi4vaHR0cFN0b3JlXCIpLFxuICAgIHJlcXVpcmUoXCIuL2FycmF5U3RvcmVcIilcbl0pLnByb3ZpZGVyKFwiZGF0YVNvdXJjZVwiLCBbZnVuY3Rpb24gKCkge1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBhIGNvbmZpZ3VyYXRvciBmb3IgYSBjb25maWcgb2JqZWN0LiAgVGhlIGNvbmZpZyBjYW4gdGhlbiBiZSBwYXNzZWQgaW50b1xuICAgICAqIGEgbmV3IERhdGFTb3VyY2UgY29uc3RydWN0b3IuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZ09iamVjdCBUaGUgb3V0cHV0IG9iamVjdCB3aGVyZSB0aGUgY29uZmlndXJhdGlvbnMgd2lsbCBiZSBzZXQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGF0YVNvdXJjZUNvbmZpZ3VyYXRpb25GYWN0b3J5IChjb25maWdPYmplY3QpIHtcbiAgICAgICAgYW5ndWxhci5leHRlbmQoY29uZmlnT2JqZWN0LCB7XG4gICAgICAgICAgICBkZWZhdWx0czoge1xuICAgICAgICAgICAgICAgIGlkUHJvcGVydHk6IFwiaWRcIixcbiAgICAgICAgICAgICAgICBmaWVsZHM6IG51bGwsXG4gICAgICAgICAgICAgICAgZmV0Y2hlczogbnVsbCxcbiAgICAgICAgICAgICAgICBxOiBudWxsLFxuICAgICAgICAgICAgICAgIG9yZGVyQnk6IG51bGwsXG4gICAgICAgICAgICAgICAgY291bnQ6IDEwMCxcbiAgICAgICAgICAgICAgICBvZmZzZXQ6IDAsXG5cbiAgICAgICAgICAgICAgICAvLyBJZiBhIHJvdXRlIGRvZXNuJ3QgZXhpc3Qgd2hlbiB0aGUgY2hpbGQoKSBtZXRob2QgaXMgdXNlZCwgaXQgaXMgYXV0byBjcmVhdGVkIG9uIHRoZSBmbHkuXG4gICAgICAgICAgICAgICAgYWxsb3dBdXRvbWF0aWNSb3V0ZXM6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdG9yZUNvbmZpZzogXCJodHRwXCIsXG4gICAgICAgICAgICByb3V0ZXM6IHt9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiB7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRoZSBkZWZhdWx0cyBmb3IgdGhlIGRhdGEgc291cmNlLCBzdWNoIGFzIHRoZVxuICAgICAgICAgICAgICogZmllbGRzLCBjb3VudCwgb3IgdGhlIGlkZW50aWZpZXIgcHJvcGVydHkgZm9yIGl0ZW1zLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRzXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNldERlZmF1bHRzOiBmdW5jdGlvbiAoZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChjb25maWdPYmplY3QuZGVmYXVsdHMsIGRlZmF1bHRzKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IGEgc3RvcmUgZm9yIHRoZSBkYXRhIHNvdXJjZS4gIHRoaXMgbXVzdCBiZSBhblxuICAgICAgICAgICAgICogaW5zdGFuZSBvZiBhIHN0b3JlIHRoYXQgY29tcGxpZXMgd2l0aCB0aGUgZGF0YSBzb3VyY2VcInNcbiAgICAgICAgICAgICAqIHN0b3JlIGludGVyZmFjZXMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNldFN0b3JlOiBmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICAgICAgICAgICAgICBjb25maWdPYmplY3Quc3RvcmUgPSBzdG9yZTtcbiAgICAgICAgICAgICAgICBjb25maWdPYmplY3Quc3RvcmVDb25maWcgPSBudWxsO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXQgYSBzdG9yZSBjb25maWd1cmF0aW9uLiAgUmF0aGVyIHRoYW4gc2V0dGluZ1xuICAgICAgICAgICAgICogYSBzdG9yZSBpbnN0YW5jZSwgdGhpcyB3aWxsIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZVxuICAgICAgICAgICAgICogYmFzZWQgb24gdGhlIHR5cGUgcHJvcGVydHkuICBUaGUgc3VwcG9ydGVkIHN0b3Jlc1xuICAgICAgICAgICAgICogYXJlIFwiaHR0cFwiIGFuZCBcImFycmF5XCIuICBCeSBkZWZhdWx0LCB0aGUgZGF0YSBzb3VyY2VcbiAgICAgICAgICAgICAqIHVzZXMgYW4gSFRUUCBzdG9yZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzdG9yZUNvbmZpZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZXRTdG9yZUNvbmZpZzogZnVuY3Rpb24gKHN0b3JlQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnT2JqZWN0LnN0b3JlQ29uZmlnID0gc3RvcmVDb25maWc7XG4gICAgICAgICAgICAgICAgY29uZmlnT2JqZWN0LnN0b3JlID0gbnVsbDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0IHRoZSBiYXNlIHVybCBmb3IgdGhlIGRlZmF1bHQgSFRUUCBzdG9yZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSB1cmxcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2V0U3RvcmVVcmw6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgICAgICAgICBjb25maWdPYmplY3Quc3RvcmVDb25maWcgPSB7IHR5cGU6IFwiaHR0cFwiLCBiYXNlVXJsOiB1cmx9O1xuICAgICAgICAgICAgICAgIGNvbmZpZ09iamVjdC5zdG9yZSA9IG51bGw7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzZXRTdG9yZVRyYW5zZm9ybWVyczogZnVuY3Rpb24gKHRyYW5zZm9ybWVycykge1xuICAgICAgICAgICAgICAgIGNvbmZpZ09iamVjdC5zdG9yZUNvbmZpZy50cmFuc2Zvcm1lcnMgPSB0cmFuc2Zvcm1lcnM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEFkZHMgcmVzb3VyY2Ugcm91dGVzIHRvIHRoZSBkYXRhIHNvdXJjZS4gIEEgcm91dGUgaXMgYSBwYXRoIHRvIGFcbiAgICAgICAgICAgICAqIHBhcnRpY3VsYXIgY2hpbGQgZGF0YSBzb3VyY2Ugd2l0aGluIHRoZSByb290IHNvdXJjZS5cbiAgICAgICAgICAgICAqIERlcGVuZGluZyBvbiB0aGUgc3RvcmUsIHRoaXMgY291bGQgYmUgaGFuZGxlZCBkaWZmZXJlbnRseS4gIEFuIEhUVFAgc3RvcmVcbiAgICAgICAgICAgICAqIHdpbGwgdHJhbnNsYXRlIGEgcm91dGUncyBwYXRoIHRvIHRoZSBVUkwgb2YgdGhlIEhUVFAgc2VydmVyLCB3aGlsZSBhbiBhcnJheVxuICAgICAgICAgICAgICogc3RvcmUgd2lsbCB1c2UgaXQgYXMgYSBwYXRoIHdpdGhpbiBhbiBvYmplY3QgZ3JhcGguXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdFtdfSByb3V0ZUNvbmZpZ3NcbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBAZXhhbXBsZVxuICAgICAgICAgICAgICogbmFtZToge1xuICAgICAgICAgICAgICogICAgIHBhdGg6IFwiY29udGFjdHMvOmNvbnRhY3RJZC9hZGRyZXNzZXMvOmFkZHJlc3NJZFwiLFxuICAgICAgICAgICAgICogICAgIGZpZWxkczogXCJuYW1lLHBob25lTnVtYmVyXCJcbiAgICAgICAgICAgICAqIH1cbiAgICAgICAgICAgICAqXG4gICAgICAgICAgICAgKiBSb3V0ZSBFeGFtcGxlczpcbiAgICAgICAgICAgICAqIHJvdXRlTmFtZS86cm91dGVQYXJhbVxuICAgICAgICAgICAgICogcm91dGVOYW1lMS9yb3V0ZU5hbWUyLzpyb3V0ZTJQYXJhbVxuICAgICAgICAgICAgICogY29udGFjdHMvOmNvbnRhY3RJZC9hZGRyZXNzZXMvOmFkZHJlc3NJZFxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhZGRSb3V0ZXM6IGZ1bmN0aW9uIChyb3V0ZUNvbmZpZ3MpIHtcbiAgICAgICAgICAgICAgICBhbmd1bGFyLmV4dGVuZChjb25maWdPYmplY3Qucm91dGVzLCByb3V0ZUNvbmZpZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHZhciBnbG9iYWxDb25maWcgPSB7fTtcbiAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBkYXRhU291cmNlQ29uZmlndXJhdGlvbkZhY3RvcnkoZ2xvYmFsQ29uZmlnKSk7XG5cbiAgICB0aGlzLiRnZXQgPSBbXCIkcVwiLCBcImh0dHBTdG9yZVwiLCBcImFycmF5U3RvcmVcIiwgXCJldmVudGFibGVcIiwgZnVuY3Rpb24gKCRxLCBodHRwU3RvcmUsIGFycmF5U3RvcmUsIGV2ZW50YWJsZSkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIGEgZGF0YSBzdG9yZSBiYXNlZCBvbiBhIGNvbmZpZ3VyYXRpb24uXG4gICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gc3RvcmVDb25maWcgQSBjb25maWd1cmF0aW9uIHdpdGggYSB0eXBlIHByb3BlcnR5IGluZGljYXRpbmcgdGhlIHR5cGUgb2Ygc3RvcmUuXG4gICAgICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGdldFN0b3JlIChzdG9yZUNvbmZpZykge1xuICAgICAgICAgICAgc3RvcmVDb25maWcgPSBhbmd1bGFyLmlzU3RyaW5nKHN0b3JlQ29uZmlnKSA/IHsgdHlwZTogXCJodHRwXCIsIG5hbWU6IHN0b3JlQ29uZmlnIH0gOiBzdG9yZUNvbmZpZztcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgaHR0cDogaHR0cFN0b3JlLFxuICAgICAgICAgICAgICAgIGFycmF5OiBhcnJheVN0b3JlXG4gICAgICAgICAgICB9W3N0b3JlQ29uZmlnLnR5cGUgfHwgXCJodHRwXCJdKHN0b3JlQ29uZmlnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIHRoZSBwYXRoIGZvciBhIHNlcnZpY2UgY29uZmlnLiAgSWYgcGF0aFBhcmFtcyBpcyBub3RcbiAgICAgICAgICogcGFzc2VkIGluLCB0aGUgcGF0aCB3aWxsIHVzZSB0aGUgcGFyYW1ldGVycycgcGxhY2Vob2xkZXIgdmFsdWVzLlxuICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhdGhDb21wb25lbnRzIENvbXBvbmVudHMgZm9yIHRoZSBwYXRoLlxuICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IFtwYXRoUGFyYW1zXSBwYXJhbWV0ZXJzIHRvIGJlIGluc2VydGVkIGludG8gdGhlIHBhdGguXG4gICAgICAgICAqIEByZXR1cm4ge1N0cmluZ30gVGhlIHBhdGhcbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIGJ1aWxkUGF0aCAocGF0aENvbXBvbmVudHMsIHBhdGhQYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciBwYXRoID0gW107XG4gICAgICAgICAgICB2YXIgbGFzdEluZGV4ID0gcGF0aENvbXBvbmVudHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICAgIHBhdGhDb21wb25lbnRzLmZvckVhY2goZnVuY3Rpb24gKHBhdGhDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAocGF0aENvbXBvbmVudC5uYW1lICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGgucHVzaChwYXRoQ29tcG9uZW50Lm5hbWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAocGF0aENvbXBvbmVudC5wYXJhbSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1WYWx1ZSA9IHBhdGhQYXJhbXMgPyBwYXRoUGFyYW1zW3BhdGhDb21wb25lbnQucGFyYW1dIHx8IG51bGwgOiBcIjpcIiArIHBhdGhDb21wb25lbnQucGFyYW07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbVZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoLnB1c2gocGFyYW1WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBwYXRoLmpvaW4oXCIvXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFRPRE86IFBvc3NpYmx5IGFkZCBzdXBwb3J0IGZvciBtdWx0aXBsZSBwYXJhbXMgYXQgYSBzaW5nbGUgcm91dGUuXG4gICAgICAgICAqIEJ1aWxkcyB0aGUgcGF0aCBjb21wb25lbnRzIGZvciBhIHJvdXRlIGNvbmZpZ3VyYXRpb24uICBJZiBhIHBhdGggcHJvcGVydHkgaXMgcHJlc2VudCxcbiAgICAgICAgICogaXQgaXMgdXNlZCwgb3RoZXJ3aXNlIHRoZSBwYXJlbnRSb3V0ZSdzIHBhdGggY29tcG9uZW50cyBhcmUgYXBwZW5kZWQgd2l0aCB0aGUgcm91dGVcbiAgICAgICAgICogY29uZmlnJ3MgbmFtZSBwcm9wZXJ0eS5cbiAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSByb3V0ZUNvbmZpZ1xuICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmVudFJvdXRlXG4gICAgICAgICAqIEByZXR1cm4ge09iamVjdFtdfSBBbiBhcnJheSBvZiBwYXRoIGNvbXBvbmVudHMuXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBidWlsZFBhdGhDb21wb25lbnRzIChyb3V0ZUNvbmZpZywgcGFyZW50Um91dGUpIHtcbiAgICAgICAgICAgIHZhciBwYXRoID0gcm91dGVDb25maWcucGF0aDtcbiAgICAgICAgICAgIHZhciBwYXRoQ29tcG9uZW50cyA9ICFwYXRoICYmIHBhcmVudFJvdXRlID8gcGFyZW50Um91dGUucGF0aENvbXBvbmVudHMuc2xpY2UoMCkgOiBbXTtcblxuICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9eXFwvfFxcLyQvLCBcIlwiKTsgLy8gcmVtb3ZlIHNsYXNoZXMgYXQgdGhlIGJlZ2lubmluZyBhbmQgZW5kLlxuICAgICAgICAgICAgICAgIHBhdGggPSBwYXRoLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICAgICAgd2hpbGUoaSA8IHBhdGgubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gcGF0aFtpXTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBhcmFtID0gcGF0aFtpICsgMV07XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUuY2hhckF0KDApID09PSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW0gPSBuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBpIC09IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW0gJiYgcGFyYW0uY2hhckF0KDApID09PSBcIjpcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW0gPSBwYXJhbS5zdWJzdHIoMSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGF0aENvbXBvbmVudHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW06IHBhcmFtXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpICs9IHBhcmFtID8gMiA6IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyb3V0ZUNvbmZpZy5uYW1lKSB7XG4gICAgICAgICAgICAgICAgcGF0aENvbXBvbmVudHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHJvdXRlQ29uZmlnLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtOiBcImlkXCIgKyAocGFyZW50Um91dGUubGV2ZWwgKyAxKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcGF0aENvbXBvbmVudHM7XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBkZXNjcmlwdGlvblxuICAgICAgICAgKiBBIHJvdXRlIHdpdGhpbiBhIGRhdGEgc291cmNlLiAgRXh0ZXJuYWxseSwgYSByb3V0ZVxuICAgICAgICAgKiBpcyByZXByZXNlbnRlZCBhcyBpdHMgb3duIGluZGVwZW5kZW50IGRhdGEgc291cmNlLlxuICAgICAgICAgKiBFeGNlcHQgZm9yIHRoZSByb290IHJvdXRlLCB3aGljaCBpbmhlcml0cyBmcm9tIHRoZSBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBpdHNlbGYsIGFsbCBvdGhlciByb3V0ZXMgYXJlIHZpZXdlZCBhcyBicmFuY2hlcyBvZiB0aGUgcm9vdC5cbiAgICAgICAgICogVGhleSBhcmUgaW5zdGVhZCBpbmhlcml0ZWQgZnJvbSB0aGVpciBwYXJlbnQgcm91dGVzLlxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJlbnRSb3V0ZVxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gUm91dGUgKGNvbmZpZywgcGFyZW50Um91dGUpIHtcbiAgICAgICAgICAgIHZhciByb3V0ZSA9IHRoaXM7XG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XG5cbiAgICAgICAgICAgIGlmIChwYXJlbnRSb3V0ZSkge1xuICAgICAgICAgICAgICAgIHZhciBTdWJSb3V0ZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgICAgIFN1YlJvdXRlLnByb3RvdHlwZSA9IHBhcmVudFJvdXRlO1xuICAgICAgICAgICAgICAgIHJvdXRlID0gbmV3IFN1YlJvdXRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBwYXRoQ29tcG9uZW50cyA9IHJvdXRlLnBhdGhDb21wb25lbnRzID0gYnVpbGRQYXRoQ29tcG9uZW50cyhjb25maWcsIHBhcmVudFJvdXRlKTtcbiAgICAgICAgICAgIHZhciBsYXN0UGF0aENvbXBvbmVudCA9IHBhdGhDb21wb25lbnRzW3BhdGhDb21wb25lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgcm91dGUuY29uZmlnID0gY29uZmlnO1xuXG4gICAgICAgICAgICAvLyBUaGluZ3Mgd2UgZG9uJ3Qgd2FudCB0byBpbmhlcml0IGZyb20gcGFyZW50IHJvdXRlcy5cbiAgICAgICAgICAgIHJvdXRlLnBhdGggPSBidWlsZFBhdGgocGF0aENvbXBvbmVudHMpO1xuICAgICAgICAgICAgcm91dGUubGV2ZWwgPSBwYXJlbnRSb3V0ZSA/IHBhcmVudFJvdXRlLmxldmVsICsgMSA6IDE7XG4gICAgICAgICAgICByb3V0ZS5pZFByb3BlcnR5ID0gY29uZmlnLmlkUHJvcGVydHkgfHwgXCJpZFwiO1xuICAgICAgICAgICAgcm91dGUucGFyZW50ID0gcGFyZW50Um91dGU7XG4gICAgICAgICAgICByb3V0ZS5wYXRoTmFtZSA9IChsYXN0UGF0aENvbXBvbmVudCAmJiBsYXN0UGF0aENvbXBvbmVudC5uYW1lKSB8fCBcIlwiO1xuICAgICAgICAgICAgcm91dGUubmFtZSA9IGNvbmZpZy5uYW1lIHx8IHJvdXRlLnBhdGhOYW1lO1xuICAgICAgICAgICAgcm91dGUucGF0aFBhcmFtID0gKGxhc3RQYXRoQ29tcG9uZW50ICYmIGxhc3RQYXRoQ29tcG9uZW50LnBhcmFtKSB8fCBcIlwiO1xuICAgICAgICAgICAgcm91dGUucGFyYW1zID0gY29uZmlnLnBhcmFtcyB8fCB7fTtcbiAgICAgICAgICAgIHJvdXRlLnJvdXRlcyA9IHt9O1xuICAgICAgICAgICAgcm91dGUuZmllbGRzID0gY29uZmlnLmZpZWxkcztcbiAgICAgICAgICAgIHJvdXRlLmZldGNoZXMgPSBjb25maWcuZmV0Y2hlcztcbiAgICAgICAgICAgIHJvdXRlLnEgPSBjb25maWcucTtcbiAgICAgICAgICAgIHJvdXRlLm9yZGVyQnkgPSBjb25maWcub3JkZXJCeTtcbiAgICAgICAgICAgIHJvdXRlLnRyYW5zZm9ybWVycyA9IGNvbmZpZy50cmFuc2Zvcm1lcnMgfHwgW107XG4gICAgICAgICAgICByb3V0ZS5idWlsZFRyYW5zZm9ybWVycyhyb3V0ZS50cmFuc2Zvcm1lcnMpO1xuICAgICAgICAgICAgcm91dGUuY2FjaGUgPSBjb25maWcuY2FjaGUgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFRoaW5ncyB0aGF0IGNhbiBiZSBpbmhlcml0ZWRcbiAgICAgICAgICAgIGlmIChjb25maWcuY291bnQpIHtcbiAgICAgICAgICAgICAgICByb3V0ZS5jb3VudCA9IGNvbmZpZy5jb3VudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcub2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgcm91dGUub2Zmc2V0ID0gY29uZmlnLm9mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVGhpbmdzIHRoYXQgbXVzdCBiZSBpbmhlcml0ZWRcbiAgICAgICAgICAgIGlmICghcGFyZW50Um91dGUpIHtcbiAgICAgICAgICAgICAgICByb3V0ZS5uYW1lVG9Sb3V0ZSA9IHt9O1xuICAgICAgICAgICAgICAgIHJvdXRlLmFsbG93QXV0b21hdGljUm91dGVzID0gY29uZmlnLmFsbG93QXV0b21hdGljUm91dGVzO1xuICAgICAgICAgICAgICAgIHJvdXRlLnJvb3QgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcuc3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGUuc2V0U3RvcmUoY29uZmlnLnN0b3JlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJvdXRlLm5hbWVUb1JvdXRlID0gT2JqZWN0LmNyZWF0ZShyb3V0ZS5uYW1lVG9Sb3V0ZSk7XG4gICAgICAgICAgICAgICAgcGFyZW50Um91dGUucm91dGVzW3JvdXRlLnBhdGhOYW1lXSA9IHJvdXRlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoY29uZmlnLnJvdXRlcykge1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb25maWcucm91dGVzLCBmdW5jdGlvbiAocm91dGVDb25maWcsIHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyb3V0ZUNvbmZpZy5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByb3V0ZUNvbmZpZy5wYXRoID0gcGF0aDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlQ29uZmlnLm5hbWUgPSBwYXRoO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlLmFkZFJvdXRlKHJvdXRlQ29uZmlnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVzZWQgZm9yIHRlc3RpbmcgZXF1YWxpdHkgd2l0aCBpbnN0YW5jZXMgb2YgdGhlIHNhbWUgcm91dGUuXG4gICAgICAgICAgICByb3V0ZS5fc2VsZiA9IHJvdXRlO1xuICAgICAgICAgICAgcmV0dXJuIHJvdXRlO1xuICAgICAgICB9XG4gICAgICAgIFJvdXRlLnByb3RvdHlwZSA9IGV2ZW50YWJsZSh7XG5cbiAgICAgICAgICAgIHNldFN0b3JlOiBmdW5jdGlvbiAoc3RvcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yb290ICE9PSB0aGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBlcnJvcnMuTm90Um9vdFJvdXRlRXJyb3IoXCJNdXN0IGJlIHRoZSByb290IHJvdXRlIHRvIHNldCB0aGUgc3RvcmVcIik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRTdG9yZSA9IHRoaXMuc3RvcmU7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRTdG9yZSAmJiB0aGlzLnN0b3JlTGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RvcmVMaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAoc3RvcmVMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmVMaXN0ZW5lci5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5zdG9yZSA9IHN0b3JlO1xuICAgICAgICAgICAgICAgIGlmIChzdG9yZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0b3JlTGlzdGVuZXJzID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUub24oXCJtZXNzYWdlXCIsIGZ1bmN0aW9uIChlLCBtZXNzYWdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBBZGQgYSBuZXcgcm91dGUuICBUaGlzIHdpbGwgYWRkIGEgcGVybWFuZW50IGNoaWxkIHJvdXRlIHdpdGhcbiAgICAgICAgICAgICAqIHRoZSBjb25maWd1cmF0aW9uIHNldCBhcyB0aGUgZGVmYXVsdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3V0ZUNvbmZpZ1xuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBhZGRSb3V0ZTogZnVuY3Rpb24gKHJvdXRlQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fYWRkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBpZiAoIXJvdXRlQ29uZmlnIHx8ICghcm91dGVDb25maWcucGF0aCAmJiAhcm91dGVDb25maWcubmFtZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IGVycm9ycy5QYXJhbWV0ZXJFcnJvcihcIkNhbm5vdCBjcmVhdGUgcm91dGUgd2l0aG91dCBhIG5hbWUgb3IgcGF0aC5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChyb3V0ZUNvbmZpZy5wYXRoICYmIHJvdXRlQ29uZmlnLnBhdGguY2hhckF0KDApICE9PSBcIi9cIiAmJiB0aGlzLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcm91dGVDb25maWcucGF0aCA9IHRoaXMucGF0aCArIFwiL1wiICsgcm91dGVDb25maWcucGF0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudFJvdXRlID0gcm91dGVDb25maWcucGF0aCA/IHRoaXMucm9vdC5nZXRSb3V0ZUJ5UGF0aChyb3V0ZUNvbmZpZy5wYXRoLCB0cnVlKSA6IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIHJvdXRlID0gbmV3IFJvdXRlKHJvdXRlQ29uZmlnLCBwYXJlbnRSb3V0ZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJvdXRlQ29uZmlnLm5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETzogUmVtb3ZlIHRoZSByb290IG5hbWVUb1JvdXRlIG1hcHBpbmcgYXQgc29tZSBwb2ludC4gIFRoaXMgaXMgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5LlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb3QubmFtZVRvUm91dGVbcm91dGVDb25maWcubmFtZV0gPSB0aGlzLm5hbWVUb1JvdXRlW3JvdXRlQ29uZmlnLm5hbWVdID0gcm91dGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX2FkZGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHJldHVybiByb3V0ZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogR2V0IGEgY2hpbGQgcm91dGUuICBJZiB0aGUgcm91dGUgZG9lc24ndCBleGlzdCwgaXQgcmV0dXJucyBhIG5ldyB0ZW1wb3JhcnlcbiAgICAgICAgICAgICAqIHJvdXRlLlxuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSByb3V0ZUNvbmZpZ1xuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjaGlsZDogZnVuY3Rpb24gKHJvdXRlQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgcm91dGVDb25maWcgPSBhbmd1bGFyLmlzU3RyaW5nKHJvdXRlQ29uZmlnKSA/IHsgbmFtZTogcm91dGVDb25maWcgfSA6IHJvdXRlQ29uZmlnO1xuICAgICAgICAgICAgICAgIGlmICghcm91dGVDb25maWcubmFtZSAmJiAhcm91dGVDb25maWcucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLlBhcmFtZXRlckVycm9yKFwiQ2Fubm90IGNyZWF0ZSByb3V0ZSB3aXRob3V0IGEgbmFtZSBvciBwYXRoLlwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJvdXRlID0gdGhpcy5fZ2V0Um91dGVCeU5hbWVPclBhdGgocm91dGVDb25maWcucGF0aCB8fCByb3V0ZUNvbmZpZy5uYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoIXJvdXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKHRoaXMuYWxsb3dBdXRvbWF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdXRlID0gbmV3IFJvdXRlKHJvdXRlQ29uZmlnLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlJvdXRlIFxcXCJcIiArIChyb3V0ZUNvbmZpZy5wYXRoIHx8IHJvdXRlQ29uZmlnLm5hbWUpICsgXCJcXFwiIGRvZXMgbm90IGV4aXN0LlwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gcm91dGUuZ2V0SW5zdGFuY2Uocm91dGVDb25maWcsIHRoaXMuaXNFcXVhbCh0aGlzLnJvb3QpID8gbnVsbCA6IHRoaXMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2dldFJvdXRlQnlOYW1lT3JQYXRoOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm5hbWVUb1JvdXRlW25hbWVdIHx8IHRoaXMuZ2V0Um91dGVCeVBhdGgobmFtZSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEdldHMgYW4gZXhpc3Rpbmcgcm91dGUgYnkgcGF0aC5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge1N0cmluZ30gcGF0aFxuICAgICAgICAgICAgICogQHBhcmFtICB7Qm9vbGVhbn0gW3NraXBMYXN0XSBTa2lwIHRoZSBsYXN0IHJvdXRlLlxuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBnZXRSb3V0ZUJ5UGF0aDogZnVuY3Rpb24gKHBhdGgsIHNraXBMYXN0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Um91dGVCeVBhdGhDb21wb25lbnRzKGJ1aWxkUGF0aENvbXBvbmVudHMoeyBwYXRoOiBwYXRoIH0pLCBza2lwTGFzdCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEdldCBhbiBleGlzdGluZyByb3V0ZSBieSBwYXRoIGNvbXBvbmVudHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3RbXX0gcGF0aENvbXBvbmVudHNcbiAgICAgICAgICAgICAqIEBwYXJhbSAge0Jvb2xlYW59IHNraXBMYXN0IFNraXAgdGhlIGxhc3Qgcm91dGUuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldFJvdXRlQnlQYXRoQ29tcG9uZW50czogZnVuY3Rpb24gKHBhdGhDb21wb25lbnRzLCBza2lwTGFzdCkge1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50Um91dGUgPSB0aGlzO1xuICAgICAgICAgICAgICAgIGlmIChza2lwTGFzdCkge1xuICAgICAgICAgICAgICAgICAgICBwYXRoQ29tcG9uZW50cyA9IHBhdGhDb21wb25lbnRzLnNsaWNlKDAsIHBhdGhDb21wb25lbnRzLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXRoQ29tcG9uZW50cy5ldmVyeShmdW5jdGlvbiAocGF0aENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcm91dGUgPSBjdXJyZW50Um91dGUucm91dGVzW3BhdGhDb21wb25lbnQubmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGlmICghcm91dGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50Um91dGUuX2FkZGluZyB8fCBjdXJyZW50Um91dGUuYWxsb3dBdXRvbWF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb3V0ZSA9IGN1cnJlbnRSb3V0ZS5hZGRSb3V0ZSh7IHBhdGg6IHBhdGhDb21wb25lbnQubmFtZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IGVycm9ycy5Sb3V0ZU5vdEZvdW5kRXJyb3IoXCJUaGUgcm91dGUsIFxcXCJcIiArIHBhdGhDb21wb25lbnQubmFtZSArIFwiXFxcIiwgZG9lcyBub3QgZXhpc3RcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFJvdXRlID0gcm91dGU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBjdXJyZW50Um91dGU7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEdldCBhIHBhcmVudCByb3V0ZSBieSBuYW1lLiBJZiBubyBuYW1lIGlzIGdpdmVuLCBpdCBnZXRzIHRoZSBmaXJzdCBwYXJlbnQuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHBhcmVudE5hbWVcbiAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0UGFyZW50OiBmdW5jdGlvbiAocGFyZW50TmFtZSkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudDtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGFyZW50TmFtZSB8fCBwYXJlbnQubmFtZSA9PT0gcGFyZW50TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmVudDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJlbnQuZ2V0UGFyZW50KHBhcmVudE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZXRzIGEgcGFyZW50IGl0ZW0ncyBwYXRoIHBhcmFtZXRlci4gIFRoaXMgcHJlc2V0cyB0aGVcbiAgICAgICAgICAgICAqIHBhdGggcGFyYW1ldGVyIG9mIGEgcGFyZW50IHJvdXRlJ3MgaXRlbSBmb3IgYSBjaGlsZCByb3V0ZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBwYXJlbnROYW1lXG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gaXRlbSBBbiBpdGVtIHRoYXQgY29uZm9ybXMgdG8gdGhlIHBhcmVudCByb3V0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2V0UGFyZW50SXRlbTogZnVuY3Rpb24gKHBhcmVudE5hbWUsIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHBhcmVudE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudE5hbWUgPSBudWxsO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLmdldFBhcmVudChwYXJlbnROYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5zZXRJdGVtKGl0ZW0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ3BhcmVudEl0ZW1DaGFuZ2VkJywgaXRlbSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEdldCBhbGwgdGhlIHBhdGggcGFyYW1zLCBpbmNsdWRpbmcgdGhlIGN1cnJlbnQgcm91dGUncyBmcm9tXG4gICAgICAgICAgICAgKiB0aGUgcGFyYW1zIGFyZ3VtZW50LlxuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBwYXJhbXMgVXNlZCB0byByZXRyaWV2ZSB0aGUgY3VycmVudCByb3V0ZSdzIHBhdGggcGFyYW0uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IEFsbCB0aGUgcGF0aCBwYXJhbXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0UGF0aFBhcmFtczogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0ge307XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMuZ2V0UGFyZW50KCk7XG4gICAgICAgICAgICAgICAgdmFyIHBjcyA9IHRoaXMucGF0aENvbXBvbmVudHM7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSBwY3MubGVuZ3RoIC0gMjtcbiAgICAgICAgICAgICAgICB2YXIgcGMgPSBwY3NbaV07XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW1QYXJhbSA9IHBhcmFtc1t0aGlzLmlkUHJvcGVydHldIHx8IHBhcmFtc1t0aGlzLnBhdGhQYXJhbV07XG5cbiAgICAgICAgICAgICAgICBpZiAoaXRlbVBhcmFtICE9PSB1bmRlZmluZWQgJiYgaXRlbVBhcmFtICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGhQYXJhbXNbdGhpcy5wYXRoUGFyYW1dID0gaXRlbVBhcmFtO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHdoaWxlIChwYXJlbnQgJiYgcGMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aFBhcmFtc1twYy5wYXJhbV0gPSAocGFyZW50LmN1cnJlbnRJdGVtICYmIHBhcmVudC5jdXJyZW50SXRlbVtwYXJlbnQuaWRQcm9wZXJ0eV0pIHx8IHBhcmFtc1twYy5wYXJhbV07XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5nZXRQYXJlbnQoKTtcbiAgICAgICAgICAgICAgICAgICAgaSAtPSAxO1xuICAgICAgICAgICAgICAgICAgICBwYyA9IHBjc1tpXTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aFBhcmFtcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHNldEl0ZW06IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50SXRlbSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KCdpdGVtQ2hhbmdlZCcsIGl0ZW0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGFuIGRhdGEgc291cmNlIGluc3RhbmNlIG9mIGEgcm91dGUuICBUaGlzIGFsbG93cyB0aGUgaW5zdGFuY2VcbiAgICAgICAgICAgICAqIHRvIGJlIG1vZGlmaWVkIHdpdGggaXRzIG93biBjb25maWd1cmF0aW9uIHdoaWxlIGtlZXBpbmcgdGhlIG9yaWdpbmFsIGRlZmF1bHRzXG4gICAgICAgICAgICAgKiBjbGVhbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gY29uZmlnXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IE5ldyBkYXRhIHNvdXJjZSBpbnN0YW5jZSBmb3IgYSByb3V0ZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0SW5zdGFuY2U6IGZ1bmN0aW9uIChjb25maWcsIHBhcmVudCkge1xuICAgICAgICAgICAgICAgIHZhciBpbnN0YW5jZTtcbiAgICAgICAgICAgICAgICBpZiAoT2JqZWN0LmNyZWF0ZSkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIEluc3RhbmNlUHJvdG8gPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgICAgICAgICAgSW5zdGFuY2VQcm90by5wcm90b3R5cGUgPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZSA9IG5ldyBJbnN0YW5jZVByb3RvKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluc3RhbmNlLmNvbmZpZyA9IGFuZ3VsYXIuZXh0ZW5kKGFuZ3VsYXIuZXh0ZW5kKHt9LCB0aGlzLmNvbmZpZyksIGNvbmZpZyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5wYXJlbnQgPSBwYXJlbnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpbnN0YW5jZS5wYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UucGFyZW50ID0gaW5zdGFuY2UucGFyZW50LmdldEluc3RhbmNlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhbmd1bGFyLmV4dGVuZChpbnN0YW5jZSwgY29uZmlnIHx8IHt9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogR2V0cyB0aGUgcGF0aCBvZiB0aGUgcm91dGUgd2l0aCBhbGwgdGhlIHBhcmFtcyBmaWxsZWQgaW4uXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtcyBUaGUgcGFyYW1zIG9mIHRoZSBjdXJyZW50IHJvdXRlLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfSBUaGUgZmluYWwgcGF0aC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZ2V0UGF0aDogZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBwYXRoUGFyYW1zID0gdGhpcy5nZXRQYXRoUGFyYW1zKHBhcmFtcyB8fCB7fSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1aWxkUGF0aCh0aGlzLnBhdGhDb21wb25lbnRzLCBwYXRoUGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUmV0dXJucyB0aGUgdXJsIG9mIHRoZSByb3V0ZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gcGF0aFBhcmFtc1xuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBxdWVyeVBhcmFtc1xuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBnZXRVcmw6IGZ1bmN0aW9uIChwYXRoUGFyYW1zLCBxdWVyeVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciB1cmwgPSB0aGlzLmdldFBhdGgocGF0aFBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmUuYnVpbGRVcmwodXJsLCB0aGlzLmdldFN0b3JlUGFyYW1zKHF1ZXJ5UGFyYW1zIHx8IHt9KSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFRoZSBwYXJhbXMgc2VudCB0byB0aGUgZGF0YSBzdG9yZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gcGFyYW1zXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldFN0b3JlUGFyYW1zOiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0b3JlUGFyYW1zID0gYW5ndWxhci5leHRlbmQoYW5ndWxhci5leHRlbmQoe1xuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IHRoaXMuZmllbGRzLFxuICAgICAgICAgICAgICAgICAgICBmZXRjaGVzOiB0aGlzLmZldGNoZXMsXG4gICAgICAgICAgICAgICAgICAgIHE6IHRoaXMucSxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IHRoaXMuY291bnQsXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogdGhpcy5vZmZzZXQsXG4gICAgICAgICAgICAgICAgICAgIG9yZGVyQnk6IHRoaXMub3JkZXJCeVxuICAgICAgICAgICAgICAgIH0sIHRoaXMucGFyYW1zIHx8IHt9KSwgcGFyYW1zKTtcblxuICAgICAgICAgICAgICAgIHRoaXMucGF0aENvbXBvbmVudHMuZm9yRWFjaChmdW5jdGlvbiAocGMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3JlUGFyYW1zW3BjLnBhcmFtXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIHN0b3JlUGFyYW1zW3BjLnBhcmFtXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgdW5kZWZpbmVkIHByb3BlcnRpZXMgaW5jYXNlIHN0b3JlcyBkbyBub3QgaGFuZGxlIHRoZW0gcHJvcGVybHkuXG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHN0b3JlUGFyYW1zLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBzdG9yZVBhcmFtc1tuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JlUGFyYW1zO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBJcyB0aGUgcm91dGUgaW5zdGFuY2UgdGhlIHNhbWUgYXMgYW5vdGhlci5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Um91dGV9IG90aGVyRGF0YVNvdXJjZSBSb3V0ZSB0byBjb21wYXJlIHRvLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBpc0VxdWFsOiBmdW5jdGlvbiAob3RoZXJEYXRhU291cmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG90aGVyRGF0YVNvdXJjZS5fc2VsZiA9PT0gdGhpcy5fc2VsZjtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGJ1aWxkVHJhbnNmb3JtZXJzOiBmdW5jdGlvbiAodHJhbnNmb3JtZXJzKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRNYXAgPSB0aGlzLnRyYW5zZm9ybWVyTWFwID0ge307XG4gICAgICAgICAgICAgICAgKHRyYW5zZm9ybWVycyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRMaXN0ID0gdE1hcFt0cmFuc2Zvcm1lci50eXBlXSA9IHRNYXBbdHJhbnNmb3JtZXIudHlwZV0gfHwgW107XG4gICAgICAgICAgICAgICAgICAgIHRMaXN0LnB1c2godHJhbnNmb3JtZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSdW5zIGFueSB0cmFuc2Zvcm1lcnMgb2YgYSBnaXZlbiB0eXBlLlxuICAgICAgICAgICAgICogQHBhcmFtIHtTdHJpbmd9IHR5cGVcbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0W119IG5ld0l0ZW1zIHRoZSBzb3VyY2UgdG8gdHJhbnNmb3JtLlxuICAgICAgICAgICAgICogQHBhcmFtIHtPYmplY3RbXX0gb2xkSXRlbXMgdGhlIG9yaWdpbmFsIGl0ZW1zIGJlZm9yZSBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlciAoaWYgdGhlIHR5cGUgaXMgcmVzcG9uc2UpLlxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcnVuVHJhbnNmb3JtZXJzOiBmdW5jdGlvbiAodHlwZSwgbmV3SXRlbXMsIG9sZEl0ZW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRNYXAgPSB0aGlzLnRyYW5zZm9ybWVyTWFwO1xuICAgICAgICAgICAgICAgIHZhciBpdGVtcyA9IG5ld0l0ZW1zO1xuXG4gICAgICAgICAgICAgICAgdmFyIHRMaXN0ID0gdE1hcFt0eXBlXTtcbiAgICAgICAgICAgICAgICBpZiAodExpc3QgJiYgbmV3SXRlbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdExpc3QuZm9yRWFjaChmdW5jdGlvbiAodHJhbnNmb3JtZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zID0gdHJhbnNmb3JtZXIudHJhbnNmb3JtKGl0ZW1zLCBvbGRJdGVtcyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGhhc1RyYW5zZm9ybWVyczogZnVuY3Rpb24gKHRyYW5zZm9ybWVyVHlwZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zZm9ybWVyTWFwICYmIHRoaXMudHJhbnNmb3JtZXJNYXBbdHJhbnNmb3JtZXJUeXBlXTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSGVscGVyIG1ldGhvZCB0byBwZXJmb3JtIENSVUQgcmVxdWVzdHMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG1ldGhvZCBUaGUgY3J1ZCBtZXRob2QuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtcyBwYXJhbWV0ZXJzIHRvIHNlbmQgd2l0aCB0aGUgbWV0aG9kLlxuICAgICAgICAgICAgICogQHBhcmFtICB7Kn0gW2l0ZW1dICAgVGhlIGl0ZW0gdG8gc2VuZCB3aXRoIHRoZSByZXF1ZXN0LlxuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBBIHByb21pc2UgdG8gaGFuZGxlIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZG9SZXF1ZXN0OiBmdW5jdGlvbiAobWV0aG9kLCBwYXJhbXMsIGl0ZW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgICAgIHZhciBpc0FycmF5ID0gYW5ndWxhci5pc0FycmF5KGl0ZW0pO1xuICAgICAgICAgICAgICAgIHZhciBvbGRJdGVtcyA9ICFpdGVtIHx8IGlzQXJyYXkgPyBpdGVtIDogW2l0ZW1dO1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAgICAgICAgIHBhcmFtcyA9IGFuZ3VsYXIuZXh0ZW5kKGFuZ3VsYXIuY29weSh0aGlzLnBhcmFtcyB8fCB7fSksIHBhcmFtcyB8fCB7fSk7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGggPSB0aGlzLmdldFBhdGgocGFyYW1zKTtcbiAgICAgICAgICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSB0aGlzLmdldFN0b3JlUGFyYW1zKHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgdmFyIHN0b3JlUGFyYW1zID0ge1xuICAgICAgICAgICAgICAgICAgICBjYWNoZTogdGhpcy5jYWNoZVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5oYXNUcmFuc2Zvcm1lcnMoXCJyZXF1ZXN0XCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0gPSB0aGlzLnJ1blRyYW5zZm9ybWVycyhcInJlcXVlc3RcIiwgb2xkSXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSAmJiAhaXNBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGl0ZW1bMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoXCJyZXF1ZXN0XCIsIHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogcXVlcnlQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGl0ZW1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSB0aGlzLnN0b3JlW21ldGhvZF0ocGF0aCB8fCBudWxsLCBxdWVyeVBhcmFtcywgaXRlbSwgc3RvcmVQYXJhbXMpO1xuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQudGhlbikge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQudGhlbihmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzZWxmLl9yZXNvbHZlUmVxdWVzdChtZXRob2QsIHBhdGgsIHF1ZXJ5UGFyYW1zLCBvbGRJdGVtcywgcmVzcCkpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmVtaXQoXCJlcnJvclwiLCBlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzdWx0IGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KFwiZXJyb3JcIiwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh0aGlzLl9yZXNvbHZlUmVxdWVzdChtZXRob2QsIHBhdGgsIHF1ZXJ5UGFyYW1zLCBvbGRJdGVtcywgcmVzdWx0KSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfcmVzb2x2ZVJlcXVlc3Q6IGZ1bmN0aW9uIChtZXRob2QsIHBhdGgsIHF1ZXJ5UGFyYW1zLCBvbGRJdGVtcywgcmVzcCkge1xuICAgICAgICAgICAgICAgIHZhciBpc0FycmF5ID0gYW5ndWxhci5pc0FycmF5KHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgdmFyIG5ld0l0ZW1zID0gIXJlc3AuZGF0YSB8fCBpc0FycmF5ID8gcmVzcC5kYXRhIDogW3Jlc3AuZGF0YV07XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5oYXNUcmFuc2Zvcm1lcnMoXCJyZXNwb25zZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdJdGVtcyA9IHRoaXMucnVuVHJhbnNmb3JtZXJzKFwicmVzcG9uc2VcIiwgbmV3SXRlbXMsIG9sZEl0ZW1zIHx8IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0l0ZW1zICYmICFpc0FycmF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtcyA9IG5ld0l0ZW1zWzBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlc3AuZGF0YSA9IG5ld0l0ZW1zO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMuZW1pdChcInJlc3BvbnNlXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtczogcXVlcnlQYXJhbXMsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlOiByZXNwXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQobWV0aG9kLCByZXNwLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFF1ZXJ5IGZvciBhIGxpc3Qgb2YgaXRlbXMuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtc1xuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBwcm9taXNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHF1ZXJ5OiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZG9SZXF1ZXN0KFwicmVhZFwiLCBwYXJhbXMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBHZXQgYW4gaXRlbSBieSBpZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gaWRPclBhcmFtc1xuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBwcm9taXNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKGlkT3JQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICBpZE9yUGFyYW1zID0gIWFuZ3VsYXIuaXNPYmplY3QoaWRPclBhcmFtcykgPyB7IGlkOiBpZE9yUGFyYW1zIH0gOiBpZE9yUGFyYW1zO1xuICAgICAgICAgICAgICAgIGlmICghaWRPclBhcmFtcy5pZCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXJyb3JzLlBhcmFtZXRlckVycm9yKFwiUmVxdWlyZXMgYW4gaXRlbSBpZCBvciBwYXJhbWV0ZXJzIHRoYXQgaW5jbHVkZSBhbiBpZC5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnF1ZXJ5KGlkT3JQYXJhbXMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGUgYSBuZXcgaXRlbS5cbiAgICAgICAgICAgICAqIEBwYXJhbSAgeyp9IGl0ZW0gIFRoZSBpdGVtIHRvIGNyZWF0ZS5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gW3BhcmFtc11cbiAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gcHJvbWlzZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIChpdGVtLCBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0pIHsgdGhyb3cgbmV3IGVycm9ycy5QYXJhbWV0ZXJFcnJvcihcIlJlcXVpcmVzIGFuIGl0ZW0gdG8gY3JlYXRlLlwiKTsgfVxuICAgICAgICAgICAgICAgIC8vdmFyIGl0ZW1QYXJhbSA9IGl0ZW1bdGhpcy5pZFByb3BlcnR5XSB8fCBpdGVtW3RoaXMucGF0aFBhcmFtXTtcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgICAgICAgICAgICAgLy8gaWYgKGl0ZW1QYXJhbSkge1xuICAgICAgICAgICAgICAgIC8vICAgICBwYXJhbXNbdGhpcy5wYXRoUGFyYW1dID0gaXRlbVBhcmFtO1xuICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kb1JlcXVlc3QoXCJjcmVhdGVcIiwgcGFyYW1zLCBpdGVtKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogVXBkYXRlIGFuIGV4aXN0aW5nIGl0ZW0uXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHsqfSBpdGVtXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IFtwYXJhbXNdXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IHByb21pc2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgdXBkYXRlOiBmdW5jdGlvbiAoaXRlbSwgcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtKSB7IHRocm93IG5ldyBlcnJvcnMuUGFyYW1ldGVyRXJyb3IoXCJSZXF1aXJlcyBhbiBpdGVtIHRvIHVwZGF0ZS5cIik7IH1cbiAgICAgICAgICAgICAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgICAgICAgICAgICAgcGFyYW1zW3RoaXMuaWRQcm9wZXJ0eV0gPSBpdGVtW3RoaXMuaWRQcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZG9SZXF1ZXN0KFwidXBkYXRlXCIsIHBhcmFtcywgaXRlbSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNhdmUgYW4gaXRlbS4gIElmIHRoZSBpdGVtIGRvZXMgbm90IGhhdmUgYW4gaWQsIGl0IHdpbGxcbiAgICAgICAgICAgICAqIGJlIGNyZWF0ZWQsIG90aGVyd2lzZSwgaXQnbGwgYmUgdXBkYXRlZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSAgeyp9IGl0ZW0gIFRoZSBpdGVtIHRvIHNhdmUuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IFtwYXJhbXNdXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IHByb21pc2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgc2F2ZTogZnVuY3Rpb24gKGl0ZW0sIHBhcmFtcykge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtLmhhc093blByb3BlcnR5KHRoaXMuaWRQcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudXBkYXRlKGl0ZW0sIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlKGl0ZW0sIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWxldGVzIGFuIGl0ZW0uXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHsqfSBpdGVtICBUaGUgaXRlbSB0byBkZWxldGUuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IFtwYXJhbXNdXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IHByb21pc2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgXCJkZWxldGVcIjogZnVuY3Rpb24gKGl0ZW0sIHBhcmFtcykge1xuICAgICAgICAgICAgICAgIGlmICghaXRlbSkgeyB0aHJvdyBuZXcgZXJyb3JzLlBhcmFtZXRlckVycm9yKFwiUmVxdWlyZXMgYW4gaXRlbSB0byBkZWxldGUuXCIpOyB9XG4gICAgICAgICAgICAgICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuICAgICAgICAgICAgICAgIGlmICghYW5ndWxhci5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtc1t0aGlzLmlkUHJvcGVydHldID0gaXRlbVt0aGlzLmlkUHJvcGVydHldO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kb1JlcXVlc3QoXCJkZWxldGVcIiwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZG9SZXF1ZXN0KFwiZGVsZXRlXCIsIHBhcmFtcywgaXRlbSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNhbWUgYXMgZGVsZXRlLCBidXQgZG9lc24ndCBoYXZlIHRvIGJlIGluIHNxdWFyZSBicmFja2V0cyB0byB1c2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHsqfSBpdGVtXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IFtwYXJhbXNdXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IHByb21pc2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAoaXRlbSwgcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNbXCJkZWxldGVcIl0oaXRlbSwgcGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUGVyZm9ybSBhIGJhdGNoIG9mIG9wZXJhdGlvbnMgd2l0aG91dCBkZWFsaW5nIHdpdGggcHJvbWlzZSBtYW5hZ2VtZW50LlxuICAgICAgICAgICAgICogQSBmdW5jdGlvbiBpcyBwYXNzZWQgaW4sIHdpdGggdGhlIHJvdXRlIGFzIGEgcGFyYW1ldGVyLiAgVGhlIGJhdGNoRm4ncyBzY29wZVxuICAgICAgICAgICAgICogaXMgYSBjdXN0b20gYmF0Y2ggcm91dGUuICBXaXRoaW4gdGhlIGJhdGNoIGZ1bmN0aW9uLCB5b3UnZCBjYWxsIHRoZSBhY3Rpb25zIGFzIFwidGhpcy5yZWFkKClcIi5cbiAgICAgICAgICAgICAqIFRoaXMgZXNzZW50aWFsbHkgY3JlYXRlcyBhIGNsaWVudCBzaWRlIHRyYW5zYWN0aW9uLiBBbiBhcnJheSBjYW4gb3B0aW9uYWxseSBiZSBwYXNzZWQgaW4gdG9cbiAgICAgICAgICAgICAqIHJ1biB0aGUgYmF0Y2ggZnVuY3Rpb24gb24gZWFjaCBpdGVtLiAgSXQgc3RpbGwgb25seSBjcmVhdGVzIGEgc2luZ2xlIHRyYW5zYWN0aW9uLlxuICAgICAgICAgICAgICogQGV4YW1wbGVcbiAgICAgICAgICAgICAqICAgICByb3V0ZS5iYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgKiAgICAgICAgIHRoaXMuY3JlYXRlKG5ld0l0ZW1zKTtcbiAgICAgICAgICAgICAqICAgICAgICAgdGhpcy5yZW1vdmUoZGVsZXRlZEl0ZW1zKTtcbiAgICAgICAgICAgICAqICAgICB9KS50aGVuKGZ1bmN0aW9uICgpKSB7XG4gICAgICAgICAgICAgKiAgICAgICAgIC4uLlxuICAgICAgICAgICAgICogICAgIH0pXG4gICAgICAgICAgICAgKiAgICAgcm91dGUuYmF0Y2goaXRlbXMsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgKiAgICAgICAgIHRoaXMuc2V0UGFyZW50SXRlbShpdGVtKTtcbiAgICAgICAgICAgICAqICAgICAgICAgdGhpcy5xdWVyeSgpLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAqICAgICAgICAgICAgIGl0ZW0uY2hpbGRlcm4gPSByZXNwLmRhdGE7XG4gICAgICAgICAgICAgKiAgICAgICAgIH0pO1xuICAgICAgICAgICAgICogICAgIH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICogICAgICAgICAvLyBoYW5kbGUgaXRlbSBtYW5pcHVsYXRpb24gYWZ0ZXIgY2hpbGRyZW4gYXJlIGFsbCBsb2FkZWQuXG4gICAgICAgICAgICAgKiAgICAgfSk7XG4gICAgICAgICAgICAgKiBAcGFyYW0ge09iamVjdFtdfSBbYXJyYXldIEFuIGFycmF5IG9mIGl0ZW1zLlxuICAgICAgICAgICAgICogQHBhcmFtICB7RnVuY3Rpb259IGJhdGNoRm5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGJhdGNoOiBmdW5jdGlvbiAoYXJyYXksIGJhdGNoRm4pIHtcbiAgICAgICAgICAgICAgICB2YXIgcHJvbWlzZXMgPSBbXTtcblxuICAgICAgICAgICAgICAgIGlmICghYmF0Y2hGbikge1xuICAgICAgICAgICAgICAgICAgICBiYXRjaEZuID0gYXJyYXk7XG4gICAgICAgICAgICAgICAgICAgIGFycmF5ID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgYWRkUHJvbWlzZSA9IGZ1bmN0aW9uIChuZXdQcm9taXNlLCBvbGRQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIG5lZWQgdG8gd2FpdCBvbiBhIHByb21pc2UgaWYgdGhlcmUgYXJlIG9uZXMgYWZ0ZXIgaXQuXG4gICAgICAgICAgICAgICAgICAgIGlmIChvbGRQcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5zcGxpY2UocHJvbWlzZXMuaW5kZXhPZihvbGRQcm9taXNlKSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChuZXdQcm9taXNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ld1Byb21pc2U7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHZhciBjcmVhdGVGYWtlUHJvbWlzZSA9IGZ1bmN0aW9uIChwcm9taXNlLCBhZGRlZFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlbjogZnVuY3Rpb24gKHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwID0gYWRkUHJvbWlzZShwcm9taXNlLnRoZW4oc3VjY2VzcywgZXJyb3IpLCBwcm9taXNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUZha2VQcm9taXNlKHApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGNhbGxNZXRob2QgPSBmdW5jdGlvbiAocm91dGUsIG1ldGhvZE5hbWUsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9taXNlID0gYWRkUHJvbWlzZShyb3V0ZVttZXRob2ROYW1lXS5hcHBseShyb3V0ZSwgYXJncykpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY3JlYXRlRmFrZVByb21pc2UocHJvbWlzZSwgZnVuY3Rpb24gKG9sZFByb21pc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5zcGxpY2UocHJvbWlzZXMuaW5kZXhPZihwcm9taXNlKSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHZhciBmYWtlUm91dGUgPSB0aGlzLmdldEluc3RhbmNlKHtcbiAgICAgICAgICAgICAgICAgICAgcXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsTWV0aG9kKGZha2VSb3V0ZSwgXCJxdWVyeVwiLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsTWV0aG9kKGZha2VSb3V0ZSwgXCJnZXRcIiwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbE1ldGhvZChmYWtlUm91dGUsIFwiY3JlYXRlXCIsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxNZXRob2QoZmFrZVJvdXRlLCBcInVwZGF0ZVwiLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbE1ldGhvZChmYWtlUm91dGUsIFwic2F2ZVwiLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbE1ldGhvZChmYWtlUm91dGUsIFwiZGVsZXRlXCIsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxNZXRob2QoZmFrZVJvdXRlLCBcImRlbGV0ZVwiLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYXJyYXkuZm9yRWFjaChiYXRjaEZuLCBmYWtlUm91dGUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJhdGNoRm4uY2FsbChmYWtlUm91dGUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiAkcS5hbGwocHJvbWlzZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBmdW5jdGlvbiBEYXRhU291cmNlIChjb25maWcpIHtcbiAgICAgICAgICAgIHZhciByb290Um91dGUgPSBuZXcgUm91dGUoYW5ndWxhci5leHRlbmQoe1xuICAgICAgICAgICAgICAgIHN0b3JlOiBjb25maWcuc3RvcmUgfHwgZ2V0U3RvcmUoY29uZmlnLnN0b3JlQ29uZmlnKSxcbiAgICAgICAgICAgICAgICByb3V0ZXM6IGNvbmZpZy5yb3V0ZXNcbiAgICAgICAgICAgIH0sIGNvbmZpZy5kZWZhdWx0cykpO1xuICAgICAgICAgICAgcmV0dXJuIHJvb3RSb3V0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBnbG9iYWxEYXRhU291cmNlID0gbmV3IERhdGFTb3VyY2UoZ2xvYmFsQ29uZmlnKTtcbiAgICAgICAgdmFyIGRhdGFTb3VyY2UgPSBmdW5jdGlvbiAocm91dGVDb25maWcpIHtcbiAgICAgICAgICAgIHJldHVybiByb3V0ZUNvbmZpZyA/IGdsb2JhbERhdGFTb3VyY2UuY2hpbGQocm91dGVDb25maWcpIDogZ2xvYmFsRGF0YVNvdXJjZS5nZXRJbnN0YW5jZSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGRhdGFTb3VyY2UuY3JlYXRlRGF0YVNvdXJjZSA9IGZ1bmN0aW9uIChjb25maWdGdW5jKSB7XG4gICAgICAgICAgICB2YXIgY29uZmlnID0ge307XG4gICAgICAgICAgICB2YXIgY29uZmlnT2JqID0gZGF0YVNvdXJjZUNvbmZpZ3VyYXRpb25GYWN0b3J5KGNvbmZpZyk7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc0Z1bmN0aW9uKGNvbmZpZ0Z1bmMpKSB7XG4gICAgICAgICAgICAgICAgY29uZmlnRnVuYy5jYWxsKGNvbmZpZ09iaiwgY29uZmlnT2JqKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYW5ndWxhci5pc09iamVjdChjb25maWdGdW5jKSkge1xuICAgICAgICAgICAgICAgIGNvbmZpZ09iai5zZXREZWZhdWx0cyhjb25maWdGdW5jKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0YVNvdXJjZShjb25maWcpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGRhdGFTb3VyY2UuZXJyb3JzID0gZXJyb3JzO1xuXG4gICAgICAgIHJldHVybiBkYXRhU291cmNlO1xuICAgIH1dO1xuXG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCJhdHNpZC5kYXRhXCI7XG4iLCJmdW5jdGlvbiBjcmVhdGVOYW1lZEVycm9yKG5hbWUsIGRlZmF1bHRNZXNzYWdlKSB7XG4gICAgdmFyIEVycm9yQ3RyID0gZnVuY3Rpb24gKCkge307XG4gICAgRXJyb3JDdHIucHJvdG90eXBlID0gbmV3IEVycm9yKGRlZmF1bHRNZXNzYWdlKTtcbiAgICBFcnJvckN0ci5wcm90b3R5cGUubmFtZSA9IG5hbWU7XG4gICAgcmV0dXJuIEVycm9yQ3RyO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUVycm9yc0Zyb21NYXAobWFwKSB7XG4gICAgdmFyIG5ld01hcCA9IHt9O1xuICAgIGZvciAodmFyIGVycm9yTmFtZSBpbiBtYXApIHtcbiAgICAgICAgbmV3TWFwW2Vycm9yTmFtZV0gPSBjcmVhdGVOYW1lZEVycm9yKGVycm9yTmFtZSwgbWFwW2Vycm9yTmFtZV0pO1xuICAgIH1cbiAgICByZXR1cm4gbmV3TWFwO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdlbmVyYXRlRXJyb3JzRnJvbU1hcCh7XG4gICAgLy8gR2VuZXJhbCBFcnJvcnNcbiAgICBOb3RJbWxlbWVudGVkRXJyb3I6IFwiTm90IGltcGxlbWVudGVkXCIsXG4gICAgTm90Rm91bmRFcnJvcjogXCJOb3QgRm91bmRcIixcblxuICAgIC8vIERhdGEgU291cmNlIEVycm9yc1xuICAgIE5vdFJvb3RSb3V0ZUVycm9yOiBcIk11c3QgYmUgdGhlIHJvb3Qgcm91dGUgdG8gdXNlIHRoaXMgZmVhdHVyZVwiLFxuICAgIFBhcmFtZXRlckVycm9yOiBcIk1pc3NpbmcgUGFyYW1ldGVyXCIsXG4gICAgUm91dGVOb3RGb3VuZEVycm9yOiBcIlRoZSByb3V0ZSBkb2VzIG5vdCBleGlzdFwiXG59KTsiLCJhbmd1bGFyLm1vZHVsZShcImF0c2lkLmV2ZW50YWJsZVwiLFtdKS5wcm92aWRlcihcImV2ZW50YWJsZVwiLCBbZnVuY3Rpb24gKCkge1xuXG4gICAgLyoqXG4gICAgICogQGNvbnN0cnVjdG9yXG4gICAgICpcbiAgICAgKiBAZGVzY3JpcHRpb25cbiAgICAgKiBBZGRzIG1lc3NhZ2UgYmFzZWQgZXZlbnRpbmcgdG8gb2JqZWN0cy4gIFVzZWQgYnlcbiAgICAgKiBJdGVtIGFuZCBJdGVtQ29sbGVjdGlvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBFdmVudGFibGUgKGNvbmZpZywgc2NvcGUpIHtcbiAgICAgICAgYW5ndWxhci5leHRlbmQodGhpcywgY29uZmlnKTtcbiAgICB9XG5cbiAgICBFdmVudGFibGUucHJvdG90eXBlID0ge1xuICAgICAgICBfZ2V0RXZlbnRhYmxlU2NvcGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXRzIGFsbCB0aGUgZXZlbnQgbGlzdGVuZXJzIGZvciBhIG1lc3NhZ2UuXG4gICAgICAgICAqIEBwYXJhbSAge1N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSBvZiB0aGUgZXZlbnQuXG4gICAgICAgICAqIEByZXR1cm4ge09iamVjdFtdfSBBbiBhcnJheSBvZiBsaXN0ZW5lcnMuXG4gICAgICAgICAqL1xuICAgICAgICBfZ2V0RXZlbnRMaXN0ZW5lcnM6IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgICAgICB2YXIgc2NvcGUgPSB0aGlzLl9nZXRFdmVudGFibGVTY29wZSgpO1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gc2NvcGUuJGV2ZW50TWVzc2FnZXMgPSBzY29wZS4kZXZlbnRNZXNzYWdlcyB8fCB7fTtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSBtZXNzYWdlc1ttZXNzYWdlXTtcbiAgICAgICAgICAgIGlmICghbGlzdGVuZXJzKSB7XG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gbWVzc2FnZXNbbWVzc2FnZV0gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsaXN0ZW5lcnM7XG4gICAgICAgIH0sXG5cbiAgICAgICAgaGFzTGlzdGVuZXJzOiBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICAgICAgcmV0dXJuICEhdGhpcy5fZ2V0RXZlbnRhYmxlU2NvcGUoKS5fZ2V0RXZlbnRMaXN0ZW5lcnMobWVzc2FnZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVtaXQgYSBtZXNzYWdlLlxuICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG1lc3NhZ2UgVGhlIG1lc3NhZ2UgdG8gZW1pdC5cbiAgICAgICAgICogQHJldHVybiB7RXZlbnR9IFRoZSBldmVudCB1c2VkIHRvIHNlbmQgdGhlIG1lc3NhZ2UuXG4gICAgICAgICAqL1xuICAgICAgICBlbWl0OiBmdW5jdGlvbiAobWVzc2FnZSwgZGF0YSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2dldEV2ZW50TGlzdGVuZXJzKG1lc3NhZ2UpO1xuICAgICAgICAgICAgdmFyIGV2ZW50ID0ge1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBkYXRhLFxuICAgICAgICAgICAgICAgICAgICBwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5kZWZhdWx0UHJldmVudGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFByZXZlbnRlZDogZmFsc2VcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBhcmdzLnVuc2hpZnQoZXZlbnQpO1xuXG4gICAgICAgICAgICBsaXN0ZW5lcnMuZm9yRWFjaChmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICBsaXN0ZW5lci5mbi5hcHBseShsaXN0ZW5lci50YXJnZXQsIGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBldmVudDtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogQWRkIGFuIGV2ZW50IGxpc3RlbmVyIGZvciBhIGdpdmVuIG1lc3NhZ2UuXG4gICAgICAgICAqIEBwYXJhbSAge1N0cmluZ30gbWVzc2FnZSBUaGUgbWVzc2FnZSBmb3IgdGhlIGxpc3RlbmVyLlxuICAgICAgICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gbGlzdGVuZXJGbiBUaGUgZnVuY3Rpb24gdGhhdCBpcyBjYWxsZWQgdG8gaGFuZGxlIHRoZSBldmVudC5cbiAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgbGlzdGVuZXIuICBUbyByZW1vdmUsIHVzZSBsaXN0ZW5lci5yZW1vdmUoKS5cbiAgICAgICAgICovXG4gICAgICAgIG9uOiBmdW5jdGlvbiAobWVzc2FnZSwgbGlzdGVuZXJGbikge1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2dldEV2ZW50TGlzdGVuZXJzKG1lc3NhZ2UpO1xuICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0ge1xuICAgICAgICAgICAgICAgIGZuOiBsaXN0ZW5lckZuLFxuICAgICAgICAgICAgICAgIHRhcmdldDogdGhpcyxcbiAgICAgICAgICAgICAgICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gbGlzdGVuZXJzLmluZGV4T2YodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgICAgIHJldHVybiBsaXN0ZW5lcjtcbiAgICAgICAgfVxuXG4gICAgfTtcblxuICAgIHRoaXMuJGdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjb25maWcsIHNjb3BlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEV2ZW50YWJsZShjb25maWcsIHNjb3BlKTtcbiAgICAgICAgfTtcbiAgICB9O1xuXG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCJhdHNpZC5ldmVudGFibGVcIjtcbiIsIi8qKlxuICogQG5nZG9jIHByb3ZpZGVyXG4gKiBAbmFtZSBhdHNpZC5kYXRhOmh0dHBTdG9yZVxuICpcbiAqIEBkZXNjcmlwdGlvblxuICogQW4gSFRUUCBiYXNlZCBkYXRhIHN0b3JlIHVzZWQgYnkgYSBkYXRhIHNvdXJjZS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoXCJhdHNpZC5kYXRhLmh0dHBTdG9yZVwiLCBbXG4gICAgcmVxdWlyZShcIi4vYmFzZVN0b3JlXCIpXG5dKS5wcm92aWRlcihcImh0dHBTdG9yZVwiLCBbZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gTWFwIG9mIGRlZmF1bHQgc3RvcmUgY29uZmlndXJhdGlvbnMuXG4gICAgdmFyIGRlZmF1bHRDb25maWdzID0ge307XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBkZWZhdWx0IHN0b3JlIGNvbmZpZyB0aGF0IGNhbiBiZSBhY2Nlc3NlZCBieSBuYW1lLlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lICAgQSBuYW1lIHRvIGlkZW50aWZ5IHRoZSBzdG9yZS5cbiAgICAgKi9cbiAgICB0aGlzLmFkZFN0b3JlID0gZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICBpZiAoIWFuZ3VsYXIuaXNTdHJpbmcoY29uZmlnLm5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHbG9iYWwgaHR0cCBzdG9yZSBkZWZhdWx0cyByZXF1aXJlIGEgbmFtZS5cIik7XG4gICAgICAgIH1cbiAgICAgICAgZGVmYXVsdENvbmZpZ3NbY29uZmlnLm5hbWVdID0gY29uZmlnO1xuICAgIH07XG5cbiAgICB0aGlzLiRnZXQgPSBbXCIkaHR0cFwiLCBcImJhc2VTdG9yZVwiLCBcIiRjYWNoZUZhY3RvcnlcIiwgZnVuY3Rpb24gKCRodHRwLCBiYXNlU3RvcmUsICRjYWNoZUZhY3RvcnkpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIFRoZSBjb25zdHJ1Y3RvciBmb3IgYSBuZXcgSFRUUCBzdG9yZS5cbiAgICAgICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBkZWZhdWx0IGNvbmZpZ3VyYXRpb25zLlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gSFRUUFN0b3JlIChjb25maWcpIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IGFuZ3VsYXIuZXh0ZW5kKHtcbiAgICAgICAgICAgICAgICByZXNwb25zZToge1xuICAgICAgICAgICAgICAgICAgICBwYXRoczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnQ6IFwiY291bnRcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IFwiZGF0YVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBcIm9mZnNldFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWw6IFwidG90YWxcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtZXRob2RzOiB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgcHV0OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBwYXRjaDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgcG9zdDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgXCJkZWxldGVcIjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIGRlZmF1bHRDb25maWdzW2NvbmZpZy5uYW1lXSB8fCB7fSk7XG4gICAgICAgICAgICB0aGlzLmNvbmZpZyA9IGFuZ3VsYXIuZXh0ZW5kKGFuZ3VsYXIuZXh0ZW5kKHt9LCBkZWZhdWx0cyksIGNvbmZpZyk7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkVHJhbnNmb3JtZXJzKGNvbmZpZy50cmFuc2Zvcm1lcnMgfHwgW10pO1xuICAgICAgICB9XG5cbiAgICAgICAgSFRUUFN0b3JlLnByb3RvdHlwZSA9IGJhc2VTdG9yZSh7XG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogUGFyc2VzIHRoZSByZXNwb25zZSBvZiBhbiBodHRwIHJlcXVlc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG1ldGhvZCBUaGUgbWV0aG9kIG9mIHRoZSByZXF1ZXN0LlxuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBjb25maWcgdGhlIEhUVFBTdG9yZSBjb25maWd1cmF0aW9uLlxuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSByZXNwICAgdGhlIHJlc3Agb2YgdGhlIHJlcXVlc3QuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICBBIGRhdGFTb3VyY2UgY29tcGxpYW50IHJlc3BvbnNlIG9iamVjdC5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcGFyc2VSZXNwb25zZTogZnVuY3Rpb24gKG1ldGhvZCwgY29uZmlnLCByZXNwKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3BDb25maWcgPSB0aGlzLmdldFZhbHVlQXRQYXRoKFwibWV0aG9kcy9cIiArIG1ldGhvZCArIFwicmVzcG9uc2VcIiwgY29uZmlnKSB8fCBjb25maWcucmVzcG9uc2UsXG4gICAgICAgICAgICAgICAgICAgIHBhdGhzID0gcmVzcENvbmZpZy5wYXRocyB8fCB7fSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YSA9IHRoaXMuZ2V0VmFsdWVBdFBhdGgocGF0aHMuZGF0YSwgcmVzcCkgfHwgcmVzcCxcbiAgICAgICAgICAgICAgICAgICAgaXNBcnJheSA9IGFuZ3VsYXIuaXNBcnJheShkYXRhKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmhhc1RyYW5zZm9ybWVycyhcInJlc3BvbnNlXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEgPSB0aGlzLnJ1blRyYW5zZm9ybWVycyhcInJlc3BvbnNlXCIsIGRhdGEsIFtdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGEgJiYgIWlzQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEgPSBkYXRhWzBdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlUmVzcG9uc2UoZGF0YSwgdGhpcy5nZXRWYWx1ZUF0UGF0aChwYXRocy5vZmZzZXQsIHJlc3ApLCB0aGlzLmdldFZhbHVlQXRQYXRoKHBhdGhzLnRvdGFsLCByZXNwKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEJ1aWxkcyB0aGUgdXJsIGZvciBhbiBodHRwIHJlcXVlc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IHVybCBUaGUgcm91dGVcInMgdXJsLlxuICAgICAgICAgICAgICogQHJldHVybiB7U3RyaW5nfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBidWlsZFVybDogZnVuY3Rpb24gKHVybCwgcXVlcnkpIHtcbiAgICAgICAgICAgICAgICB1cmwgPSB1cmwgfHwgXCJcIjtcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwgfHwgXCJcIjtcbiAgICAgICAgICAgICAgICB2YXIgcXVlcnlMaXN0ID0gW107XG4gICAgICAgICAgICAgICAgdmFyIHNlcGFyYXRvciA9IHVybCAmJiBiYXNlVXJsLmNoYXJBdChiYXNlVXJsLmxlbmd0aCAtIDEpICE9PSBcIi9cIiA/IFwiL1wiIDogXCJcIjtcblxuICAgICAgICAgICAgICAgIHVybCA9IGJhc2VVcmwgKyBzZXBhcmF0b3IgKyB1cmw7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHF1ZXJ5LCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcXVlcnlMaXN0LnB1c2gobmFtZSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXJ5TGlzdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgdXJsICs9IFwiP1wiICsgcXVlcnlMaXN0LmpvaW4oXCImXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZ2V0Q2FjaGU6IGZ1bmN0aW9uIChjYWNoZUlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGUgPSAkY2FjaGVGYWN0b3J5KGNhY2hlSWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGludmFsaWRhdGVDYWNoZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhY2hlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FjaGUucmVtb3ZlQWxsKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcy5jYWNoZS5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcy5jYWNoZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBQZXJmb3JtcyBhbiBIVFRQIHJlcXVlc3QuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IG1ldGhvZFxuICAgICAgICAgICAgICogQHBhcmFtICB7U3RyaW5nfSB1cmxcbiAgICAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gcGFyYW1zXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGRhdGFcbiAgICAgICAgICAgICAqIEBwYXJhbSAge09iamVjdH0gZGVmZXJyZWQgICAgICAgICBBIGRlZmVyIG9iamVjdCB0byBwYXNzIHRoZSByZXNwb25zZSB0by5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgZG9SZXF1ZXN0OiBmdW5jdGlvbiAobWV0aG9kLCB1cmwsIHF1ZXJ5LCBoZWFkZXJzLCBkYXRhLCBzdG9yZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHZhciBjb25maWcgPSB0aGlzLmNvbmZpZztcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIGlzQXJyYXkgPSBhbmd1bGFyLmlzQXJyYXkoZGF0YSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaGFzVHJhbnNmb3JtZXJzKFwicmVxdWVzdFwiKSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRhID0gdGhpcy5ydW5UcmFuc2Zvcm1lcnMoXCJyZXF1ZXN0XCIsIGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSAmJiAhaXNBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YSA9IGRhdGFbMF07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICAgICAgICAgIHVybDogdGhpcy5idWlsZFVybCh1cmwsIHF1ZXJ5KSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogZGF0YSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyczogYW5ndWxhci5leHRlbmQoYW5ndWxhci5leHRlbmQoe30sIHRoaXMuY29uZmlnLmhlYWRlcnMpLCBoZWFkZXJzKSxcbiAgICAgICAgICAgICAgICAgICAgY2FjaGU6IHN0b3JlUGFyYW1zLmNhY2hlID8gdGhpcy5nZXRDYWNoZSh1cmwpIDogZmFsc2VcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLnBhcnNlUmVzcG9uc2UobWV0aG9kLnRvTG93ZXJDYXNlKCksIGNvbmZpZywgcmVzcC5kYXRhKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJlYWQ6IGZ1bmN0aW9uICh1cmwsIHF1ZXJ5LCBkYXRhLCBzdG9yZVBhcmFtcykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRvUmVxdWVzdChcIkdFVFwiLCB1cmwsIHF1ZXJ5LCB7fSwgZGF0YSwgc3RvcmVQYXJhbXMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY3JlYXRlOiBmdW5jdGlvbiAodXJsLCBxdWVyeSwgZGF0YSwgc3RvcmVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmludmFsaWRhdGVDYWNoZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRvUmVxdWVzdChcIlBPU1RcIiwgdXJsLCBxdWVyeSwge30sIGRhdGEsIHN0b3JlUGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKHVybCwgcXVlcnksIGRhdGEsIHN0b3JlUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5pbnZhbGlkYXRlQ2FjaGUoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5kb1JlcXVlc3QoXCJQVVRcIiwgdXJsLCBxdWVyeSwge30sIGRhdGEsIHN0b3JlUGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHBhdGNoOiBmdW5jdGlvbiAodXJsLCBxdWVyeSwgZGF0YSwgc3RvcmVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmludmFsaWRhdGVDYWNoZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRvUmVxdWVzdChcIlBBVENIXCIsIHVybCwgcXVlcnksIHt9LCBkYXRhLCBzdG9yZVBhcmFtcyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBcImRlbGV0ZVwiOiBmdW5jdGlvbiAodXJsLCBxdWVyeSwgZGF0YSwgc3RvcmVQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmludmFsaWRhdGVDYWNoZSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmRvUmVxdWVzdChcIkRFTEVURVwiLCB1cmwsIHF1ZXJ5LCB7IFwiQ29udGVudC1UeXBlXCI6IGFuZ3VsYXIuaXNBcnJheShkYXRhKSA/IFwiYXBwbGljYXRpb24vanNvblwiIDogbnVsbCB9LCBkYXRhLCBzdG9yZVBhcmFtcyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBidWlsZFRyYW5zZm9ybWVyczogZnVuY3Rpb24gKHRyYW5zZm9ybWVycykge1xuICAgICAgICAgICAgICAgIHZhciB0TWFwID0gdGhpcy50cmFuc2Zvcm1lck1hcCA9IHt9O1xuICAgICAgICAgICAgICAgICh0cmFuc2Zvcm1lcnMgfHwgW10pLmZvckVhY2goZnVuY3Rpb24gKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0TGlzdCA9IHRNYXBbdHJhbnNmb3JtZXIudHlwZV0gPSB0TWFwW3RyYW5zZm9ybWVyLnR5cGVdIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICB0TGlzdC5wdXNoKHRyYW5zZm9ybWVyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHJ1blRyYW5zZm9ybWVyczogZnVuY3Rpb24gKHR5cGUsIG5ld0l0ZW1zLCBvbGRJdGVtcykge1xuICAgICAgICAgICAgICAgIHZhciB0TWFwID0gdGhpcy50cmFuc2Zvcm1lck1hcDtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbXMgPSBuZXdJdGVtcztcblxuICAgICAgICAgICAgICAgIHZhciB0TGlzdCA9IHRNYXBbdHlwZV07XG4gICAgICAgICAgICAgICAgaWYgKHRMaXN0ICYmIG5ld0l0ZW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHRMaXN0LmZvckVhY2goZnVuY3Rpb24gKHRyYW5zZm9ybWVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtcyA9IHRyYW5zZm9ybWVyLnRyYW5zZm9ybShpdGVtcywgb2xkSXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBoYXNUcmFuc2Zvcm1lcnM6IGZ1bmN0aW9uICh0cmFuc2Zvcm1lclR5cGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm1lck1hcCAmJiB0aGlzLnRyYW5zZm9ybWVyTWFwW3RyYW5zZm9ybWVyVHlwZV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgICAgIGNvbmZpZyA9IGFuZ3VsYXIuaXNTdHJpbmcoY29uZmlnKSA/IHsgbmFtZTogY29uZmlnIH0gOiBjb25maWcgfHwge307XG4gICAgICAgICAgICByZXR1cm4gbmV3IEhUVFBTdG9yZShjb25maWcpO1xuICAgICAgICB9O1xuXG4gICAgfV07XG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCJhdHNpZC5kYXRhLmh0dHBTdG9yZVwiO1xuIiwiYW5ndWxhci5tb2R1bGUoXCJhdHNpZC5kYXRhLml0ZW1Db2xsZWN0aW9uXCIsIFtcbiAgICByZXF1aXJlKFwiLi9ldmVudGFibGVcIiksXG4gICAgcmVxdWlyZShcIi4vZGF0YVwiKVxuXSkucHJvdmlkZXIoXCJpdGVtQ29sbGVjdGlvblwiLCBbZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuJGdldCA9IFtcImRhdGFTb3VyY2VcIiwgXCJhcnJheVN0b3JlXCIsIFwiZXZlbnRhYmxlXCIsIFwiJHFcIiwgXCIkdGltZW91dFwiLCBmdW5jdGlvbiAoZGF0YVNvdXJjZSwgYXJyYXlTdG9yZSwgZXZlbnRhYmxlLCAkcSwgJHRpbWVvdXQpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpdGVtRGF0YSBUaGUgaW5pdGlhbCBkYXRhIG9mIHRoZSBpdGVtLlxuICAgICAgICAgKiBAcGFyYW0ge0l0ZW1Db2xsZWN0aW9ufSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRoYXQgbWFuYWdlcyB0aGUgaXRlbS5cbiAgICAgICAgICogRWFjaCBpdGVtIHJlcXVpcmVzIGEgY29sbGVjdGlvbiB0byB3b3JrIHByb3Blcmx5LlxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gSXRlbSAoaXRlbURhdGEsIGNvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgIC8vIFByaXZhdGUgbWV0YSBkYXRhXG4gICAgICAgICAgICB2YXIgbWV0YSA9IHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uLFxuXG4gICAgICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgICAgICogVGhlIG9yaWdpbmFsIGRhdGEgc2luY2UgdGhlIGl0ZW0gd2FzIGxhc3Qgc2F2ZWQuXG4gICAgICAgICAgICAgICAgICogVXNlZCB0byBkaWZmIHRoZSBpdGVtIGZvciBhbnkgdW5zYXZlZCBjaGFuZ2VzLlxuICAgICAgICAgICAgICAgICAqIEB0eXBlIHtPYmplY3R9XG4gICAgICAgICAgICAgICAgICovXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxEYXRhOiB7fSxcblxuICAgICAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICAgICAqIEluIGNlcnRhaW4gY2FzZXMsIGEgY2hpbGQgY29sbGVjdGlvbidzIHBhcmVudCBpdGVtIG1heVxuICAgICAgICAgICAgICAgICAqIG5vdCB5ZXQgZXhpc3QgaW4gdGhlIHBlcnNpc3RlbnQgc3RvcmUuICBJbiB0aG9zZSBjYXNlc1xuICAgICAgICAgICAgICAgICAqIHRoZSBjaGlsZCBpdGVtIGNhbm5vdCBiZSBzYXZlZC4gIEl0ZW1Db2xsZWN0aW9uIHN0aWxsIGFkZHMgdGhlc2VcbiAgICAgICAgICAgICAgICAgKiBpdGVtcyBhcyBpZiB0aGV5IHdlcmUgc2F2ZWQsIGJ1dCBpbnRlcm5hbGx5IGZsYWdzIHRoZSBpdGVtIGFzIHVuc2F2ZWQuXG4gICAgICAgICAgICAgICAgICogV2hlbiB0aGUgcGFyZW50IGl0ZW0gaXMgZmluYWxseSBzYXZlZCBpdCB0ZWxscyBhbGwgY2hpbGQgY29sbGVjdGlvbnNcbiAgICAgICAgICAgICAgICAgKiB0byBzYXZlIGFueSBpdGVtcyB0aGF0IGFyZSBtYXJrZWQgd2l0aCB0aGUgXCJ1bnNhdmVkXCIgZmxhZy5cbiAgICAgICAgICAgICAgICAgKiBAdHlwZSB7Qm9vbGVhbn1cbiAgICAgICAgICAgICAgICAgKi9cbiAgICAgICAgICAgICAgICB1bnNhdmVkOiBmYWxzZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBNZXRhIGRhdGEgaXMgYWNjZXNzZWQgdmlhIGEgZ2V0dGVyIGZ1bmN0aW9uIHNvIGFuZ3VsYXIgZG9lc24ndCBoYXZlIGNpcmN1bGFyIGRlcGVuZGVuY3kgaXNzdWVzXG4gICAgICAgICAgICAgKiB3aGVuIGNvcHlpbmcuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHRoaXMuJG1ldGEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1ldGE7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0aGlzLnNldERhdGEoaXRlbURhdGEpO1xuXG4gICAgICAgIH1cbiAgICAgICAgSXRlbS5wcm90b3R5cGUgPSBhbmd1bGFyLmV4dGVuZChldmVudGFibGUoKSwge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEdldHMgYSBmbGF0IGNvcHkgb2YgdGhlIGl0ZW0ncyBkYXRhIHRoYXQgaXMgdXNhYmxlIHdpdGhcbiAgICAgICAgICAgICAqIGRhdGEgc291cmNlcy5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7Qm9vbGVhbn0gdXNlT3JpZ2luYWxEYXRhIEdldCB0aGUgb3JpZ2luYWwgLyBzYXZlZCBkYXRhIHdpdGhvdXQgYW55IGNoYW5nZXMuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGdldERhdGE6IGZ1bmN0aW9uICh1c2VPcmlnaW5hbERhdGEsIGluY2x1ZGVUZW1wSWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YSA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciBzb3VyY2UgPSB1c2VPcmlnaW5hbERhdGEgPyB0aGlzLiRtZXRhKCkub3JpZ2luYWxEYXRhIDogdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgZXhpc3RzID0gdGhpcy5leGlzdHMoKTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIHByb3BOYW1lIGluIHNvdXJjZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KHByb3BOYW1lKSAmJiBwcm9wTmFtZS5jaGFyQXQoMCkgIT09IFwiJFwiICYmIChwcm9wTmFtZSAhPT0gdGhpcy4kbWV0YSgpLmNvbGxlY3Rpb24uaWRQcm9wZXJ0eSB8fCBleGlzdHMgfHwgaW5jbHVkZVRlbXBJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGFbcHJvcE5hbWVdID0gc291cmNlW3Byb3BOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2V0cyBkYXRhIG9uIHRoZSBpdGVtLiAgVGhpcyBpcyB1c2VkIHRvIGFwcGx5IGRhdGFcbiAgICAgICAgICAgICAqIHRoYXQgaXMgYXNzdW1lZCB0byBhbHJlYWR5IGV4aXN0IGluIHRoZSBwZXJzaXN0ZW50IHN0b3JlLlxuICAgICAgICAgICAgICogQW4gZXhhbXBsZSBpcyBhcHBseWluZyBtaXNzaW5nIGZpZWxkcyB0aGF0IHdlcmUgcXVlcmllZC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IHBlcnNlcnZlQ2hhbmdlcyBEb2VzIG5vdCBvdmVyd3JpdGUgY2hhbmdlZCBmaWVsZHMuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHNldERhdGE6IGZ1bmN0aW9uIChkYXRhLCBwZXJzZXJ2ZUNoYW5nZXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3JpZ2luYWxEYXRhID0gdGhpcy4kbWV0YSgpLm9yaWdpbmFsRGF0YTtcbiAgICAgICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGRhdGEpO1xuICAgICAgICAgICAgICAgIHZhciBwcm9wTmFtZTtcblxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBwcm9wTmFtZSA9IGtleXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wTmFtZSAhPT0gXCIkbWV0YVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBlcnNlcnZlQ2hhbmdlcyB8fCAoIXRoaXMuaGFzT3duUHJvcGVydHkocHJvcE5hbWUpIHx8IG9yaWdpbmFsRGF0YVtwcm9wTmFtZV0gPT09IHRoaXNbcHJvcE5hbWVdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IGRvaW5nIGEgZGVlcCBjb3B5IHRvIHN1cHBvcnQgY29tcGxleCBvYmplY3RzLiAgTmVlZCB0byBvcHRpbWl6ZSB0aGlzLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNbcHJvcE5hbWVdID0gYW5ndWxhci5jb3B5KGRhdGFbcHJvcE5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsRGF0YVtwcm9wTmFtZV0gPSBkYXRhW3Byb3BOYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGZvckVhY2hDaGlsZDogZnVuY3Rpb24gKGZ1bmMpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBjb2xzID0gdGhpcy4kbWV0YSgpLmNvbGxlY3Rpb25DYWNoZTtcbiAgICAgICAgICAgICAgICB2YXIgc3RvcCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBzdG9wRm4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3AgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKGNvbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoY29scykuc29tZShmdW5jdGlvbiAoY29sTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGZ1bmMoY29sc1tjb2xOYW1lXSwgc3RvcEZuKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc3RvcDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBSZXZlcnRzIGFueSBjbGllbnQgc2lkZSBjaGFuZ2VzIHRvIGFuIGl0ZW0uXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHJldmVydENoYW5nZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldERhdGEodGhpcy4kbWV0YSgpLm9yaWdpbmFsRGF0YSk7XG4gICAgICAgICAgICAgICAgdGhpcy5mb3JFYWNoQ2hpbGQoZnVuY3Rpb24gKGNvbCkge1xuICAgICAgICAgICAgICAgICAgICBjb2wucmV2ZXJ0Q2hhbmdlcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHRoaXMuZW1pdChcImRpZFJldmVydENoYW5nZXNcIiwgdGhpcyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERldGVybWluZXMgaWYgdGhlIGl0ZW0gaGFzIGNoYW5nZXMuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBoYXNDaGFuZ2VzOiBmdW5jdGlvbiAoaW5jbHVkZUNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZWQgPSAhYW5ndWxhci5lcXVhbHModGhpcy5nZXREYXRhKCksIHRoaXMuJG1ldGEoKS5vcmlnaW5hbERhdGEpO1xuICAgICAgICAgICAgICAgIGlmICghY2hhbmdlZCAmJiBpbmNsdWRlQ2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mb3JFYWNoQ2hpbGQoZnVuY3Rpb24gKGNvbCwgc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlZCA9IGNvbC5oYXNDaGFuZ2VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBjaGFuZ2VkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBRdWVyeSBleHRyYSBmaWVsZHMgb3Igb3RoZXIgaW5mb3JtYXRpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtc1xuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBwcm9taXNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIHF1ZXJ5OiBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRtZXRhKCkuY29sbGVjdGlvbi5xdWVyeUl0ZW0odGhpcywgcGFyYW1zKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2F2ZSB0aGUgaXRlbS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge09iamVjdH0gcHJvbWlzZVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzYXZlOiBmdW5jdGlvbiAocGVyc2lzdCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuICAgICAgICAgICAgICAgIHRoaXMuJG1ldGEoKS5jb2xsZWN0aW9uLnNhdmVJdGVtKHRoaXMsIHBlcnNpc3QgfHwgZmFsc2UpLnRoZW4oZnVuY3Rpb24gKGl0ZW0sIHRlbXBTYXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRtZXRhKCkudW5zYXZlZCA9IHRlbXBTYXZlO1xuICAgICAgICAgICAgICAgICAgICBpdGVtLmVtaXQoXCJkaWRTYXZlXCIsIGl0ZW0sIGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHByb21pc2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogSWYgdGhlIGl0ZW0gaXMgdGVybXBvcmFyaWx5IHNhdmVkIGluIHRoZSBjb2xsZWN0aW9uLCBub3QgdGhlIGFjdHVhbCBwZXJzaXN0ZW50IHN0b3JlLFxuICAgICAgICAgICAgICogaXQgcmV0dXJucyBmYWxzZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzU2F2ZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIXRoaXMuJG1ldGEoKS51bnNhdmVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBUaGUgaXRlbSBoYXMgYmVlbiBkZWxldGVkLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgaXNEZWxldGVkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJG1ldGEoKS5kZWxldGVkO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlmIHRoZSBpdGVtIGV4aXN0cyBpbiB0aGUgcGVyc2lzdGVudCBzdG9yZS5cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59IFRydWUgaWYgaXQgaGFzIGJlZW4gcGVyc2lzdGVkLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBleGlzdHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgaWRQcm9wZXJ0eSA9IHRoaXMuJG1ldGEoKS5jb2xsZWN0aW9uLmlkUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0cmluZyh0aGlzW2lkUHJvcGVydHldKS5zZWFyY2goXCJ0ZW1wXCIpICE9PSAwICYmICF0aGlzLmlzRGVsZXRlZCgpICYmIHRoaXMuaXNTYXZlZCgpICYmIHRoaXNbaWRQcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCAmJiB0aGlzW2lkUHJvcGVydHldICE9PSBudWxsO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWxldGVzIHRoZSBpdGVtLlxuICAgICAgICAgICAgICogQHJldHVybiB7T2JqZWN0fSBwcm9taXNlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIFwiZGVsZXRlXCI6IGZ1bmN0aW9uIChwZXJzaXN0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRtZXRhKCkuY29sbGVjdGlvbi5kZWxldGVJdGVtKHRoaXMsIHBlcnNpc3QgfHwgZmFsc2UpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRtZXRhKCkudW5zYXZlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBzZWxmLiRtZXRhKCkuZGVsZXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIERlbGV0ZXMgdGhlIGl0ZW0uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtPYmplY3R9IHByb21pc2VcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcmVtb3ZlOiBmdW5jdGlvbiAocGVyc2lzdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzW1wiZGVsZXRlXCJdKHBlcnNpc3QpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTZWxlY3RzIHRoZSBpdGVtLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzZWxlY3Q6IGZ1bmN0aW9uIChkZXNlbGVjdE90aGVycykge1xuICAgICAgICAgICAgICAgIHRoaXMuJG1ldGEoKS5jb2xsZWN0aW9uLnNlbGVjdEl0ZW0odGhpcywgZGVzZWxlY3RPdGhlcnMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlmIHRoZSBpdGUgIGlzIHdpdGhpbiBhbiBpdGVtIGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtJdGVtQ29sbGVjdGlvbn0gIGNvbGxlY3Rpb25cbiAgICAgICAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGlzSW46IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJG1ldGEoKS5jb2xsZWN0aW9uID09PSBjb2xsZWN0aW9uO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBHZXRzIGEgY2hpbGQgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge1N0cmluZ3xPYmplY3R9IG5hbWVPckNvbmZpZyBFaXRoZXIgdGhlIG5hbWUgb2YgdGhlIGNoaWxkIGRhdGFcbiAgICAgICAgICAgICAqIHNvdXJjZSBvciBhIGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBjaGlsZCBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICogQHJldHVybiB7SXRlbUNvbGxlY3Rpb259XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGNoaWxkOiBmdW5jdGlvbiAobmFtZU9yQ29uZmlnKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVzZXJDb25maWcgPSBhbmd1bGFyLmlzU3RyaW5nKG5hbWVPckNvbmZpZykgPyB7IG5hbWU6IG5hbWVPckNvbmZpZyB9IDogbmFtZU9yQ29uZmlnO1xuICAgICAgICAgICAgICAgIHZhciBtZXRhID0gdGhpcy4kbWV0YSgpO1xuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gbWV0YS5jb2xsZWN0aW9uO1xuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uQ2FjaGUgPSBtZXRhLmNvbGxlY3Rpb25DYWNoZTtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGRNYXBwZXIgPSBjb2xsZWN0aW9uLmNoaWxkcmVuIHx8IHt9O1xuICAgICAgICAgICAgICAgIHZhciBtYXBwZXJDb25maWc7XG5cbiAgICAgICAgICAgICAgICBpZiAoIWNvbGxlY3Rpb25DYWNoZSkge1xuICAgICAgICAgICAgICAgICAgICBjb2xsZWN0aW9uQ2FjaGUgPSBtZXRhLmNvbGxlY3Rpb25DYWNoZSA9IHt9O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChjb2xsZWN0aW9uQ2FjaGVbdXNlckNvbmZpZy5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbkNhY2hlW3VzZXJDb25maWcubmFtZV07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkTWFwcGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcHBlckNvbmZpZyA9IGNoaWxkTWFwcGVyW3VzZXJDb25maWcubmFtZV0gfHwge307XG4gICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHVzZXJDb25maWcsIGFuZ3VsYXIuaXNTdHJpbmcobWFwcGVyQ29uZmlnKSA/IHsgZGF0YVNvdXJjZTogbWFwcGVyQ29uZmlnIH0gOiBtYXBwZXJDb25maWcpO1xuICAgICAgICAgICAgICAgICAgICB1c2VyQ29uZmlnLml0ZW1zID0gdGhpc1t1c2VyQ29uZmlnLm5hbWVdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHVzZXJDb25maWcgPSBhbmd1bGFyLmlzU3RyaW5nKG5hbWVPckNvbmZpZykgPyB7IGRhdGFTb3VyY2U6IG5hbWVPckNvbmZpZyB9IDogbmFtZU9yQ29uZmlnO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBjb25maWcgPSBhbmd1bGFyLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgICAgIHNhdmVXaXRoUGFyZW50OiBjb2xsZWN0aW9uLnNhdmVDaGlsZHJlbixcbiAgICAgICAgICAgICAgICAgICAgc2F2ZUNoaWxkcmVuOiBjb2xsZWN0aW9uLnNhdmVDaGlsZHJlblxuICAgICAgICAgICAgICAgIH0sIHVzZXJDb25maWcpO1xuXG4gICAgICAgICAgICAgICAgY29uZmlnLnBhcmVudEl0ZW0gPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBkYXRhU291cmNlID0gY29uZmlnLmRhdGFTb3VyY2UgPSBjb2xsZWN0aW9uLmRhdGFTb3VyY2UuY2hpbGQoY29uZmlnLmRhdGFTb3VyY2UpO1xuICAgICAgICAgICAgICAgIGRhdGFTb3VyY2Uuc2V0UGFyZW50SXRlbSh0aGlzKTtcblxuICAgICAgICAgICAgICAgIHZhciBjaGlsZENvbGxlY3Rpb24gPSBjb2xsZWN0aW9uQ2FjaGVbdXNlckNvbmZpZy5uYW1lXSA9IG5ldyBJdGVtQ29sbGVjdGlvbihjb25maWcpO1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZENvbGxlY3Rpb247XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzYXZlQ2hpbGRyZW46IGZ1bmN0aW9uIChzYXZlT3JpZ2luYWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLmFsbCh0aGlzLmZvckVhY2hDaGlsZChmdW5jdGlvbiAoY29sKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbC5kYXRhU291cmNlLnNldFBhcmVudEl0ZW0oc2VsZik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb2wuc2F2ZUNoYW5nZXMoc2F2ZU9yaWdpbmFsKTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnXG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBJdGVtQ29sbGVjdGlvbiAoY29uZmlnKSB7XG4gICAgICAgICAgICBhbmd1bGFyLmV4dGVuZCh0aGlzLCBhbmd1bGFyLmV4dGVuZCh7XG4gICAgICAgICAgICAgICAgc2F2ZVdpdGhQYXJlbnQ6IGZhbHNlXG4gICAgICAgICAgICB9LCBjb25maWcpKTtcblxuICAgICAgICAgICAgdGhpcy5kYXRhU291cmNlID0gYW5ndWxhci5pc1N0cmluZyhjb25maWcuZGF0YVNvdXJjZSkgPyBkYXRhU291cmNlKGNvbmZpZy5kYXRhU291cmNlKSA6IGNvbmZpZy5kYXRhU291cmNlO1xuICAgICAgICAgICAgdGhpcy5pZFByb3BlcnR5ID0gdGhpcy5kYXRhU291cmNlLmlkUHJvcGVydHk7XG5cbiAgICAgICAgICAgIHZhciBwYXJlbnRJdGVtID0gdGhpcy5wYXJlbnRJdGVtO1xuICAgICAgICAgICAgaWYgKHBhcmVudEl0ZW0pIHtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgcGFyZW50SXRlbS5vbihcImRpZFJldmVydENoYW5nZXNcIiwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5yZXZlcnRDaGFuZ2VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNldHVwIGluaXRpYWwgaXRlbSBzdG9yZS5cbiAgICAgICAgICAgIHRoaXMuc2V0SXRlbXModGhpcy5pdGVtcyB8fCBbXSk7XG4gICAgICAgIH1cblxuICAgICAgICBJdGVtQ29sbGVjdGlvbi5wcm90b3R5cGUgPSBhbmd1bGFyLmV4dGVuZChldmVudGFibGUoKSwge1xuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEdldHMgdGhlIEl0ZW1Db2xsZWN0aW9uJ3MgZGF0YSBzb3VyY2UuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtEYXRhU291cmNlfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBnZXREYXRhU291cmNlOiBmdW5jdGlvbiAocGVyc2lzdCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwZXJzaXN0IHx8IChwZXJzaXN0ID09PSB1bmRlZmluZWQgJiYgdGhpcy5fY2FuU2F2ZSgpKSA/IHRoaXMuZGF0YVNvdXJjZSA6IHRoaXMudGVtcERhdGFTb3VyY2U7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFJlZnJlc2ggdGhlIGl0ZW1zIGluIHRoZSBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0W119IGl0ZW1EYXRhTGlzdCBBbiBhcnJheSBvZiByYXcgZGF0YSBmb3IgdGhlIGl0ZW1zLlxuICAgICAgICAgICAgICogQHJldHVybiB7SXRlbVtdfVxuICAgICAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgX3JlZnJlc2hJdGVtczogZnVuY3Rpb24gKGl0ZW1EYXRhTGlzdCwgb2xkSXRlbURhdGFMaXN0KSB7XG4gICAgICAgICAgICAgICAgb2xkSXRlbURhdGFMaXN0ID0gb2xkSXRlbURhdGFMaXN0IHx8IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtRGF0YUxpc3QubWFwKGZ1bmN0aW9uIChpdGVtRGF0YSwgaSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbUlkID0gKG9sZEl0ZW1EYXRhTGlzdFtpXSAmJiBvbGRJdGVtRGF0YUxpc3RbaV1bdGhpcy5pZFByb3BlcnR5XSkgfHwgaXRlbURhdGFbdGhpcy5pZFByb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3AgPSBpdGVtSWQgIT09IHVuZGVmaW5lZCAmJiBpdGVtSWQgIT09IG51bGwgJiYgdGhpcy5pdGVtU3RvcmUucmVhZChpdGVtSWQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IHJlc3AgJiYgcmVzcC5kYXRhO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXREYXRhKGl0ZW1EYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtSWQgIT09IGl0ZW1EYXRhW3RoaXMuaWRQcm9wZXJ0eV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLml0ZW1TdG9yZS5yZWZyZXNoSXRlbUlkKGl0ZW1JZCwgaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gb2xkSXRlbURhdGFMaXN0W2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gJiYgaXRlbS5pc0luICYmIGl0ZW0uaXNJbih0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2V0RGF0YShpdGVtRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy5hZGRJdGVtKGl0ZW0gfHwgaXRlbURhdGEpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZXRlcm1pbmVzIGlmIHRoZSBJdGVtQ29sbGVjdGlvbiBpcyBjdXJyZW50bHkgYWJsZSB0byBzYXZlLlxuICAgICAgICAgICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIF9jYW5TYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICF0aGlzLnNhdmVXaXRoUGFyZW50ICYmICghdGhpcy5wYXJlbnRJdGVtIHx8IHRoaXMucGFyZW50SXRlbS5leGlzdHMoKSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFZlcmlmeSB0aGUgaXRlbSBpcyB2YWxpZCBmb3IgdGhpcyBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICogQHBhcmFtICB7SXRlbX0gaXRlbVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBfdmVyaWZ5SXRlbTogZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoIWl0ZW0uaXNJbiB8fCAhaXRlbS5pc0luKHRoaXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRyaWVkIHRvIHBlcmZvcm0gYW4gYWN0aW9uIG9uIGl0ZW0gdGhhdCBpcyBub3Qgd2l0aGluIHRoZSBjb2xsZWN0aW9uLlwiKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uaXNEZWxldGVkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVHJpZWQgdG8gcGVyZm9ybSBhbiBhY3Rpb24gb24gaXRlbSB0aGF0IGlzIGRlbGV0ZWQuXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkIGFuIGl0ZW0gdG8gdGhlIGNvbGxlY3Rpb24uICBJZiBpdCBpcyBhbHJlYWR5IGFuIGl0ZW0gZnJvbVxuICAgICAgICAgICAgICogYSBuZXcgY29sbGVjdGlvbiwgaXQgd2lsbCBiZSBjb3BpZWQgaW50byB0aGUgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7SXRlbXxPYmplY3R9IGl0ZW1EYXRhXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGFkZEl0ZW06IGZ1bmN0aW9uIChpdGVtRGF0YSkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gaXRlbURhdGEuaXNJbiAmJiBpdGVtRGF0YS5pc0luKHRoaXMpICYmICFpdGVtRGF0YS5pc0RlbGV0ZWQoKSAmJiBpdGVtRGF0YTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtU3RvcmUuY3JlYXRlKFwiXCIsIG51bGwsIGl0ZW0gfHwgdGhpcy5jcmVhdGVJdGVtKGl0ZW1EYXRhKSkuZGF0YTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQWRkcyBhIGxpc3Qgb2YgaXRlbXMgdG8gdGhlIGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0ge0l0ZW1bXXxPYmplY3RbXX0gaXRlbXNcbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgYWRkSXRlbXM6IGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtcy5tYXAoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWRkSXRlbShpdGVtKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHNldEl0ZW1zOiBmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVmcmVzaEl0ZW1zKGl0ZW1zKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogQ2xlYXIgdGhlIGNvbGxlY3Rpb24sIHJlZnJlc2hpbmcgdGhlIGludGVybmFsIHN0b3JlLlxuICAgICAgICAgICAgICogVGhpcyByZW1vdmVzIGFsbCBpdGVtcyBhbmQgdGhlaXIgY2hhbmdlcyBmcm9tIHRoZSBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlZEl0ZW1zID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW1TdG9yZSA9IHRoaXMuaXRlbVN0b3JlID0gYXJyYXlTdG9yZSh7XG4gICAgICAgICAgICAgICAgICAgIHNhbml0aXplOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgYXJyYXk6IFtdLFxuICAgICAgICAgICAgICAgICAgICBnZXRJZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmZha2VVaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZha2VVaWQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5mYWtlVWlkICs9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0ZW1wX1wiICsgdGhpcy5mYWtlVWlkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy50ZW1wRGF0YVNvdXJjZSA9IGRhdGFTb3VyY2UuY3JlYXRlRGF0YVNvdXJjZShmdW5jdGlvbiAoY29uZmlndXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ3VyYXRvci5zZXRTdG9yZShpdGVtU3RvcmUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmV2ZXJ0Q2hhbmdlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbVN0b3JlLmFycmF5LmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5yZXZlcnRDaGFuZ2VzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kZWxldGVkSXRlbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEl0ZW0oaXRlbS5nZXREYXRhKCkpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRoaXMuZGVsZXRlZEl0ZW1zLnNwbGljZSgwLCB0aGlzLmRlbGV0ZWRJdGVtcy5sZW5ndGgpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgaGFzQ2hhbmdlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2VkID0gdGhpcy5kZWxldGVkSXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmICghY2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VkID0gdGhpcy5pdGVtU3RvcmUuYXJyYXkuc29tZShmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0uaGFzQ2hhbmdlcyh0cnVlKTtcblxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoYW5nZWQ7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFF1ZXJ5IGl0ZW1zIGZyb20gdGhlIGRhdGEgc291cmNlIHRvIHBvcHVsYXRlIHRoZSBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBbcGFyYW1zXSAgcGFyYW1ldGVycyBmb3IgdGhlIHF1ZXJ5LlxuICAgICAgICAgICAgICogQHBhcmFtICB7Qm9vbGVhbn0gcmVwbGFjZSBDbGVhcnMgdGhlIGN1cnJlbnQgaXRlbXMgaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBxdWVyeTogZnVuY3Rpb24gKHBhcmFtcywgcmVwbGFjZSkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KFwid2lsbFF1ZXJ5XCIsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLnBhcmVudEl0ZW0gfHwgdGhpcy5wYXJlbnRJdGVtLmV4aXN0cygpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGF0YVNvdXJjZS5xdWVyeShwYXJhbXMpLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXBsYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5jbGVhcigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcCA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCByZXNwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3AuZGF0YSA9IHNlbGYuX3JlZnJlc2hJdGVtcyhyZXNwLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zZXJ2ZXJUb3RhbCA9IHJlc3AudG90YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc3ApO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KFwiZGlkUXVlcnlcIiwgc2VsZik7XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLmVtaXQoXCJkaWRRdWVyeVwiLCBzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShzZWxmKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIFNhdmVzIGFsbCB0aGUgY2hhbmdlcyB3aXRoaW4gdGhlIGl0ZW0gY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge0Jvb2xlYW59IHNhdmVPcmlnaW5hbCBJZiB0cnVlLCB0aGUgb3JpZ2luYWwgZGF0YSBvZiBpdGVtcyBhcmUgc2F2ZWQuXG4gICAgICAgICAgICAgKiBUaGlzIGlzIGZvciBjYXNlcyBpbiB3aGljaCBhbiBpdGVtIHdhcyBhcnRpZmljaWFsbHkgc2F2ZWQgY2xpZW50IHNpZGUsIGJ1dCBoYXNcbiAgICAgICAgICAgICAqIG5vdCB5ZXQgYmVlbiBwZXJzaXN0ZWQuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzYXZlQ2hhbmdlczogZnVuY3Rpb24gKHNhdmVPcmlnaW5hbCkge1xuICAgICAgICAgICAgICAgIHZhciBpZFByb3BlcnR5ID0gdGhpcy5pZFByb3BlcnR5O1xuICAgICAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHZhciBzYXZlZEl0ZW1zID0gW107XG4gICAgICAgICAgICAgICAgdmFyIHByb21pc2VzID0gW107XG5cbiAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbXMgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3SXRlbXNXaXRoSWRzID0gW107XG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZWRJdGVtcyA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBkZWxldGVkSXRlbXMgPSB0aGlzLmRlbGV0ZWRJdGVtcztcblxuICAgICAgICAgICAgICAgIC8vIEZpbmQgYWxsIHRoZSBpdGVtcyB0aGF0IGhhdmUgY2hhbmdlZCBvciBoYXZlIGJlZW4gZGVsZXRlZC5cbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1TdG9yZS5hcnJheS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaXRlbS5leGlzdHMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbXMucHVzaChpdGVtLmdldERhdGEoc2F2ZU9yaWdpbmFsKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtc1dpdGhJZHMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLmhhc0NoYW5nZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzYXZlT3JpZ2luYWwgfHwgIWl0ZW0uaXNTYXZlZCgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlZEl0ZW1zLnB1c2goaXRlbS5nZXREYXRhKHNhdmVPcmlnaW5hbCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoXCJ3aWxsU2F2ZUNoYW5nZXNcIiwgbmV3SXRlbXMuY29uY2F0KGNoYW5nZWRJdGVtcyksIGRlbGV0ZWRJdGVtcyk7XG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgb3BlcmF0aW9uLlxuICAgICAgICAgICAgICAgIGlmIChuZXdJdGVtcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLmRhdGFTb3VyY2UuY3JlYXRlKG5ld0l0ZW1zKS50aGVuKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlZEl0ZW1zID0gc2F2ZWRJdGVtcy5jb25jYXQoc2VsZi5fcmVmcmVzaEl0ZW1zKHJlc3AuZGF0YSwgbmV3SXRlbXNXaXRoSWRzKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIG9wZXJhdGlvbi5cbiAgICAgICAgICAgICAgICBpZiAoY2hhbmdlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuZGF0YVNvdXJjZS51cGRhdGUoY2hhbmdlZEl0ZW1zKS50aGVuKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlZEl0ZW1zID0gc2F2ZWRJdGVtcy5jb25jYXQoc2VsZi5fcmVmcmVzaEl0ZW1zKHJlc3AuZGF0YSwgY2hhbmdlZEl0ZW1zKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRGVsZXRlIG9wZXJhdGlvbi5cbiAgICAgICAgICAgICAgICBpZiAoZGVsZXRlZEl0ZW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMuZGF0YVNvdXJjZVtcImRlbGV0ZVwiXShkZWxldGVkSXRlbXMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUGVyZm9ybSBvcGVyYXRpb25zXG4gICAgICAgICAgICAgICAgJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHEuYWxsKHNlbGYuaXRlbVN0b3JlLmFycmF5Lm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0uc2F2ZUNoaWxkcmVuKHNhdmVPcmlnaW5hbCk7XG4gICAgICAgICAgICAgICAgICAgIH0pKS50aGVuKGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHNhdmVkSXRlbXMsIGRlbGV0ZWRJdGVtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmVtaXQoXCJkaWRTYXZlQ2hhbmdlc1wiLCBzYXZlZEl0ZW1zLCBkZWxldGVkSXRlbXMpO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBRdWVyeSB1bmZldGNoZWQgZmllbGRzIG9mIGFuIGl0ZW0gZnJvbSB0aGUgZGF0YSBzb3VyY2UuXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtJdGVtfSBpdGVtXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9IHBhcmFtc1xuICAgICAgICAgICAgICogQHJldHVybiB7UHJvbWlzZX1cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgcXVlcnlJdGVtOiBmdW5jdGlvbiAoaXRlbSwgcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkUHJvcGVydHkgPSB0aGlzLmlkUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5pc0luKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX3ZlcmlmeUl0ZW0oaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KFwid2lsbFF1ZXJ5SXRlbVwiLCBpdGVtLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIHBhcmFtcyA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgIHBhcmFtc1tpZFByb3BlcnR5XSA9IGl0ZW1baWRQcm9wZXJ0eV07XG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhU291cmNlLmdldChwYXJhbXMpLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0uaXNJbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXREYXRhKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gc2VsZi5hZGRJdGVtKHJlc3AuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KFwiZGlkUXVlcnlJdGVtXCIsIGl0ZW0sIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBTYXZlIGFuIGl0ZW0gaW4gdGhlIGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtJdGVtfSBpdGVtXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBzYXZlSXRlbTogZnVuY3Rpb24gKGl0ZW0sIHBlcnNpc3QpIHtcbiAgICAgICAgICAgICAgICB2YXIgZGF0YVNvdXJjZSA9IHRoaXMuZ2V0RGF0YVNvdXJjZShwZXJzaXN0KTtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIHByb21pc2VzID0gW107XG5cbiAgICAgICAgICAgICAgICB0aGlzLl92ZXJpZnlJdGVtKGl0ZW0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KFwid2lsbFNhdmVJdGVtXCIsIGl0ZW0pO1xuICAgICAgICAgICAgICAgIGlmIChpdGVtLmhhc0NoYW5nZXMoKSkge1xuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKGRhdGFTb3VyY2Uuc2F2ZShpdGVtLmdldERhdGEoKSkudGhlbihmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcmVmcmVzaEl0ZW1zKFtyZXNwLmRhdGFdLCBbaXRlbV0pO1xuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gJHEuYWxsKHByb21pc2VzKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLmFsbChwZXJzaXN0ID8gW2l0ZW0uc2F2ZUNoaWxkcmVuKCldIDogW10pLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImRpZFNhdmVJdGVtXCIsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBEZWxldGUgYW4gaXRlbSBpbiB0aGUgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAqIEBwYXJhbSAge0l0ZW19IGl0ZW1cbiAgICAgICAgICAgICAqIEByZXR1cm4ge1Byb21pc2V9XG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGRlbGV0ZUl0ZW06IGZ1bmN0aW9uIChpdGVtLCBwZXJzaXN0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkUHJvcGVydHkgPSB0aGlzLmlkUHJvcGVydHk7XG4gICAgICAgICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgICAgICAgICB0aGlzLl92ZXJpZnlJdGVtKGl0ZW0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5lbWl0KFwid2lsbERlbGV0ZUl0ZW1cIiwgaXRlbSk7XG4gICAgICAgICAgICAgICAgdGhpcy5nZXREYXRhU291cmNlKHBlcnNpc3QpW1wiZGVsZXRlXCJdKGl0ZW0uZ2V0RGF0YShmYWxzZSwgdHJ1ZSkpLnRoZW4oZnVuY3Rpb24gKHJlc3ApIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pdGVtU3RvcmVbXCJkZWxldGVcIl0oJycsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBjYWNoZSBkZWxldGVkIGl0ZW1zIHRvIHByb3Blcmx5IGRlbGV0ZSBsYXRlci5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0uZXhpc3RzKCkgJiYgKHBlcnNpc3QgPT09IGZhbHNlIHx8ICFzZWxmLl9jYW5TYXZlKCkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmRlbGV0ZWRJdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLnNlbGVjdGVkSXRlbSA9PT0gaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5zZWxlY3RJdGVtKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImRpZERlbGV0ZUl0ZW1cIiwgaXRlbSk7XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqXG4gICAgICAgICAgICAgKiBDcmVhdGUgYSBuZXcgaXRlbS4gIFRoaXMgaXRlbSBpcyBub3QgeWV0IGFkZGVkIHRvXG4gICAgICAgICAgICAgKiB0aGUgY29sbGVjdGlvbi4gIFRvIGF1dG9tYXRpY2FsbHkgYWRkIGEgbmV3IGl0ZW0sXG4gICAgICAgICAgICAgKiB5b3UgY2FuIHVzZSBhZGRJdGVtLCB3aGljaCBhbHNvIHRha2VzIGFyYnJpdGFyeSBkYXRhLlxuICAgICAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSBkYXRhXG4gICAgICAgICAgICAgKiBAcGFyYW0gIHtCb29sZWFufSBzZWxlY3QgU2VsZWN0IHRoZSBpdGVtIGFmdGVyIGl0IGhhcyBiZWVuIGNyZWF0ZWQuXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtJdGVtfVxuICAgICAgICAgICAgICovXG4gICAgICAgICAgICBjcmVhdGVJdGVtOiBmdW5jdGlvbiAoZGF0YSwgc2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBuZXcgSXRlbShkYXRhLCB0aGlzKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc2VsZWN0KHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHNlbGVjdEl0ZW06IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpdGVtIHx8IGl0ZW0uaXNJbih0aGlzKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZSA9IHRoaXMuZW1pdChcIndpbGxTZWxlY3RJdGVtXCIsIGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWUuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3RlZEl0ZW0gPSBpdGVtO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW1pdChcImRpZFNlbGVjdEl0ZW1cIiwgaXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoaW5kZXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXNOYU4oaW5kZXgpID8gdGhpcy5nZXRBbGwoKSA6IHRoaXMuaXRlbVN0b3JlLmFycmF5W2luZGV4XTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGdldEFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1TdG9yZS5hcnJheTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNvdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVN0b3JlLmFycmF5Lmxlbmd0aDtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHZhbHVlT2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtU3RvcmUuYXJyYXkudmFsdWVPZigpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdG9TdHJpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtU3RvcmUuYXJyYXkudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBJdGVtQ29sbGVjdGlvbihjb25maWcpO1xuICAgICAgICB9O1xuICAgIH1dO1xuXG59XSk7XG5cbm1vZHVsZS5leHBvcnRzID0gXCJhdHNpZC5kYXRhLml0ZW1Db2xsZWN0aW9uXCI7XG4iXX0=
