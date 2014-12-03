(function() {
    "use strict";

    var progress = new ProgressBar.Line('#progress-container', {
        color: '#FCB03C'
    });

    var canvas = document.getElementById('cancan');
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var calcX = 1000;
    var calcY = 1000;

    // var pumpCount = 1000;

    // var bailout = 200;
    var bailout = 20000;

    // how many millions of plots to do
    // var maxItr = 1000;
    var maxItr = 100;

    var image = ctx.createImageData(calcX, calcY);
    var canvasData = image.data;

    function mapColor0(point) {
        return([point, point, point, 255]);
    }

    function mapColor3(point) {
        if(point < 0 || point > 255)
            throw new Error("point out of range");

        if(point <= 31)
            return([point, point, point, 255]);
        if(point <= 63)
            return([point, 0, 0, 255]);
        if(point <= 95)
            return([point, point, 0, 255]);
        if(point <= 127)
            return([0, point, 0, 255]);
        if(point <= 159)
            return([point, 0, point, 255]);
        if(point <= 191)
            return([0, point, 0, 255]);
        if(point <= 223)
            return([point, 0, point, 255]);
        return([point, point, point, 255]);

    }

    function mapColor2(point) {
        if(point < 0 || point > 255)
            throw new Error("point out of range");

        if(point <= 31)
            return([point, point, point, 255]);
        if(point <= 63)
            return([point, point, 0, 255]);
        if(point <= 95)
            return([0, point, point, 255]);
        if(point <= 127)
            return([point, 0, point, 255]);
        if(point <= 159)
            return([point, 0, 0, 255]);
        if(point <= 191)
            return([0, point, 0, 255]);
        if(point <= 223)
            return([0, 0, point, 255]);

        // if(point <= 255) {
        return([point, point, point, 255]);

    }

    function mapColor(point) {
        if(point < 0 || point > 255)
            throw new Error("point out of range");

        if(point <= 31)
            return([point, point, point, 255]);
        if(point <= 63)
            return([point, 0, 0, 255]);
        if(point <= 95)
            return([0, point, 0, 255]);
        if(point <= 127)
            return([0, 0, point, 255]);
        return([point, point, point, 255]);

    }

    function draw(imageData) {

        var smallest, biggest;

        biggest = 0;
        for(var bi = 0; bi < imageData.length; bi++) {
            biggest = Math.max(imageData[bi], biggest);
        }
        smallest = 0;
        for(var si = 0; si < imageData.length; si++) {
            smallest = Math.min(imageData[si], smallest);
        }

        // console.log("smallest: " + smallest + " biggest: " + biggest);

        for(var j = 0; j < (calcX * calcY); j++) {

            if(imageData[j] <= smallest) {
                canvasData[tempi] = 0;
                canvasData[tempi+1] = 0;
                canvasData[tempi+2] = 0;
                canvasData[tempi+3] = 255;
            } else {
                var ramp = 2*(imageData[j] - smallest) / (biggest - smallest);
                // var ramp = (imageData[j] - smallest) / (biggest - smallest);

                // does this come up other than when biggest - smallest == 0?
                if(isNaN(ramp))
                    ramp = 0;

                if(ramp < 0)
                    console.log("low ramp: " + ramp);

                if(ramp > 1)
                    ramp = 1;
                ramp = Math.pow(ramp, 0.5);

                ramp = Math.round(ramp * 255);

                // console.log("ramp: ", ramp);

                var tempi = j * 4;

                var rgba = mapColor0(ramp);
                canvasData[tempi] = rgba[0];     // r
                canvasData[tempi + 1] = rgba[1]; // g
                canvasData[tempi + 2] = rgba[2]; // b
                canvasData[tempi + 3] = rgba[3]; // a

                // canvasData[tempi] = ramp;    // r
                // canvasData[tempi + 1] = 0; // g
                // canvasData[tempi + 2] = ramp; // b
                // canvasData[tempi] = Math.floor(Math.random() * 256);
                // canvasData[tempi + 1] = Math.floor(Math.random() * 256);
                // canvasData[tempi + 2] = Math.floor(Math.random() * 256);
                // canvasData[tempi + 3] = 255; // a
            }
        }
        // console.log("canvasData: ", image.data);

        ctx.putImageData(image, 0, 0);
    }

    var buddhaBrot = new Uint16Array(calcX*calcY);
    var numComplete = 0;
    var numBuddhas = 2;
    var buddhas = new Array(numBuddhas);
    var progresses = new Float32Array(numBuddhas);

    function addBuddhaData(imageData) {
        for(var i=0; i<calcX*calcY; i++) {
            buddhaBrot[i] += imageData[i];
        }
        draw(buddhaBrot);
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
                break;
            default:
                console.log('unknown message ', data);
        }

    }



    // for(var b=0; b<numBuddhas; b++) {
    //     buddhas[b] = new Worker('buddhaWorker.js');
    //     buddhas[b].addEventListener('message', buddhaListener);
    //     buddhas[b].postMessage({
    //         cmd: 'start',
    //         x: calcX,
    //         y: calcY,
    //         bailout: bailout,
    //         maxItr: maxItr/numBuddhas,
    //         i: b
    //     });
    //     console.log('buddha ' + b);
    // }

    var buddha = new Worker('buddhaWorker.js');
    buddha.addEventListener('message', function(e) {
        var data = e.data;
        switch(data.cmd) {
            case 'progress':
                progress.animate(data.progress);
                break;
            case 'done':
                console.log('done');
                draw(data.imageData);
                console.log('drawn');
                break;
            case 'progressDraw':
                draw(data.imageData);
                break;
            default:
                console.log('unknown message ', data);
        }

    });

    buddha.postMessage({cmd: 'start', x: calcX, y: calcY, bailout: bailout, maxItr: maxItr});

    // function iterate(x0, y0) {

    //     var xnew, ynew,
    //         x = 0,
    //         y = 0;

    //     var XY = new Array(bailout);

    //     for(var i = 0; i<bailout; i++) {
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


    //     if(tt >= calcX*calcY) {
    //         progress.animate(1);
    //         done();
    //         return;
    //     }

    //     var prog = (tt)/(calcX*calcY);
    //     // console.log({prog: prog, tt: tt});
    //     progress.animate(prog);

    //     for(var temp = 0; temp < pumpCount; temp++) {


    //         for(var t=0; t<maxItr; t++) {

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

    //                     var ix = 0.3 * calcX * (seqx + 0.5) + calcX/2;
    //                     var iy = 0.3 * calcY * seqy + calcY/2;
    //                     if (ix >= 0 && iy >= 0 && ix < calcX && iy < calcY) {
    //                         var index = Math.round(iy*calcX+ix);
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

    // // calcX * calcY?
    // for(var tt=0; tt<calcX*calcY;tt++) {
    //  for(var t=0; t<maxItr; t++) {

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

    //              var ix = 0.3 * calcX * (seqx + 0.5) + calcX/2;
    //              var iy = 0.3 * calcY * seqy + calcY/2;
    //              if (ix >= 0 && iy >= 0 && ix < calcX && iy < calcY)
    //                  imageData[iy*calcX+ix]++;
    //          }
    //      }

    //  }
    // }



})();