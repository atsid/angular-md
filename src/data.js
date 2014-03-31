"use strict";

/**
 * @ngdoc provider
 * @name atsid.data:dataSource
 *
 * @description
 * Represents a data source.
 */
angular.module("atsid.data",[
    "atsid.eventable",
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
                $: httpStore,
                http: httpStore,
                array: arrayStore
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

            // Things that can be inherited
            if (config.count) {
                route.count = config.count;
            }
            if (config.offset) {
                route.offset = config.offset;
            }

            // Things that must be inherited
            if (!parentRoute) {
                if (config.store) {
                    route.store = config.store;
                }
                route.nameToRoute = {};
                route.allowAutomaticRoutes = config.allowAutomaticRoutes;
            }

            if (config.name) {
                route.nameToRoute[config.name] = route;
            }

            if (config.routes) {
                angular.forEach(config.routes, function (routeConfig, path) {
                    if (!routeConfig.path) {
                        routeConfig.path = path;
                    } else {
                        routeConfig.name = path;
                    }

                    if (routeConfig.path.charAt(0) !== "/" && route.path) {
                        routeConfig.path = route.path + "/" + routeConfig.path;
                    }
                    route.addRoute(routeConfig);
                });
            }
            // Used for testing equality with instances of the same route.
            route._self = route;
            return route;
        }
        Route.prototype = eventable({

            /**
             * Add a new route.  This will add a permanent child route with
             * the configuration set as the default.
             * @param {Object} routeConfig
             */
            addRoute: function (routeConfig) {
                this._adding = true;
                var parentRoute = routeConfig.path ? this.getRouteByPath(routeConfig.path, true) : this;
                var route = new Route(routeConfig, parentRoute);
                parentRoute.routes[route.pathName] = route;
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
                    throw new Error("Cannot create route without a name or path.");
                }
                var route = this.nameToRoute[routeConfig.name] || this.getRouteByPath(routeConfig.path || routeConfig.name);
                if (!route) {
                    if(this.allowAutomaticRoutes) {
                        route = new Route(routeConfig, this);
                    } else {
                        throw new Error("Route \"" + (routeConfig.path || routeConfig.name) + "\" does not exist.");
                    }
                }
                return route.getInstance(routeConfig);
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
                            currentRoute = undefined;
                            return false;
                        }
                    }
                    route = currentRoute;
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
            },

            /**
             * Get all the path params, including the current route's form
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
                    pathParams[pc.param] = params[pc.param] || (parent.currentItem && parent.currentItem[parent.idProperty]);
                    parent = parent.getParent();
                    i -= 1;
                    pc = pcs[i];
                }

                return pathParams;
            },

            setItem: function (item) {
                this.currentItem = item;
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
                instance.config = angular.extend(angular.copy(this.config), config);
                return angular.extend(instance, config || {});
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
             * Returns the url of the route.
             * @param  {Object} pathParams
             * @param  {Object} queryParams
             * @return {String}
             */
            getUrl: function (pathParams, queryParams) {
                var url = this.getPath(pathParams);
                return this.store.buildUrl(url, queryParams || {});
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
            isSame: function (otherDataSource) {
                return otherDataSource._self === this._self;
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
                var deferred = $q.defer();
                if (!tMap) {
                    tMap = this.transformerMap = {};
                    (this.transformers || []).forEach(function (transformer) {
                        var tList = tMap[transformer.type] = tMap[transformer.type] || [];
                        tList.push(transformer);
                    });
                }

                var tList = tMap[type];
                if (tList && newItems) {
                    var nextTransform = function (i, items) {
                        var tDeferred = $q.defer();
                        var transformer = tList[i];
                        if (transformer) {
                            if (oldItems !== undefined) {
                                transformer.transform(items, oldItems, tDeferred);
                            } else {
                                transformer.transform(items, tDeferred);
                            }
                            tDeferred.promise.then(function (items) {
                                nextTransform(i + 1, items);
                            }, function (err) {
                                deferred.reject(err);
                            });
                        } else {
                            deferred.resolve(items);
                        }
                    };

                    nextTransform(0, newItems);

                } else {
                    deferred.resolve(newItems);
                }

                return deferred.promise;
            },

            /**
             * Helper method to perform CRUD requests.
             * @param  {String} method The crud method.
             * @param  {Object} params parameters to send with the method.
             * @param  {*} [item]   The item to send with the request.
             * @return {Object} A promise to handle the response.
             */
            doRequest: function (method, params, item) {
                var requestDeferred = $q.defer();
                var promise = requestDeferred.promise;
                var isArray = angular.isArray(item);
                var oldItems = !item || isArray ? item : [item];
                var self = this;

                params = angular.extend(angular.copy(this.params || {}), params || {});
                var path = this.getPath(params);
                var queryParams = this.getStoreParams(params);

                this.runTransformers("request", oldItems).then(function (transformedItem) {
                    var deferred = $q.defer();
                    if (transformedItem && !isArray) {
                        transformedItem = transformedItem[0];
                    }

                    deferred.promise.then(function (resp) {
                        var isArray = angular.isArray(resp.data);
                        var newItems = !resp.data || isArray ? resp.data : [resp.data];

                        self.runTransformers("response", newItems, oldItems || []).then(function (item) {
                            if (!isArray) {
                                item = item[0];
                            }
                            resp.data = item;
                            requestDeferred.resolve(resp);
                        }, function (err) {
                            requestDeferred.reject(err);
                        });
                    }, function (err) {
                        requestDeferred.reject(err);
                    });

                    self.store[method](path || null, queryParams, item, deferred);
                }, function (err) {
                    requestDeferred.reject(err);
                });
                return promise;
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
                var itemParam = item[this.idProperty] || item[this.pathParam];
                var params = {};
                if (itemParam) {
                    params[this.pathParam] = itemParam;
                }
                return this.doRequest("create", params, item);
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
                var promise;
                if (!angular.isArray(item)) {
                    params[this.idProperty] = item[this.idProperty];
                    promise = this.doRequest("delete", params);
                } else {
                    promise = this.doRequest("delete", params, item);
                }
                return promise;
            },

            /**
             * Same as delete, but doesn't have to be in square brackets to use.
             * @param  {*} item
             * @return {Object} promise
             */
            remove: function (item) {
                return this["delete"](item);
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
                var realRoute = this;

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
                    callMethod = function (methodName, args) {
                        var promise = addPromise(realRoute[methodName].apply(realRoute, args));

                        return createFakePromise(promise, function (oldPromise) {
                            promises.splice(promises.indexOf(promise), 1);
                        });
                    };

                var fakeRoute = this.getInstance({
                    query: function () {
                        return callMethod("query", arguments);
                    },
                    get: function () {
                        return callMethod("get", arguments);
                    },
                    create: function () {
                        return callMethod("create", arguments);
                    },
                    update: function () {
                        return callMethod("update", arguments);
                    },
                    save: function () {
                        return callMethod("save", arguments);
                    },
                    "delete": function () {
                        return callMethod("delete", arguments);
                    },
                    remove: function () {
                        return callMethod("delete", arguments);
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
            return routeConfig ? globalDataSource.child(routeConfig) : globalDataSource;
        };

        dataSource.createDataSource = function (configFunc) {
            var config = {};
            var configObj = dataSourceConfigurationFactory(config);

            configFunc.call(configObj, configObj);
            return new DataSource(config);
        };

        return dataSource;
    }];

}]);