#include <stdio.h>
#include <stdlib.h>
#include <math.h>

/*
   Crude, but functional, little program to calculate the
   So called "budda mandelbrot" or "buddhabrot"
   Please note that this is not supposed to be the most efficient
   implementation, it is only intended to be a simple example with
   plenty of scope for improvement by the reader.
*/

#define TRUE  1
#define FALSE 0
#define MAX(x,y) (x > y ? x : y)
#define MIN(x,y) (x < y ? x : y)

// Image dimensions
#define NX 1000
#define NY 1000

// Length of sequece to test escape status
// Also known as bailout
#define NMAX 200

// Number of iterations, multiples of 1 million
#define TMAX (1000L)

typedef struct {
   double x,y;
} XY;

// Prototypes
void WriteImage(char *,unsigned int *,int,int);
int Iterate(double,double,int *,XY *);

int main(int argc,char **argv) 
{
   int i,n,ix,iy;
   long t,tt;
   double x,y;
   XY *xyseq = NULL;

   // The density plot
   unsigned int *image = NULL;

   // Malloc space for the image and clear to black
   if ((image = (unsigned int *)malloc(NX*NY*sizeof(unsigned int))) == NULL) {
      fprintf(stderr,"Failed to malloc memory for the image\n");
      exit(-1);
   }
   for (i=0;i<NX*NY;i++) 
      image[i] = 0;

   // Malloc space for the sequence
   xyseq = (XY *)malloc(NMAX*sizeof(XY));

   // Iterate
	for (tt=0;tt<1000000;tt++) {
   	for (t=0;t<TMAX;t++) {

      	// Choose a random point in same range 
      	x = 6 * drand48() - 3;
      	y = 6 * drand48() - 3;

      	// Determine state of this point, draw if it escapes 
      	if (Iterate(x,y,&n,xyseq)) {
         	for (i=0;i<n;i++) {
            	ix = 0.3 * NX * (xyseq[i].x + 0.5) + NX/2;
            	iy = 0.3 * NY * xyseq[i].y + NY/2;
            	if (ix >= 0 && iy >= 0 && ix < NX && iy < NY)
               	image[iy*NX+ix]++;
				}
         }
      } / t
   } // tt

   // Save the result 
   WriteImage("buddha_single.tga",image,NX,NY);

   exit(0);
}

/*
   Write the buddha image to a minimal TGA file.
   Can be opened with gimp, PhotoShop, etc.
*/
void WriteImage(char *fname,unsigned int *image,int width,int height)
{
   int i;
   float ramp,biggest=0,smallest;
   FILE *fptr;

   // Find the largest density value
   for (i=0;i<width*height;i++)
      biggest = MAX(biggest,image[i]);
   smallest = biggest;
   for (i=0;i<width*height;i++)
      smallest = MIN(smallest,image[i]);
   fprintf(stderr,"Density value range: %g to %g\n",smallest,biggest);

   // Write the image
   fprintf(stderr,"Writing \"%s\"\n",fname);
   if ((fptr = fopen(fname,"wb")) == NULL) {
      fprintf(stderr,"Failed to open output file\n");
      exit(0);
   }
   
   // TGA header, endian independent
   putc(0,fptr);  /* Length of ID */
   putc(0,fptr);  /* No colour map */
   putc(2,fptr); /* uncompressed RGB  */
   putc(0,fptr); /* Index of colour map entry */
   putc(0,fptr);
   putc(0,fptr); /* Colour map length */
   putc(0,fptr);
   putc(0,fptr); /* Colour map size */
   putc(0,fptr); /* X origin */
   putc(0,fptr);
   putc(0,fptr); /* Y origin */
   putc(0,fptr);
   putc((width & 0x00ff),fptr); /* X width */
   putc((width & 0xff00) / 256,fptr);
   putc((height & 0x00ff),fptr); /* Y width */
   putc((height & 0xff00) / 256,fptr);
   putc(24,fptr);                      /* 24 bit bitmap     */
   putc(0x00,fptr);

   // Raw uncompressed bytes
   for (i=0;i<width*height;i++) {
      ramp = 2*(image[i] - smallest) / (biggest - smallest);
      if (ramp > 1)
         ramp = 1;
      ramp = pow(ramp,0.5);
      fputc((int)(ramp*255),fptr);
      fputc((int)(ramp*255),fptr);
      fputc((int)(ramp*255),fptr);
   }
   fclose(fptr);
}

/*
   Iterate the Mandelbrot and return TRUE if the point escapes
*/
int Iterate(double x0,double y0,int *n,XY *seq)
{
   int i;
   double x=0,y=0,xnew,ynew;

   *n = 0;
   for (i=0;i<NMAX;i++) {
      xnew = x * x - y * y + x0;
      ynew = 2 * x * y + y0;
      seq[i].x = xnew;
      seq[i].y = ynew;
      if (xnew*xnew + ynew*ynew > 10) {
         *n = i;
         return(TRUE);   
      }
      x = xnew;
      y = ynew;
   }

   return(FALSE);
}

