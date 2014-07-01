angular.module("atsid.namedError", []).provider("namedError", function () {

    this.$get = function () {
        return function (name, defaultMessage) {
            var ErrorCtr = function (name, message) {
                this.name = name;
                this.message = message || defaultMessage;
            };
            ErrorCtr.prototype = Error.prototype;

            return ErrorCtr;
        };
    };

});
"use strict";

angular.module("atsid.eventable", []).provider("eventable", [function () {

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
"use strict";

angular.module("atsid.data.store", ["atsid.namedError", "atsid.eventable"]).provider("store", function () {

    this.$get = ["namedError", "eventable", function (namedError, eventable) {
        var errors = {
            NotImlementedError: namedError("NotImlementedError", "Not implemented"),
            NotFoundError: namedError("NotFoundError", "Not Found")
        };
        var storeFactory = function (config) {
            return eventable(angular.extend({

                config: {},

                read: function (url, query, data) {
                    throw new errors.NotImlementedError();
                },

                create: function (url, query, data) {
                    throw new errors.NotImlementedError();
                },

                update: function (url, query, data) {
                    throw new errors.NotImlementedError();
                },

                patch: function (url, query, data) {
                    throw new errors.NotImlementedError();
                },

                "delete": function (url, query, data) {
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


            }, config));

        };

        storeFactory.errors = errors;

        return storeFactory;
    }];

});
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
            throw new Error("Global http store defaults require a name.");
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

        HTTPStore.prototype = store({

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
                    data = this.getValueAtPath(paths.data, resp) || resp;

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
                    return self.parseResponse(method.toLowerCase(), config, resp.data);
                });
            },

            read: function (url, query, data) {
                return this.doRequest("GET", url, query, {}, data);
            },

            create: function (url, query, data) {
                return this.doRequest("POST", url, query, {}, data);
            },

            update: function (url, query, data) {
                return this.doRequest("PUT", url, query, {}, data);
            },

            patch: function (url, query, data) {
                return this.doRequest("PATCH", url, query, {}, data);
            },

            "delete": function (url, query, data) {
                return this.doRequest("DELETE", url, query, { "Content-Type": angular.isArray(data) ? "application/json" : null }, data);
            }

        });

        return function (config) {
            config = angular.isString(config) ? { name: config } : config || {};
            return new HTTPStore(config);
        };

    }];
}]);
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
                var item = path !== undefined && path !== null ? this.findItem(path) : angular.copy(this.array);
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

    this.$get = ["$q", "httpStore", "arrayStore", "eventable", "namedError", function ($q, httpStore, arrayStore, eventable, namedError) {
        var errors = {
            NotRootRouteError: namedError("NotRootRouteError", "Must be the root route to use this feature"),
            ParameterError: namedError("ParameterError", "Missing Parameter"),
            RouteNotFoundError: namedError("RouteNotFoundError", "The route does not exist")
        };

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

                var result = this.store[method](path || null, queryParams, item);
                if (result.then) {
                    result.then(function (resp) {
                        deferred.resolve(self._resolveRequest(method, path, queryParams, oldItems, result));
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
angular.module("atsid.data.itemCollection", [
    "atsid.eventable",
    "atsid.data"
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

            revertChanges: function () {
                this.setData(this.$meta().originalData);
                this.emit("didRevertChanges", this);
            },

            /**
             * Determines if the item has changes.
             * @return {Boolean}
             */
            hasChanges: function () {
                return !angular.equals(this.getData(), this.$meta().originalData);
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
            remove: function () {
                return this["delete"]();
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
                var collection = this.$meta().collection;
                var childMapper = collection.children || {};
                var userConfig = nameOrConfig;

                if (childMapper) {
                    if (angular.isString(nameOrConfig)) {
                        userConfig = childMapper[nameOrConfig];
                        if (angular.isString(userConfig)) {
                            userConfig = { dataSource: userConfig };
                        }
                        userConfig.childName = nameOrConfig;
                    } else {
                        userConfig = angular.extend(angular.copy(childMapper[nameOrConfig.childName]), nameOrConfig);
                    }
                    userConfig.items = this[userConfig.childName];
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
                return new ItemCollection(config);
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
                parentItem.on("didSave", function (e, item, wait) {
                    if (parentItem.exists()) {
                        wait(self.saveChanges(self.saveWithParent ? false : true));
                    }
                });
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
                        self._refreshItems(resp.data);
                        deferred.resolve(self);
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
                    if (item.hasChanges()) {
                        if (!saveOriginal || !item.isSaved()) {
                            if (item.exists()) {
                                changedItems.push(item.getData(saveOriginal));
                            } else {
                                newItems.push(item.getData(saveOriginal));
                                newItemsWithIds.push(item);
                            }
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
                    deferred.resolve(savedItems, deletedItems);
                    self.emit("didSaveChanges", savedItems, deletedItems);
                    savedItems.forEach(function (item) {
                        item.emit("didSave", item);
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

                if (!item.isIn) {
                    item = this.createItem(item);
                } else {
                    this._verifyItem(item);
                }

                this.emit("willQueryItem", item, params);
                params = angular.extend({}, params);
                params[idProperty] = item[idProperty];
                this.dataSource.get(params).then(function (resp) {
                    item.setData(resp.data);
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
                var idProperty = this.idProperty;
                var deferred = $q.defer();
                var self = this;

                this._verifyItem(item);

                this.emit("willSaveItem", item);
                if (item.hasChanges()) {
                    dataSource.save(item.getData()).then(function (resp) {
                        var items = self._refreshItems([resp.data], [item]);
                        deferred.resolve(items[0]);
                        self.emit("didSaveItem", items[0]);
                    }, function (err) {
                        deferred.reject(err);
                    });
                } else {
                    deferred.resolve(item);
                }

                return deferred.promise;
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