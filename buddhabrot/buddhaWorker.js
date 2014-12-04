//  "use strict";

// function iterate(x0, y0, max_itr) {

//     var xnew, ynew,
//         x = 0,
//         y = 0;

//     var XY = new Float32Array(max_itr * 2);

//     for(var i = 0; i<max_itr; i++) {
//         xnew = (x * x) - (y * y) + x0;
//         ynew = 2 * x * y + y0;
//         // XY[i] = [xnew, ynew];
//         var tempi = 2 * i;
//         XY[tempi] = xnew;
//         XY[tempi+1] = ynew;
//         if(xnew*xnew + ynew*ynew > 10) {
//         // if(xnew*xnew + ynew*ynew > 4) {
//             // console.log('iterate done: ', XY);
//             return([i, XY]);
//         }
//         x = xnew;
//         y = ynew;
//     }

//     return(false);
// }

function iterate2(x0, y0, draw) {

    var xnew, ynew,
        x = 0,
        y = 0;

    for(var i = 0; i<self.max_itr; i++) {
        xnew = (x * x) - (y * y) + x0;
        ynew = 2 * x * y + y0;
        if(draw) {
            pushPixel(xnew, ynew, i);
        }
        if(xnew*xnew + ynew*ynew > 10) {
        // if(xnew*xnew + ynew*ynew > 4) {
            // return(true);
            if(i>=self.min_itr) { return(true); }
            return(false);
        }
        x = xnew;
        y = ynew;
    }

    return(false);
}

function pushPixel(x, y, weight) {
    // I think we're scalaing and centering the image here

    var dimX = self.dimX,
        dimY = self.dimY;

   // Paul Bourke's version
   // var ix = 0.3 * dimX * (seqx + 0.5) + dimX/2;
   // var iy = 0.3 * dimY * seqy + dimY/2;
   var ix = Math.round(self.thirdX * (x + 0.5) + self.halfX);
   var iy = Math.round(self.thirdY * y + self.halfY);

   // sort of more like j.tarbell's code
   // var ix = (dimX * (seqx + 0) / 3) + dimX/2;
   // var iy = (dimY * (seqy + 0) / 3) + dimY/2;

   if (ix >= 0 && iy >= 0 && ix < dimX && iy < dimY) {
       // var temp = iy*dimX+ix;
       // rotate the image
       var temp = ix*dimY+iy;

        // imageData[iy*dimX+ix]++;

        self.imageData[temp]++;
        if(weight !== undefined) {
            self.weights[temp] += weight;
        }
    }
}

function calculate() {

    if(!(self.dimX && self.dimY && self.max_itr && self.plots)) {
        console.log({dimX: self.dimX, dimY: self.dimY, max_itr: self.max_itr, plots: self.plots});
        // throw new Error("Missing Parameter");
        return;
    }

    console.log("worker starting: " + self.workerNumber);

    var tts = 1000000;

    for(var tt=0; tt<tts;tt++) {
        if(tt % (tts/1000) === 0) {
            self.postMessage({cmd: 'progress', progress: tt/tts, i: self.workerNumber});
            // console.log("progress: " + tt/tts);
        }
        if(tt % (tts/100) === 0) {
            self.postMessage({cmd:       'progressDraw',
                              imageData: self.imageData,
                              weights:   self.weights,
                              i:         self.workerNumber});
            if(self.workerNumber) {
                self.imageData = new Uint32Array(self.dimX*self.dimY);
            }
        }

        for(var t=0; t<self.plots; t++) {

            // why -3 - +3?
            var x = 6 * Math.random() - 3;
            var y = 6 * Math.random() - 3;
            // var x = Math.random() * 3 - 2; // -2 - 1
            // var y = Math.random() * 3 - 1.5; // -1.5 - 1.5

            // points within the Mandelbrot set will iterate until max_itr.
            // check if our point is within the cardoid or period-2 bulb
            // and skip if it is.
            //
            // http://erleuchtet.org/2010/07/ridiculously-large-buddhabrot.html
            // http://en.wikipedia.org/wiki/Mandelbrot_set#Optimizations

            // this makes a significant different with very large 'max_itr' values
            // at 2000 it wasn't noticable
            // at 200000 it was a factor of 5 speedup

            // check if the point is within the cardoid
            var xminusq = x - 1/4;
            var ysquared = y * y;
            var q = xminusq*xminusq + y*y;
            if(q*(q + xminusq) < ysquared/4) {
                // console.log('cardoid');
                continue;
            }
            // or the period-2 bulb
            if((x+1)*(x+1) + ysquared < ysquared/4) {
                // console.log("your mom's a period-2 bulb")
                continue;
            }

            var result = iterate2(x,y, false);

            // Calling iterate again seems to be way faster than returning an array.
            // in the latter case, the code spends 50% of its time garbage collecting
            // those arrays.

            // it may be worth trying using one array in self as scratch space
            if(result === true) {
                iterate2(x, y, true);
            }
        }
    }
    // console.log("max: ", Math.max.apply(imageData));
    self.postMessage({cmd: 'progress', progress: 1, i: self.workerNumber});
    self.postMessage({cmd: 'done', imageData: self.imageData, weights: self.weights, i: self.workerNumber});
    console.log("worker done: " + self.workerNumber);
}

function eventListener(e) {
    var data = e.data;

    switch(data.cmd) {
        case 'start':
            console.log("worker start: ", data);

            self.dimX = data.x;
            self.dimY = data.y;

            self.halfX = self.dimX / 2;
            self.halfY = self.dimY / 2;
            self.thirdX = self.dimX / 3;
            self.thirdY = self.dimY /  3;

            self.imageData = new Uint32Array(self.dimX*self.dimY);
            self.weights = new Uint32Array(self.dimX*self.dimY);

            self.min_itr = data.min_itr || 0;
            self.max_itr = data.max_itr || 200;

            self.plots = data.plots || 1000;

            self.workerNumber = data.i || 0;

            calculate();
            break;
        default:
            console.log("unknown message: ", data);
    }
}

self.addEventListener('message', eventListener);
