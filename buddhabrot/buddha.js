(function() {
    "use strict";

    var progress;

    var canvas, ctx;

    var dimX, dimY;

    // min_itr: miniumum number of iterations needed to draw.
    //          setting this higher means plotting only values close
    //          to the edge of the Mandelbrot set
    //
    // max_itr: the number of iterations to try before we decide that
    //          it's not going to escape
    var min_itr, max_itr;

    // how many millions of plots to do
    var plots;

    var start; // used for timing

    // this holds the data before processing
    var buddhaBrot, weights;

    // we process to canvasData and write 'image' to the canvas
    var image, canvasData;

    // multithread stuff uses this
    var numBuddhas;
    var buddhas;
    var progresses;

    var colormapper;

    var colormapers = {
        'monochrome': function(point) {
            return([point, point, point, 255]);
        },
        'rainbowish':function(point){
            if(point <= 31)
                return([point, point, point, 255]);
            if(point <= 63)
                return([point, 0, 0, 255]);
            if(point <= 95)
                return([0, point, 0, 255]);
            if(point <= 127)
                return([0, 0, point, 255]);
            return([point, point, point, 255]);
        },
        'experiment2': function(point) {
            var scaled;

            // if(point <= 95)
            //     return([0, 0, 0, 255]);
            if(point <= 127) {
                scaled = point * 2;
                return([0, 0, point, 255]);
            }
            // if(point <= 159)
            //     return();
            // if(point <= 191)
            //     return();
            // if(point <= 223)
            //     return();
            scaled = (point - 127) * 2; // scale 127-255 -> 0-255 (254)
            return([scaled, scaled, scaled, 255]);
        },
        'experiment': function(point, weight) {
            var scaled;

            // plots 100
            // max_itr 2000

            // if(Math.round(Math.random() * 100) % 100 === 0) { console.log({weight: weight});}

            if(point <= 95) {
                return([0, 0, 0, 0]);
            }
            if(point <= 127) {
                // scaled = point * 2;
                scaled = (point - 96) * 8;
                return([0, 0, scaled, 255]);
            }
            if(point <= 159) {
                scaled = (point - 32) * 2;
                return([point - 32, 0, scaled, 255]);
            }
            // if(point <= 191)
            //     return();
            // if(point <= 223)
            //     return();

            // scaled = (point - 127) * 2 // scale 127-255 -> 0-255 (254)
            // return([scaled, scaled, scaled, 255]);
            // return([point, point, point, 255]);
            return([255, 255, 255, point]);
        }
    };
    // var colormapper = 'monochrome';
    // var colormapper = 'experiment';

    function mapColor(point, weight) {
        return colormapers[colormapper](point, weight);
    }

    function draw(imageData) {

        var smallest, biggest, bigW, smallW;

        var spot = new Date().getTime();
        var t = spot - start;
        if(t < 1000) {
            console.log("time: " + t + " ms");
        } else {
            console.log("time: " + t/1000 + ' seconds');
        }

        function scale(ramp) {
            if(isNaN(ramp)) {
                if(biggest - smallest !== 0) { throw new Error('yes'); }
                ramp = 0;
            }
            if(ramp < 0) { throw new Error('low ramp'); }
            if(ramp > 1) { ramp = 1; }
            ramp = Math.pow(ramp, 0.5);
            ramp = Math.round(ramp * 255);

            return ramp;
        }

        // this list is too long for Math.max.apply, etc
        biggest = 0;
        bigW = 0;
        for(var bi = 0; bi < imageData.length; bi++) {
            biggest = Math.max(imageData[bi], biggest);
            bigW = Math.max(weights[bi], bigW);
        }
        smallest = 0;
        smallW = 0;
        for(var si = 0; si < imageData.length; si++) {
            smallest = Math.min(imageData[si], smallest);
            smallW = Math.min(weights[si], smallW);
        }

        console.log({smallW: smallW, bigW: bigW});

        for(var j = 0; j < (dimX * dimY); j++) {

            var ramp = 2*(imageData[j] - smallest) / (biggest - smallest);

            ramp = scale(ramp);

            // var w = (weights[j] - smallW) / (bigW - smallW);
            // if(isNaN(w)) { w = 0; }
            // w *= 10000;

            var rgba = mapColor(ramp);

            var tempi = j * 4;
            canvasData[tempi] = rgba[0];     // r
            canvasData[tempi + 1] = rgba[1]; // g
            canvasData[tempi + 2] = rgba[2]; // b
            canvasData[tempi + 3] = rgba[3]; // a
        }

        ctx.putImageData(image, 0, 0);
    }

    function addBuddhaData(imageData) {
        for(var i=0; i<dimX*dimY; i++) {
            buddhaBrot[i] += imageData[i];
        }
    }

    function addWeights(w) {
        for(var i=0; i<dimX*dimY; i++) {
            weights[i] += w[i];
        }
    }

    function updateProgress(new_progress, i) {
        progresses[i] = new_progress;

        var p = 0;
        for(var j=0; j<numBuddhas; j++) {
            p += progresses[j];
        }

        progress.animate(p/numBuddhas);
    }


    function buddhaListener(e) {
        var data = e.data;
        switch(data.cmd) {
            case 'progress':
                updateProgress(data.progress, data.i);
                // console.log("progress: ", data.progress);
                break;
            case 'done':
            case 'progressDraw':
                addBuddhaData(data.imageData, data.i);
                if(data.weights) {
                    addWeights(data.weights);
                }
                draw(buddhaBrot);
                break;
            default:
                console.log('unknown message ', data);
        }

    }

    function startMultiThreaded(threads) {

        numBuddhas = threads;
        start = new Date().getTime();
        buddhas = new Array(threads);
        progresses = new Float32Array(threads);

        for(var b=0; b<threads; b++) {
            buddhas[b] = new Worker('buddhaWorker.js');
            buddhas[b].addEventListener('message', buddhaListener);
            buddhas[b].postMessage({
                cmd: 'start',
                x: dimX,
                y: dimY,
                min_itr: min_itr,
                max_itr: max_itr,
                plots: plots/threads,
                i: b
            });
            console.log('buddha ' + b);
        }
    }

    function startBuddha(options) {

        console.log("buddha.js start: ", options);

        var threads = options.threads || 1;

        dimX    = options.dimX || 1000;
        dimY    = options.dimY || 1000;
        min_itr = options.min_itr || 0;
        max_itr = options.max_itr || 200;
        plots   = options.pliots || 1000;

        colormapper = options.colormap || 'monochrome';

        canvas = document.getElementById('cancan');
        ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        buddhaBrot = new Uint32Array(dimX*dimY);
        weights = new Uint32Array(dimX*dimY);

        image = ctx.createImageData(dimX, dimY);
        canvasData = image.data;

        progress = new ProgressBar.Line('#progress-container', {
            color: '#FCB03C'
        });

        startMultiThreaded(threads);
    }

    function stopBuddha() {
        for(var i=0; i<numBuddhas; i++) {
            buddhas[i].terminate();
        }
        console.log("stopped");
    }

    window.scmBuddha = {
        startBuddha: startBuddha,
        stopBuddha: stopBuddha
    };

    // startMultiThreaded(2);

    // var buddha = new Worker('buddhaWorker.js');
    // buddha.addEventListener('message', function(e) {
    //     var data = e.data;
    //     switch(data.cmd) {
    //         case 'progress':
    //             progress.animate(data.progress);
    //             break;
    //         case 'done':
    //             console.log('done');
    //             draw(data.imageData);
    //             console.log('drawn');
    //             break;
    //         case 'progressDraw':
    //             draw(data.imageData);
    //             break;
    //         default:
    //             console.log('unknown message ', data);
    //     }

    // });

    // buddha.postMessage({cmd: 'start', x: dimX, y: dimY, max_itr: max_itr, plots: plots});

    // function iterate(x0, y0) {

    //     var xnew, ynew,
    //         x = 0,
    //         y = 0;

    //     var XY = new Array(max_itr);

    //     for(var i = 0; i<max_itr; i++) {
    //         xnew = x * x - y * y + x0;
    //         ynew = 2 * x * y + y0;
    //         XY[i] = [xnew, ynew];
    //         if(xnew*xnew + ynew+ynew > 10) {
    //             // console.log('iterate done: ', XY);
    //             return([i, XY]);
    //         }
    //         x = xnew;
    //         y = ynew;
    //     }

    //     return(false);
    // }

    // var tt = 0;
    // function pump() {

    //     // console.log("itr: " + tt);


    //     if(tt >= dimX*dimY) {
    //         progress.animate(1);
    //         done();
    //         return;
    //     }

    //     var prog = (tt)/(dimX*dimY);
    //     // console.log({prog: prog, tt: tt});
    //     progress.animate(prog);

    //     for(var temp = 0; temp < pumpCount; temp++) {


    //         for(var t=0; t<plots; t++) {

    //             // why -3 - +3?
    //             var x = 6 * Math.random() - 3;
    //             var y = 6 * Math.random() - 3;
    //             var result = iterate(x,y);

    //             if(result) {
    //                 var n = result[0];
    //                 var XY = result[1];

    //                 // console.log("XY ", XY);
    //                 for(var i=0; i<n; i++) {
    //                     var seqx = XY[i][0];
    //                     var seqy = XY[i][1];

    //                     // console.log({x: x, y: y});

    //                     var ix = 0.3 * dimX * (seqx + 0.5) + dimX/2;
    //                     var iy = 0.3 * dimY * seqy + dimY/2;
    //                     if (ix >= 0 && iy >= 0 && ix < dimX && iy < dimY) {
    //                         var index = Math.round(iy*dimX+ix);
    //                         // console.log("index: ", index);
    //                         imageData[index]++;
    //                     }
    //                 }
    //             }

    //         }
    //     }

    //     tt += pumpCount;
    //     setTimeout(pump, 0);
    // }

    // pump();

    // // dimX * dimY?
    // for(var tt=0; tt<dimX*dimY;tt++) {
    //  for(var t=0; t<plots; t++) {

    //      // why -3 - +3?
    //      var x = 6 * Math.random() - 3;
    //      var y = 6 * Math.random() - 3;
    //      var result = iterate(x,y);

    //      if(result) {
    //          var n = result[0];
    //          var XY = result[1];
    //          for(var i=0; i<n; i++) {
    //              var seqx = XY[i][0];
    //              var seqy = XY[i][1];

    //              var ix = 0.3 * dimX * (seqx + 0.5) + dimX/2;
    //              var iy = 0.3 * dimY * seqy + dimY/2;
    //              if (ix >= 0 && iy >= 0 && ix < dimX && iy < dimY)
    //                  imageData[iy*dimX+ix]++;
    //          }
    //      }

    //  }
    // }



})();