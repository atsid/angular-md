var assert = require("assert");
var scenario = require("../support/scenario.js");

module.exports = scenario(function (browser, element, by) {
    var contactName;

    this.Given(/^I am viewing the contacts list$/, function(next) {
        this.visit("/").then(next);
    });

    this.When(/^I select the first contact in the list$/, function(next) {
        element.all(by.repeater("contact in contacts.getAll()")).then(function (rows) {
            var firstRow = rows[0].findElement(by.tagName("a"));
            firstRow.getText().then(function (text) {
                contactName = text;
                firstRow.click().then(next);
            });
        });
    });

    this.Then(/^I should see a detailed view of that contact$/, function (next) {
        element(by.model("selectedContact.name")).getAttribute("value").then(function (modelValue) {
            if (contactName === modelValue) {
                next();
            } else {
                throw "Expected " + contactName;
            }
        });
    });
});