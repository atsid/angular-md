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