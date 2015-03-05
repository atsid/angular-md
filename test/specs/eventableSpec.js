describe('Service: eventable', function () {
    var testMessage = "test";

    beforeEach(angular.mock.module(require("../../src/eventable")));

    it("should create a new eventable object", inject(function (eventable) {
        var eventableObject = eventable({});

        expect(typeof eventableObject).toBe("object");

        // Make sure the interfaces are addded correctly.
        expect(typeof eventableObject.on).toBe("function");
        expect(typeof eventableObject.emit).toBe("function");
    }));

    it("should add an event listener", inject(function (eventable) {
        var eventableObject = eventable({});
        expect(eventableObject.hasListeners(testMessage)).toBe(true);
    }));

    it("should emit an event", inject(function (eventable) {
        var eventableObject = eventable({
                test: function () { this.emit(testMessage); }
            });
        var fired = false;
        eventableObject.on(testMessage, function (e) { fired = true; });
        eventableObject.test();

        expect(fired).toBe(true);
    }));

    it("should prevent default event", inject(function (eventable) {
        var prevented;
        var eventableObject = eventable({
                test: function () {
                    var e = this.emit(testMessage);
                    prevented = !!e.defaultPrevented;
                }
            });
        eventableObject.on(testMessage, function (e) {
            e.preventDefault();
        });

        eventableObject.test();
        expect(prevented).toBe(true);
    }));

    it("should remove an event listener", inject(function (eventable) {
        var eventableObject = eventable({
                test: function () { this.emit(testMessage); }
            });
        var fired = false;
        var listener = eventableObject.on(testMessage, function () { fired = true; });

        // First, make sure it works
        eventableObject.test();
        expect(fired).toBe(true);
        fired = false;

        // Then remove it.
        listener.remove();
        eventableObject.test();
        expect(fired).toBe(false);
    }));

});