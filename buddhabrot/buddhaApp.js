(function() {
    "use strict";

    var BuddhaApp = angular.module('BuddhaApp', []);

    BuddhaApp.controller('BuddhaController', function($scope) {

        $scope.presets = {
            'quick': {
                text: "Quick",
                plots: 1,
                min_itr: 0,
                max_itr: 200,
                colormap: 'monochrome'
            },
            'deep': {
                text: "Deep",
                plots: 100,
                min_itr: 2000,
                max_itr: 20000,
                colormap: 'monochrome'
            },
            'deeper': {
                text: "Deeper",
                plots: 1000,
                min_itr: 10000,
                max_itr: 20000,
                colormap: 'monochrome'
            },
            'slow': {
                text: "Slow",
                plots: 10000,
                min_itr: 2000,
                max_itr: 20000,
                colormap: 'monochrome'
            }

        };


        $scope.min_itr = 0;
        $scope.max_itr = 200;

        $scope.plots = 100;
        // $scope.colormap = 'monochrome';

        var cm = $('#color-map');
        var presets = $('#preset-select2');

        $scope.running = false;

        $scope.start = function() {
            $scope.running = true;
            var options = {
                plots: $scope.plots,
                min_itr: $scope.min_itr,
                max_itr: $scope.max_itr,
                // colormap: $scope.colormap
                colormap: cm.select2('val')
            };
            console.log("starting...", options);
            window.scmBuddha.startBuddha(options);
        };

        $scope.stop = function() {
            $scope.running=false;
            console.log("stopping...");
            window.scmBuddha.stopBuddha();
        };

        window.scmBuddha.doneCallback = function() {
            $scope.running = false;
            $scope.$apply();
        };

        function applyPreset(p) {
            console.log({p: p});
            $scope.plots = p.plots;
            $scope.min_itr = p.min_itr;
            $scope.max_itr = p.max_itr;
            $scope.colormap = p.colormap;
        }

        cm.select2().on('change', function(e) {
            $scope.colormap = e.val;
            console.log("colormap change: ", $scope.colormap);
            window.scmBuddha.redraw($scope.colormap);
            $scope.$apply();
        });


        presets.select2({
            placeholder: "presets"
        }).on('change', function(e) {
            console.log(e.val);
            var p = $scope.presets[e.val];
            applyPreset(p);
            $scope.$apply();
        });

    });

})();