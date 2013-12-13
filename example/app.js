angular.module('masterDetailApp', [
    'md'
]).controller('MasterCtrl', ['$scope', 'StaticDataSource', function ($scope, StaticDataSource) {
    var dataSource = new StaticDataSource({
            items: [{
                id: 1,
                name: "Bilbo Baggins",
                phoneNumber: "555-555-2935"
            }, {
                id: 2,
                name: "Thorin Oakenshield",
                phoneNumber: "555-555-2935"
            }, {
                id: 3,
                name: "Balin",
                phoneNumber: "555-555-2935"
            }, {
                id: 4,
                name: "Bifur",
                phoneNumber: "555-555-2935"
            }, {
                id: 5,
                name: "Bofur",
                phoneNumber: "555-555-2935"
            }, {
                id: 6,
                name: "Bombur",
                phoneNumber: "555-555-2935"
            }]
        });

    $scope.masterConfig = {
        dataSource: dataSource
    };

    dataSource.get().then(function (resp) {
        $scope.people = resp.data;
    });

    $scope.selectPerson = function (person) {
        $scope.$emit
    };

}]);