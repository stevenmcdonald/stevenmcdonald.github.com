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


        $scope.min_itr = 1000;
        $scope.max_itr = 2000;

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

        $scope.findCurlies = function() {
            $scope.running = true;
            var options = {
                curlies: $scope.plots,
                min_itr: $scope.min_itr,
                max_itr: $scope.man_itr
            };
            window.scmBuddha.startCurlies(options);
        }

        $scope.stop = function() {
            $scope.running = false;
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

        var editor;
        $scope.showCustomEditor = false;

        cm.select2().on('change', function(e) {
            $scope.colormap = e.val;
            console.log("colormap change: ", $scope.colormap);

            if($scope.colormap === '__user') {

                if(!editor) { setupAce(); }
                $scope.showCustomEditor = true;

            } else {
                $scope.showCustomEditor = false;
                window.scmBuddha.redraw($scope.colormap);

            }
            $scope.$apply();
        });

        $scope.redrawUserColorMap = function() {
            var code = editor.getValue();
            var userColorMap;
            try {
                userColorMap = eval(code);
            }
            catch(e) {
                console.log("user color map failed: ", e);
            }

            if(userColorMap) {
                if(typeof userColorMap !== 'function') {
                    console.log("not a function");
                }
                try {
                    console.log("userColorMap(0, 0): " + userColorMap(0, 0));
                    console.log("userColorMap(255, 1): " + userColorMap(255, 1));
                }
                catch (e) {
                    console.log("test failed: " + e);
                }

                window.scmBuddha.userColorMap = userColorMap;
                window.scmBuddha.redraw('__user');
            }
        };

        presets.select2({
            placeholder: "presets"
        }).on('change', function(e) {
            console.log(e.val);
            var p = $scope.presets[e.val];
            applyPreset(p);
            $scope.$apply();
        });


        function setupAce() {
            editor = ace.edit("editor");
            editor.setTheme("ace/theme/monokai");
            editor.getSession().setMode("ace/mode/javascript");
        }

        var saveButton = document.getElementById('save-image');
        saveButton.addEventListener('click', function(e) {
            var dataURL = document.getElementById('cancan').toDataURL("image/png");
            var timestamp = new Date().getTime();
            saveButton.href = dataURL;
            saveButton.download = 'buddha-'+timestamp+'.png';
            console.log("saved?");
        });

    });

})();