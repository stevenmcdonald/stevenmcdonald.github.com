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
        'snow': function(point) {
            var scale = point * point;
            scale = Math.min(scale, 255);
            return([point, point, point, 255]);
        },
        'crazy': function(point) {

            return([
                Math.round(Math.random() * 255),
                Math.round(Math.random() * 255),
                Math.round(Math.random() * 255),
                point
                ]);
        },
        'bichrome': function(point) {

            if(point % 2 === 0) {
                return([point, 0, 0, 255]);
            } else {
                return([0, 0, point, 255]);
            }

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
        'flame': function(point) {
            var scaled;

            if(point <= 95) {
                return([point, point, point, 255]);
            }
            if(point <= 127) {
                scaled = 128 + point; // 224 - 255
                return([scaled, 0, 0, 32]);
            }
            if(point <= 159) {
                scaled = 96 + point;
                return([scaled, 0, 0, 255]);
            }
            if(point <= 191) {
                scaled = 64 + point;
                return([scaled, scaled, 0, 255]);
            }
            if(point <= 223) {
                return([223, 223, point, 255]);
            }

            return([point, point, point, 255]);
        },
        'experiment': function(point) {
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
        },
        'cymrgb': function(point) {
            var scaled;

            if(point <= 31) {
                // 127 - 255
                scaled = (point + 33) * 4 - 1;
                return([scaled, scaled, scaled, 255]);
            }
            if(point <= 63) {
                scaled = (point + 1) * 4 - 1;
                return([0, scaled, scaled, 255]);
            }
            if(point <= 95) {
                scaled = (point - 31) * 4 - 1;
                return([scaled, scaled, 0, 255]);
            }
            if(point <= 127) {
                scaled = (point - 63) * 4 - 1;
                return([scaled, 0, scaled, 255]);
            }
            if(point <= 159) {
                scaled = (point - 95) * 4 - 1;
                return([scaled, 0, 0, 255]);
            }
            if(point <= 191) {
                scaled = (point - 127) * 4 - 1;
                return([0, scaled, 0, 255]);
            }
            if(point <= 223) {
                scaled = (point - 159) * 4 - 1;
                return([0, scaled, 0, 255]);
            }

            scaled = (point - 191) * 4 - 1;
            return([scaled, scaled, scaled, 255]);
        },
        'frosty': function(point) {
            return([point, Math.max(0, point-127), Math.max(0, point-127), 255]);
        },
        'sporl': function(point, raw) {
            var scaled;

            if(raw > 0.75) {
                scaled = Math.round(raw * 255);
                return([scaled, scaled, scaled, 255]);
            }
            if(raw > 0.5) {
                scaled = Math.round((raw + 0.25) * 255);
                return([scaled, 0, 0, 255]);
            }
            if(raw > 0.25) {
                scaled = Math.round((raw + 0.5) * 255);
                return([0, 0, scaled, 255]);
            }
            scaled = Math.round((raw + 0.75) * 255);
            return([0, scaled, 0, 255]);
        },
        '__user': function(point, raw) {
            var color;

            if(window.scmBuddha.userColorMap && typeof window.scmBuddha.userColorMap === 'function') {
                color = window.scmBuddha.userColorMap(point, raw);
                return color;
            } else {
                throw new Error('no userColorMap!');
            }
        }
    };
    // var colormapper = 'monochrome';
    // var colormapper = 'experiment';

    function mapColor(point, point8) {
        var color = colormapers[colormapper](point8, point);
        // console.log("color: ", color);
        return color;
    }

    function curlyMapColor(point, point8) {
        var r = Math.floor(Math.random() * 265),
            g = Math.floor(Math.random() * 265),
            b = Math.floor(Math.random() * 265);
        if(point8) console.log("point8 " + point8);
        return([r, g, b, point8]);
        // return([r, g, b, 255]);
    }

    function scale(ramp) {
        if(isNaN(ramp)) {
            ramp = 0;
        }
        if(ramp < 0) { throw new Error('low ramp'); }
        if(ramp > 1) { ramp = 1; }
        ramp = Math.pow(ramp, 0.5);
        var ramp8 = Math.round(ramp * 255);

        return([ramp, ramp8]);
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

        // this list is too long for Math.max.apply, etc
        biggest = 0;
        // bigW = 0;
        for(var bi = 0; bi < imageData.length; bi++) {
            biggest = Math.max(imageData[bi], biggest);
            // bigW = Math.max(weights[bi], bigW);
        }
        smallest = 0;
        // smallW = 0;
        for(var si = 0; si < imageData.length; si++) {
            smallest = Math.min(imageData[si], smallest);
            // smallW = Math.min(weights[si], smallW);
        }

        // console.log({smallW: smallW, bigW: bigW});

        for(var j = 0; j < (dimX * dimY); j++) {

            var ramp = 2*(imageData[j] - smallest) / (biggest - smallest);
            var ramp8;

            var temp = scale(ramp);
            ramp = temp[0];
            ramp8 = temp[1];

            // var w = (weights[j] - smallW) / (bigW - smallW);
            // if(isNaN(w)) { w = 0; }
            // w *= 10000;

            var rgba = mapColor(ramp, ramp8);

            var tempi = j * 4;
            canvasData[tempi] = rgba[0];     // r
            canvasData[tempi + 1] = rgba[1]; // g
            canvasData[tempi + 2] = rgba[2]; // b
            canvasData[tempi + 3] = rgba[3]; // a
        }

        ctx.putImageData(image, 0, 0);
    }

    function drawCurly(imageData) {

        var smallest, biggest;

        // this list is too long for Math.max.apply, etc
        biggest = 0;
        for(var bi = 0; bi < imageData.length; bi++) {
            biggest = Math.max(imageData[bi], biggest);
        }
        smallest = 0;
        for(var si = 0; si < imageData.length; si++) {
            smallest = Math.min(imageData[si], smallest);
        }

        for(var j = 0; j < (dimX * dimY); j++) {

            var ramp = 2*(imageData[j] - smallest) / (biggest - smallest);
            var ramp8;

            var temp = scale(ramp);
            ramp = temp[0];
            ramp8 = temp[1];

            // var w = (weights[j] - smallW) / (bigW - smallW);
            // if(isNaN(w)) { w = 0; }
            // w *= 10000;

            var rgba = curlyMapColor(ramp, ramp8);

            var tempi = j * 4;
            canvasData[tempi] = Math.round((canvasData[tempi] + rgba[0]) / 2);     // r
            canvasData[tempi+1] = Math.round((canvasData[tempi+1] + rgba[1]) / 2); // g
            canvasData[tempi+2] = Math.round((canvasData[tempi+2] + rgba[2]) / 2); // b
            canvasData[tempi+3] = Math.round((canvasData[tempi+3] + rgba[3]) / 2); // a
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
                if(window.scmBuddha.doneCallback) { window.scmBuddha.doneCallback(); }
                stopBuddha();
                progress.set(0);
                // fall through and draw
            case 'progressDraw':
                addBuddhaData(data.imageData, data.i);
                if(data.weights) {
                    addWeights(data.weights);
                }
                draw(buddhaBrot);
                break;
            case 'curlyDone':
                console.log("curly found");
                if(window.scmBuddha.doneCallback) { window.scmBuddha.doneCallback(); }
                drawCurly(buddhaBrot);
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

    function startCurlieThreaded(threads) {
        numBuddhas = threads;
        start = new Date().getTime();
        buddhas = new Array(threads);
        progresses = new Float32Array(threads);

        for(var b=0; b<threads; b++) {
            buddhas[b] = new Worker('buddhaWorker.js');
            buddhas[b].addEventListener('message', buddhaListener);
            for(var c=0; c<plots; c++) {
                buddhas[b].postMessage({
                    cmd: 'findCurlies',
                    x: dimX,
                    y: dimY,
                    min_itr: min_itr,
                    max_itr: max_itr,
                    plots: plots/threads,
                    i: b
                });
            }
            console.log('curlie buddha ' + b);
        }
    }

    function startBuddha(options) {

        console.log("buddha.js start: ", options);

        var threads = options.threads || 2;

        dimX    = options.dimX || 1000;
        dimY    = options.dimY || 1000;
        min_itr = options.min_itr || 0;
        max_itr = options.max_itr || 200;
        plots   = options.plots || 1000;

        colormapper = options.colormap || 'monochrome';

        canvas = document.getElementById('cancan');
        ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        buddhaBrot = new Uint32Array(dimX*dimY);
        // weights = new Uint32Array(dimX*dimY);

        image = ctx.createImageData(dimX, dimY);
        canvasData = image.data;

        if(!progress) {
            progress = new ProgressBar.Line('#progress-container', {
                color: '#FCB03C'
            });
        }
        progress.set(0);

        startMultiThreaded(threads);
    }

    function startCurlies(options) {
        var threads = options.threads || 2;

        dimX    = options.dimX || 1000;
        dimY    = options.dimY || 1000;
        min_itr = options.min_itr || 2000;
        max_itr = options.max_itr || 20000;
        plots   = options.plots || 10;

        canvas = document.getElementById('cancan');
        ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        buddhaBrot = new Uint32Array(dimX*dimY);

        image = ctx.createImageData(dimX, dimY);
        canvasData = image.data;

        if(!progress) {
            progress = new ProgressBar.Line('#progress-container', {
                color: '#FCB03C'
            });
        }
        progress.set(0);

        startCurlieThreaded(threads);
    }

    function stopBuddha() {
        for(var i=0; i<numBuddhas; i++) {
            buddhas[i].terminate();
        }
        console.log("stopped");
    }

    function redraw(colormap) {
        if(buddhaBrot && buddhaBrot.length) {
            if(colormap) { colormapper = colormap; }
            draw(buddhaBrot);
        }
    }

    window.scmBuddha = {
        startBuddha: startBuddha,
        stopBuddha: stopBuddha,
        startCurlies: startCurlies,
        redraw: redraw
    };

})();
