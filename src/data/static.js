'use strict';

/**
 * Provides a static data source abstraction.
 */
angular.module("md.data", []).factory("StaticDataSource", ['$q', '$timeout', function ($q, $timeout) {
        function crudDataSource (serviceParams, serviceLevel) {
            function createIdObj(id) {
                var obj = {};
                obj["id" + (serviceLevel || "")] = id;
                return obj;
            }

            var items = serviceParams.items || [],
                itemMap = {};

            items.forEach(function (item) {
                itemMap[item.id] = item;
            });

            function transform (resp) {
                if (serviceParams.transformResponse) {
                    return serviceParams.transformResponse(resp);
                }
                return resp;
            }

            function getItems(request) {
                var id = request.id;
                return angular.copy(id ? itemMap[id] : items);
            }

            return {
                serviceLevel: serviceLevel,
                get: function (idOrOptions) {
                    var options = angular.isObject(idOrOptions) ? idOrOptions : createIdObj(idOrOptions);
                    return this.query(options);
                },
                query: function (options) {
                    var deferred = $q.defer();
                    $timeout(function () {
                        var data = getItems(angular.extend(angular.copy(serviceParams), options));

                        if (data) {
                            deferred.resolve({
                                count: data.length,
                                total: data.length,
                                data: data
                            });
                        } else {
                            deferred.reject(new Error("404"));
                        }
                    });
                    return deferred.promise.then(transform);
                },
                "delete": function (item) {
                    var e = new Error("Cannot delete static items");
                    throw e;
                },
                save: function (item) {
                    var e = new Error("Cannot save static items");
                    throw e;
                },
                update: function (item) {
                    var e = new Error("Cannot update static items");
                    throw e;
                }
            };
        }
        return crudDataSource;
    }]);