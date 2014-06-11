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
                this.$meta().collection.saveItem(this, persist).then(function (item, tempSave) {
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
                return !this.isDeleted() && this.isSaved() && this[idProperty] && String(this[idProperty]).search("temp") !== 0;
            },

            /**
             * Deletes the item.
             * @return {Object} promise
             */
            "delete": function () {
                var self = this;
                return this.$meta().collection.deleteItem(this).then(function () {
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
            getDataSource: function (real) {
                return real || this._canSave() ? this.dataSource : this.tempDataSource;
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
                    var resp = itemId && this.itemStore.read(itemId);
                    var item = resp && resp.data;
                    if (item) {
                        item.setData(itemData);
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
            deleteItem: function (item) {
                var idProperty = this.idProperty;
                var deferred = $q.defer();
                var self = this;

                this._verifyItem(item);

                this.emit("willDeleteItem", item);
                this.getDataSource()["delete"](item.getData(false, true)).then(function (resp) {
                    self.itemStore["delete"]('', item);
                    // cache deleted items to properly delete later.
                    if (item.exists() && !self._canSave()) {
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