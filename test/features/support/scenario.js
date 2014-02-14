var selenium = require('selenium-standalone');
var protractor = require("protractor");
var _ = require("lodash");

var baseUrl = "http://localhost:9000";

var spawnOptions = {
    stdio: 'pipe'
};
var serverOptions = [

];
var serverAddress = "http://localhost:4444/wd/hub";

module.exports = function (scenarioFn) {

    return function () {
        var server = selenium(spawnOptions, serverOptions);
        var driver = new protractor.Builder().usingServer(serverAddress).withCapabilities(protractor.Capabilities.chrome()).build();
        var browser = protractor.wrapDriver(driver);
        _.extend(this, scenarioFn);

        scenarioFn.call(this, browser, browser.element, protractor.By);

        this.World = function (next) {
            this.visit = function (url) {
                return browser.get(baseUrl + url);
            };
            next();
        };

        this.Around(function (runScenario) {
            runScenario(function (next) {
                driver.quit(next);
            });
        });
    };
};