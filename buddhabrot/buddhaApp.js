(function() {
    "use strict";

    var BuddhaApp = angular.module('BuddhaApp', []);

    BuddhaApp.controller('BuddhaController', function($scope) {

        $scope.min_itr = 0;
        $scope.max_itr = 200;

        $scope.plots = 1000;
        $scope.colormap = 'monochrome';

        $scope.start = function() {
            var options = {
                plots: $scope.plots,
                min_itr: $scope.min_itr,
                max_itr: $scope.max_itr,
                colormap: $scope.colormap
            };
            console.log("starting...", options);
            window.scmBuddha.startBuddha(options);
        };

        $scope.stop = function() {
            console.log("stopping...");
            window.scmBuddha.stopBuddha();
        };

    });

})();