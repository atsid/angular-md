describe('Service: dataSource', function () {
    beforeEach(module("atsid.data"));

    var ds;
    var httpMock;
    beforeEach(inject(function (dataSource, $httpBackend) {
        httpMock = $httpBackend;

        ds = dataSource.createDataSource(function() {
            this.setStoreUrl("api");
            this.addRoutes({

            });
        });
    }));

});