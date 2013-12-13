/**
 * @ngdoc overview
 * @name md
 *
 * @description
 * Provides directives for the master/detail user interface design.
 * The princple is of a master view represented as a list, form, or tree
 * that provides limited information about a set of items.  When selecting
 * one of these items, a detail view would display the rest of the item's fields.
 *
 * To create this interface, you need a base "master-detail" element, with in it, you would
 * designate an element as a "master-view" and another as a "detail-view".  The master-view
 * typically handles the items' data source, while the detail view handles the manipulation of each
 * individual item and possible subitems.
 *
 * @example
 * Basic usage
 * <pre>
 *     <div master-detail>
 *         <div master-view="{ dataSource: 'itemDataSource' }">
 *             <ul><li ng-repeat="item in items"></li></ul>
 *         </div>
 *         <!-- detail view -->
 *         <div>
 *             <div> <span>Name</span> {{ selectedItem.name }} </div>
 *         </div>
 *     </div>
 * </pre>
 */
angular.module("md", ["md.data"])

/**
 * @ngdoc object
 * @name md:masterDetailProvider
 *
 * @description
 * Provides the configuration object for the master detail directive, allowing
 * the global defaults to be changed.
 */
.provider("masterDetail", function () {
    this.config = {
        defaults: {
            name: '',
            displayProperty: "name"
        }
    };
    this.$get = function () {
        return this.config;
    };
})

/**
 * @ngdoc directive
 * @name md:masterDetail
 *
 * @description
 * The `masterDetail` directive creates a controller that allows a master view to
 * communicate to 1 or more detail views through a data source object.
 *
 * Within the `masterView` directive, a config object would be set that contains a data source.
 * When the `masterView` sends an event to the `masterDetail` to select an item, it will read it
 * from the data source and send an event out to tell the detail views, while also setting the item
 * on to its scope.  Usually the master view would query the data source with a few of an item's fields
 * that it will display.  Only when the item is actually selected, would all the fields be queried.
 */
.directive("masterDetail", [function () {
    return {
        scope: true,
        controller: ["$scope", "masterDetail", /*"CrudDataSource",*/ function ($scope, masterDetail/*, CrudDataSource*/) {
            var self = this;
            /**
             * MasterDetail namespace for the scope.  All configuration
             * and the data source can be accessed from here.
             * @type {Object}
             */
            var md = $scope.md = {
                _ctrl: this
            };

            /**
             * Configuration for the master detail controller.
             * @type {Object}
             */
            var config;

            /**
             * Sets the master's configuration, such as the data source.
             * @param {Object} masterConfig
             */
            this.setMaster = function(masterConfig) {
                md.config = config = angular.extend(angular.copy(masterDetail.defaults), masterConfig || {});

                var dataSource = null;
                if (masterConfig !== null) {
                    dataSource = masterConfig.dataSource;
                    if (angular.isString(dataSource)) {
                        dataSource = new CrudDataSource({ serviceName: dataSource });
                    } else if (!angular.isObject(dataSource)) {
                        throw new Error("MasterDetailController requires a dataSource config property that is either the name of a CRUD service or a data source object.");
                    }
                }

                md.dataSource = dataSource;
                this.selectItem(null);
            };

            /**
             * Selects an item to be shown in the detail view.
             * @param {Object} item
             */
            this.selectItem = function (item) {
                item = item || null;
                $scope.selectedItem = item;
                $scope.$broadcast("masterDetailDidSelectItem", item);
            };

            /**
             * Gets an item from the data source
             * @param {String|Number} itemId The item's id to get
             */
            this.getItem = function(itemId) {
                var params = angular.extend({}, config.serviceParams || {});
                params[config.idProp || "id"] = itemId;

                md.dataSource.get(params).then(function (resp) {
                    var item = resp.data || resp,
                        e = $scope.$emit('masterDetailDidReadItem', config, item);
                    if (!e.defaultPrevented) {
                        self.selectItem(item);
                    }
                }, this.createErrorHandler("Could not load item."));
            };

            /**
             * Update the item.
             * @param {Object} item
             */
            this.updateItem = function(item) {
                return md.dataSource.update(item).then(function (resp) {
                    $scope.$emit('masterDetailDidUpdateItem', config, resp.data || resp);
                }, this.createErrorHandler("Could not save " + this.getDisplayProperty(item) + "."));
            };

            /**
             * Creates a new item.
             * @param {Object} item
             */
            this.createItem = function(item) {
                return md.dataSource.save(item).then(function (resp) {
                    var item = resp.data || resp,
                        e = $scope.$emit('masterDetailDidCreateItem', config, item);
                    if (!e.defaultPrevented) {
                        self.loadItem(item);
                    }
                }, this.createErrorHandler("Could not create " + this.getDisplayProperty(item) + "."));
            };

            /**
             * Deletes an item
             * @param {Object} item
             */
            this.deleteItem = function(item) {
                md.dataSource["delete"](item).then(function() {
                    var e = $scope.$emit('masterDetailDidDeleteItem', this, item);
                    if (!e.defaultPrevented && item === $scope.selectedItem) {
                        self.selectItem(null);
                    }
                }, this.createErrorHandler("Could not delete " + this.getDisplayProperty(item) + "."));
            };

            /**
             * Creates a handler that emits an event on error.
             * @param  {String} message The message to be sent with the error.
             * @return {Function}
             */
            this.createErrorHandler = function (message) {
                return function (e) {
                    $scope.$emit('masterDetailError', e, message);
                }
            };

            /**
             * Loads the selected item
             * @param  {[type]} itemId [description]
             * @return {[type]}        [description]
             */
            this.loadItem = function (itemId) {
                $scope.isNew = (itemId === "new");
                if ($scope.isNew) {
                    this.selectItem({});
                } else if (itemId) {
                    this.getItem(itemId);
                }
                $scope.$broadcast("masterDetailLoadingItem", itemId, $scope.isNew);
            };

            /**
             * Gets the display property of
             * @param  {[type]} item [description]
             * @return {[type]}      [description]
             */
            md.getDisplayProperty = function (item) {
                var displayProperty = config.displayProperty;
                return angular.isFunction(displayProperty) ? displayProperty(item) : item[displayProperty];
            };

            $scope.$on("masterDetailNewItem", function (e) {
                self.loadItem("new");
            });

            $scope.$on("masterDetailReadItem", function (evt, item) {
                if (!angular.isObject(item)) {
                    item = {
                        id: item
                    };
                };
                if (!$scope.selectedItem || $scope.selectedItem.id !== item.id) {
                    self.loadItem(item.id);
                }
            });

            $scope.$on("masterDetailSaveItem", function (evt, item) {
                item = item || $scope.selectedItem;
                if (item) {
                    self.deleteItem(item);
                }
            });

            $scope.$on("masterDetailDeleteItem", function (evt, item) {
                item = item || $scope.selectedItem;
                if (item) {
                    self.deleteItem(item);
                }
            });

            this.setMaster(null);

        }],
        link: function ($scope, element, attr, mdCtrl) {

        }
    };
}])
.directive("masterView", [function () {

    return {
        require: "^masterDetail",
        link: function ($scope, element, attr, mdCtrl) {
            mdCtrl.setMaster($scope.$eval(attr.masterView));
        }
    };

}]);