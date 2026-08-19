/**
 * Object Cutout utility — clips an image to a polygon selection using Canvas API.
 * The user draws a freeform polygon around the object they want to keep,
 * and everything outside the polygon is made transparent.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Clip an image to a polygon path using Canvas API.
 *
 * @param imageDataUri - The source image data URI
 * @param polygon - Array of points defining the clip polygon (in image-relative coords)
 * @param imageWidth - Width of the output canvas
 * @param imageHeight - Height of the output canvas
 * @returns Data URI of the clipped image (PNG with transparency)
 */
export function clipImageToPolygon(
  imageDataUri: string,
  polygon: Point[],
  imageWidth: number,
  imageHeight: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (polygon.length < 3) {
      reject(new Error('Polígono precisa de pelo menos 3 pontos'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao criar canvas'));
        return;
      }

      // Draw the clipping path
      ctx.beginPath();
      ctx.moveTo(polygon[0].x, polygon[0].y);
      for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i].x, polygon[i].y);
      }
      ctx.closePath();
      ctx.clip();

      // Draw the image inside the clip path
      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem para recorte'));
    img.src = imageDataUri;
  });
}

/**
 * Crop an image to a rectangular region.
 *
 * @param imageDataUri - The source image data URI
 * @param cropX - X position of crop start (in image coords)
 * @param cropY - Y position of crop start (in image coords)
 * @param cropWidth - Width of the crop region
 * @param cropHeight - Height of the crop region
 * @param originalWidth - Original image width (for scaling)
 * @param originalHeight - Original image height (for scaling)
 * @returns Data URI of the cropped image
 */
export function cropImage(
  imageDataUri: string,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  originalWidth: number,
  originalHeight: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao criar canvas'));
        return;
      }

      // Scale if needed
      const scaleX = img.naturalWidth / originalWidth;
      const scaleY = img.naturalHeight / originalHeight;

      ctx.drawImage(
        img,
        cropX * scaleX, cropY * scaleY,
        cropWidth * scaleX, cropHeight * scaleY,
        0, 0,
        cropWidth, cropHeight,
      );

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem para corte'));
    img.src = imageDataUri;
  });
}
