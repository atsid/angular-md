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
        if (scope) {
            this._userEventableScope = scope;
        } else {
            this._defaultEventableScope = this;
        }
    }

    Eventable.prototype = {
        _getEventableScope: function () {
            if (this._defaultEventableScope) {
                return this._defaultEventableScope;
            } else if (typeof this._userEventableScope === "string") {
                return this[this._userEventableScope];
            }
            return this._userEventableScope;
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
        },

        removeAllListeners: function () {

        }
    };


    this.$get = function () {
        return function (config, scope) {
            return new Eventable(config, scope);
        };
    };

}]);