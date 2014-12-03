//  "use strict";

function iterate(x0, y0, bailout) {

    var xnew, ynew,
        x = 0,
        y = 0;

    var XY = new Float32Array(bailout * 2);

    for(var i = 0; i<bailout; i++) {
        xnew = (x * x) - (y * y) + x0;
        ynew = 2 * x * y + y0;
        // XY[i] = [xnew, ynew];
        var tempi = 2 * i;
        XY[tempi] = xnew;
        XY[tempi+1] = ynew;
        if(xnew*xnew + ynew*ynew > 10) {
        // if(xnew*xnew + ynew*ynew > 4) {
            // console.log('iterate done: ', XY);
            return([i, XY]);
        }
        x = xnew;
        y = ynew;
    }

    return(false);
}

function iterate2(x0, y0, bailout, draw) {

    var xnew, ynew,
        x = 0,
        y = 0;

    for(var i = 0; i<bailout; i++) {
        xnew = (x * x) - (y * y) + x0;
        ynew = 2 * x * y + y0;
        // XY[i] = [xnew, ynew];
        var tempi = 2 * i;
        if(draw) {
            pushPixel(xnew, ynew);
        }
        if(xnew*xnew + ynew*ynew > 10) {
        // if(xnew*xnew + ynew*ynew > 4) {
            // console.log('iterate done: ', XY);
            return(true);
        }
        x = xnew;
        y = ynew;
    }

    return(false);
}

function pushPixel(x, y) {
    // I think we're scalaing and centering the image here

    var calcX = self.calcX,
        calcY = self.calcY;

   // Paul Bourke's version
   // var ix = 0.3 * calcX * (seqx + 0.5) + calcX/2;
   // var iy = 0.3 * calcY * seqy + calcY/2;
   var ix = Math.round(self.thirdX * (x + 0.5) + self.halfX);
   var iy = Math.round(self.thirdY * y + self.halfY);

   // sort of more like j.tarbell's code
   // var ix = (calcX * (seqx + 0) / 3) + calcX/2;
   // var iy = (calcY * (seqy + 0) / 3) + calcY/2;

   if (ix >= 0 && iy >= 0 && ix < calcX && iy < calcY) {
       var temp = iy*calcX+ix;

        // imageData[iy*calcX+ix]++;
        // j.tarbell rotates the image(?)
        self.imageData[ix*calcY+iy]++;
    }
}

function calculate(calcX, calcY, bailout, maxItr, index) {

    if(!(calcX && calcY && bailout && maxItr)) {
        throw new Error("Missing Parameter");
    }

    console.log("worker starting: " + index);

    var tts = 1000000;

    for(var tt=0; tt<tts;tt++) {
        if(tt % (tts/1000) === 0) {
            self.postMessage({cmd: 'progress', progress: tt/tts, i: index});
            // console.log("progress: " + tt/tts);
        }
        if(tt % (tts/100) === 0) {
            self.postMessage({cmd: 'progressDraw', imageData: self.imageData, i: index});
            if(index) {
                self.imageData = new Uint16Array(calcX*calcY);
            }
        }

        for(var t=0; t<maxItr; t++) {

            // why -3 - +3?
            var x = 6 * Math.random() - 3;
            var y = 6 * Math.random() - 3;
            // var x = Math.random() * 3 - 2; // -2 - 1
            // var y = Math.random() * 3 - 1.5; // -1.5 - 1.5

            var result = iterate2(x,y, bailout, false);

            if(result === true) {
                iterate2(x, y, bailout, true);
            }

            // if(result !== false && result[0] >= 3) {
            //     var n = result[0];
            //     var XY = result[1];

            //     // console.log({n: n});

            //     for(var i=0; i<=n; i++) {
            //        var tempi = 2*i;
            //        var seqx = XY[tempi];
            //        var seqy = XY[tempi+1];

            //        pushPixel(seqx, seqy);
            //     }
            // } else { throw new Error("???"); }
        }
    }
    // console.log("max: ", Math.max.apply(imageData));
    self.postMessage({cmd: 'progress', progress: 1, i: index});
    self.postMessage({cmd: 'done', imageData: self.imageData, i: index});
    console.log("worker done: " + index);
}

function eventListener(e) {
    var data = e.data;

    switch(data.cmd) {
        case 'start':
            self.calcX = data.x;
            self.calcY = data.y;

            self.halfX = self.calcX / 2;
            self.halfY = self.calcY / 2;
            self.thirdX = self.calcX / 3;
            self.thirdY = self.calcY /  3;
            self.imageData = new Uint16Array(calcX*calcY);

            calculate(data.x, data.y, data.bailout, data.maxItr, data.i);
            break;
        default:
            console.log("unknown message: ", data);
    }
}

self.addEventListener('message', eventListener);
