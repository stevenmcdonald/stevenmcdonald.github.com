// Buddhabrot
// j.tarbell   January, 2004
// Albuquerque, New Mexico
// complexification.net

// based on code by Paul Bourke
// astronomy.swin.edu.au/~pbourke/

// Processing 0085 Beta syntax update
// j.tarbell   April, 2005

int dim = 200;             // screen dimensions (square window)
int bailout = 200;         // number of iterations before bail
int plots = 10000;        // number of plots to execute per frame (x30 = plots per second)

// 2D array to hold exposure values
int[] exposure = new int[dim*dim];
int maxexposure;           // maximum exposure value
int time = 0;
int exposures = 0;

boolean drawing;
PFont metaBold;

//  MAIN ----------------------------------------------------------------

void setup() {
  // set up drawing area
  size(200,200,P3D);
  background(0);
  // take it nice and easy
  framerate(15);
  // load typeface
  metaBold = loadFont("Arial-48.vlw");
}

void draw() {
  plotPlots();
  time++;
  if (time%30==0) {
    // show progress every 2 seconds or so...
    findMaxExposure();
    renderBrot();
    // show exposure value
    fill(255);
    noStroke();
    textFont(metaBold, 14);
    text("bailout:  "+bailout+"    exposures: "+exposures, 5, dim-6);
  }
}

void plotPlots() {
  float x, y;
  // iterate through some plots
  for (int n=0;n<plots;n++) {
    // Choose a random point in same range
    x = random(-2.0,1.0);
    y = random(-1.5,1.5);
    if (iterate(x,y,false)) {
      iterate(x,y,true);
      exposures++;
    }
  }
}

void renderBrot() {
  // draw to screen
  for (int i=0;i<dim;i++) {
    for (int j=0;j<dim;j++) {
      float ramp = exposure[i*dim+j] / (maxexposure / 2.5);
      // blow out ultra bright regions
      if (ramp > 1)  {
        ramp = 1;
      }
      color c = color(int(ramp*255), int(ramp*255), int(ramp*255));
      set(j,i,c);
    }
  }
}

//   Iterate the Mandelbrot and return TRUE if the point exits
//   Also handle the drawing of the exit points
boolean iterate(float x0, float y0, boolean drawIt) {
  float x = 0;
  float y = 0;
  float xnew, ynew;
  int ix,iy;

  for (int i=0;i<bailout;i++) {
    xnew = x * x - y * y + x0;
    ynew = 2 * x * y + y0;
    if (drawIt && (i > 3)) {
      ix = int(dim * (xnew + 2.0) / 3.0);
      iy = int(dim * (ynew + 1.5) / 3.0);
      if (ix >= 0 && iy >= 0 && ix < dim && iy < dim) {
        // rotate and expose point
        exposure[ix*dim+iy]++;
      }

    }
    if ((xnew*xnew + ynew*ynew) > 4) {
      // escapes
      return true;
    }
    x = xnew;
    y = ynew;
  }
  // does not escape
  return false;
}

void findMaxExposure() {
  // assume no exposure
  maxexposure=0;
  // find the largest density value
  for (int i=0;i<dim;i++) {
    for (int j=0;j<dim;j++) {
      maxexposure = max(maxexposure,exposure[i*dim+j]);
    }
  }
}

// Buddhabrot
// j.tarbell   January, 2004
