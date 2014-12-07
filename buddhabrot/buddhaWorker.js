(function() {
  "use strict";

function Buddha(options) {

    // references to 'this' are *way* faster than references to 'self' in Chrome's profiler.
    // in the latter case, 40% of the time is spent in "get self".

    this.dimX = options.x;
    this.dimY = options.y;

    this.halfX = this.dimX / 2;
    this.halfY = this.dimY / 2;
    this.thirdX = this.dimX / 3;
    this.thirdY = this.dimY /  3;

    this.imageData = new Uint32Array(this.dimX*this.dimY);
    // this.weights = new Uint32Array(this.dimX*this.dimY);

    this.min_itr = options.min_itr || 0;
    this.max_itr = options.max_itr || 200;

    this.plots = options.plots || 1000;

    this.workerNumber = options.i || 0;

    // iterate() uses this for scratch space. We want to avoid reallocating it
    // so we don't spend all our time in the garbage collector. Fomat is [x1,y1,x2,y2...xn,yn]
    this.XY = new Float64Array(this.max_itr * 2);
}

Buddha.prototype.iterate = function(x0, y0) {

    var xnew, ynew,
        x = 0,
        y = 0;

    for(var i = 0; i<this.max_itr; i++) {
        xnew = (x * x) - (y * y) + x0;
        ynew = 2 * x * y + y0;
        this.XY[i*2] = xnew;
        this.XY[i*2+1] = ynew;

        if(i>=3) {
            // check the last 2 points for obvious cycles
            var lasti = (i-1) * 2,
                slasti = (i-2) * 2;
            if((xnew === this.XY[lasti] && ynew === this.XY[lasti+1]) ||
                (xnew === this.XY[slasti] && ynew === this.XY[lasti+1])) {
                return(false);
            }
        }

        if(xnew*xnew + ynew*ynew > 10) {
        // if(xnew*xnew + ynew*ynew > 4) {
            if(i>=this.min_itr) { return(i); }
            return(false);
        }
        x = xnew;
        y = ynew;
    }

    return(false);
};

Buddha.prototype.pushPixel = function(x, y, weight) {
    // I think we're scalaing and centering the image here

    var dimX = this.dimX,
        dimY = this.dimY;

   // Paul Bourke's version
   // var ix = 0.3 * dimX * (seqx + 0.5) + dimX/2;
   // var iy = 0.3 * dimY * seqy + dimY/2;
   var ix = Math.round(this.thirdX * (x + 0.5) + this.halfX);
   var iy = Math.round(this.thirdY * y + this.halfY);

   // sort of more like j.tarbell's code
   // var ix = (dimX * (seqx + 0) / 3) + dimX/2;
   // var iy = (dimY * (seqy + 0) / 3) + dimY/2;

   if (ix >= 0 && iy >= 0 && ix < dimX && iy < dimY) {
       // var temp = iy*dimX+ix;
       // rotate the image
       var temp = ix*dimY+iy;

        this.imageData[temp]++;
        // if(weight !== undefined) {
        //     this.weights[temp] += weight;
        // }
    }
};

Buddha.prototype.isPointInSet = function(x, y) {

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
        return true;
    }
    // or the period-2 bulb
    if((x+1)*(x+1) + ysquared < ysquared/4) {
        return true;
    }

    return false;
}

Buddha.prototype.calculate = function() {

    var lastTime = new Date().getTime();

    console.log("worker starting: " + this.workerNumber + " time: " + lastTime);

    var tts = 1000000;

    for(var t=0; t<this.plots; t++) {

        var currTime = new Date().getTime();

        if((currTime - lastTime) > 5000) {
            lastTime = currTime;
            self.postMessage({cmd:       'progressDraw',
                              imageData: this.imageData,
                              weights:   this.weights,
                              i:         this.workerNumber});
            // we've sent our data to our caller, so start fresh
            this.imageData = new Uint32Array(this.dimX*this.dimY);
        }

        self.postMessage({cmd: 'progress', progress: (t+1)/this.plots, i: this.workerNumber});

        for(var tt=0; tt<tts;tt++) {

            // why -3 - +3?
            var x = 6 * Math.random() - 3;
            var y = 6 * Math.random() - 3;
            // var x = Math.random() * 3 - 2; // -2 - 1
            // var y = Math.random() * 3 - 1.5; // -1.5 - 1.5

            if(this.isPointInSet(x, y)) {
                continue;
            }

            var result = this.iterate(x,y);

            if(result) {
                for(var i = 0; i<result; i++) {
                    this.pushPixel(this.XY[i*2], this.XY[i*2+1], result);
                }
            }
        }
    }
    self.postMessage({cmd: 'progress', progress: 1, i: this.workerNumber});
    self.postMessage({cmd: 'done', imageData: this.imageData, weights: this.weights, i: this.workerNumber});
    console.log("worker done: " + this.workerNumber);
};

Buddha.prototype.findCurly = function() {

    for(;;) {
        // why -3 - +3?
        var x = 6 * Math.random() - 3;
        var y = 6 * Math.random() - 3;

        // var x = Math.random() * 3 - 2; // -2 - 1
        // var y = Math.random() * 3 - 1.5; // -1.5 - 1.5

        if(this.isPointInSet(x, y)) {
            continue;
        }

        var result = this.iterate(x, y);
        if(result) {
            console.log("found curly at " + result);
            for(var i = 0; i<result; i++) {
                this.pushPixel(this.XY[i*2], this.XY[i*2+1]);
            }
            self.postMessage({cmd: 'curlyDone', imageData: this.imageData, i: this.workerNumber});
            return;
        }
    }

}

function eventListener(e) {
    var data = e.data;
    var b;

    switch(data.cmd) {
        case 'start':

            console.log("worker start: ", data);

            var b = new Buddha(data);
            // probably a good idea not to block in the event listener
            setTimeout(function(){
                b.calculate();
            }, 0);
            break;
        case 'findCurlies':
            console.log("curlies start: ", data);
            if(!b) {
                b = new Buddha(data);
            }
            b.findCurly();
            break;
        default:
            console.log("unknown message: ", data);
    }
}

self.addEventListener('message', eventListener);

})();
