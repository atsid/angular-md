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