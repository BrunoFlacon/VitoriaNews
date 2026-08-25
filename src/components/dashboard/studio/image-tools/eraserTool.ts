/**
 * Eraser Tools — Photoshop-style eraser operations for image layers.
 *
 * Modes:
 *   - Basic Eraser: Paints with `destination-out` to erase pixels in a brush stroke
 *   - Magic Eraser: Flood-fill erases contiguous pixels of similar color
 *   - Pixel Eraser: Hard-edge eraser for precise pixel removal
 */

export type EraserMode = 'basic' | 'magic' | 'pixel';

export interface EraserOptions {
  mode: EraserMode;
  /** Brush radius in pixels (basic & pixel modes) */
  size: number;
  /** Softness 0-100: 0 = hard edge, 100 = fully soft feathered edge */
  softness: number;
  /** Tolerance 0-100 for magic eraser (color similarity threshold) */
  tolerance: number;
  /** Whether to erase all matching pixels or only contiguous ones */
  contiguous: boolean;
}

const DEFAULT_OPTIONS: EraserOptions = {
  mode: 'basic',
  size: 20,
  softness: 50,
  tolerance: 30,
  contiguous: true,
};

/**
 * Erase pixels along a brush stroke on an image layer.
 * Returns a new data URI with the erased content.
 *
 * @param imageDataUri - Source image data URI
 * @param strokePoints - Array of {x, y} points in image-relative coordinates
 * @param imageWidth - Width of the image canvas
 * @param imageHeight - Height of the image canvas
 * @param options - Eraser configuration
 */
export function eraseBrushStroke(
  imageDataUri: string,
  strokePoints: { x: number; y: number }[],
  imageWidth: number,
  imageHeight: number,
  options: Partial<EraserOptions> = {},
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Falha ao criar canvas')); return; }

      // Draw original image
      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

      if (opts.mode === 'magic') {
        // Magic eraser: flood-fill from each point
        const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
        const visited = new Uint8Array(imageWidth * imageHeight);

        for (const pt of strokePoints) {
          floodFillErase(
            imageData.data, visited,
            Math.round(pt.x), Math.round(pt.y),
            imageWidth, imageHeight,
            opts.tolerance, opts.contiguous,
          );
        }
        ctx.putImageData(imageData, 0, 0);
      } else {
        // Basic / Pixel eraser: draw with destination-out
        ctx.globalCompositeOperation = 'destination-out';

        if (opts.mode === 'pixel') {
          // Hard-edge pixel eraser
          ctx.globalAlpha = 1;
          for (const pt of strokePoints) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, opts.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Basic eraser with softness
          for (const pt of strokePoints) {
            const radius = opts.size / 2;
            if (opts.softness > 0) {
              // Radial gradient for soft edge
              const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
              const innerAlpha = 1 - (opts.softness / 100) * 0.8;
              grad.addColorStop(0, `rgba(0,0,0,${innerAlpha})`);
              grad.addColorStop(0.5, `rgba(0,0,0,${innerAlpha * 0.7})`);
              grad.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = grad;
            } else {
              ctx.fillStyle = 'rgba(0,0,0,1)';
            }
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem para apagar'));
    img.src = imageDataUri;
  });
}

/**
 * Flood-fill erase: makes pixels transparent based on color similarity.
 * Uses a scanline flood-fill algorithm for performance.
 */
function floodFillErase(
  data: Uint8ClampedArray,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number,
  tolerance: number,
  contiguous: boolean,
) {
  const idx = (startY * width + startX) * 4;
  if (idx < 0 || idx >= data.length) return;

  const targetR = data[idx];
  const targetG = data[idx + 1];
  const targetB = data[idx + 2];
  const targetA = data[idx + 3];

  if (targetA === 0) return; // already transparent

  const tolSq = (tolerance / 100) * 255;
  const tolSqNorm = tolSq * tolSq * 3;

  const matchesTarget = (i: number) => {
    const dr = data[i] - targetR;
    const dg = data[i + 1] - targetG;
    const db = data[i + 2] - targetB;
    const da = data[i + 3] - targetA;
    return (dr * dr + dg * dg + db * db + da * da) <= tolSqNorm * 4;
  };

  if (!contiguous) {
    // Non-contiguous: erase ALL matching pixels in the image
    for (let i = 0; i < data.length; i += 4) {
      if (matchesTarget(i)) {
        data[i + 3] = 0;
      }
    }
    return;
  }

  // Contiguous: BFS flood-fill
  const queue: number[] = [startX, startY];
  visited[startY * width + startX] = 1;

  while (queue.length > 0) {
    const y = queue.pop()!;
    const x = queue.pop()!;
    const ci = (y * width + x) * 4;

    if (!matchesTarget(ci)) continue;

    // Erase pixel
    data[ci + 3] = 0;

    // Check 4-connected neighbors
    const neighbors = [
      [x - 1, y], [x + 1, y],
      [x, y - 1], [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const ni = ny * width + nx;
      if (visited[ni]) continue;
      visited[ni] = 1;

      const pi = ni * 4;
      if (matchesTarget(pi)) {
        queue.push(nx, ny);
      }
    }
  }
}

/**
 * Smart Selection Brush — detects edges and creates a selection mask.
 * Uses a simplified Sobel edge detector + flood-fill.
 *
 * Returns a mask data URI (white = selected, black = not selected).
 */
export function smartEdgeDetect(
  imageDataUri: string,
  imageWidth: number,
  imageHeight: number,
  sensitivity: number = 50,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Falha ao criar canvas')); return; }

      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
      const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
      const data = imageData.data;

      // Create grayscale
      const gray = new Float32Array(imageWidth * imageHeight);
      for (let i = 0; i < gray.length; i++) {
        const pi = i * 4;
        gray[i] = data[pi] * 0.299 + data[pi + 1] * 0.587 + data[pi + 2] * 0.114;
      }

      // Sobel edge detection
      const edges = new Float32Array(imageWidth * imageHeight);
      const threshold = (sensitivity / 100) * 200;

      for (let y = 1; y < imageHeight - 1; y++) {
        for (let x = 1; x < imageWidth - 1; x++) {
          const idx = y * imageWidth + x;
          // Sobel X
          const gx =
            -gray[(y - 1) * imageWidth + (x - 1)] + gray[(y - 1) * imageWidth + (x + 1)] +
            -2 * gray[y * imageWidth + (x - 1)] + 2 * gray[y * imageWidth + (x + 1)] +
            -gray[(y + 1) * imageWidth + (x - 1)] + gray[(y + 1) * imageWidth + (x + 1)];
          // Sobel Y
          const gy =
            -gray[(y - 1) * imageWidth + (x - 1)] - 2 * gray[(y - 1) * imageWidth + x] - gray[(y - 1) * imageWidth + (x + 1)] +
            gray[(y + 1) * imageWidth + (x - 1)] + 2 * gray[(y + 1) * imageWidth + x] + gray[(y + 1) * imageWidth + (x + 1)];

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          edges[idx] = magnitude > threshold ? 255 : 0;
        }
      }

      // Create mask output
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageWidth;
      maskCanvas.height = imageHeight;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) { reject(new Error('Falha ao criar máscara')); return; }

      const maskData = maskCtx.createImageData(imageWidth, imageHeight);
      for (let i = 0; i < edges.length; i++) {
        const pi = i * 4;
        const val = edges[i];
        maskData.data[pi] = val;
        maskData.data[pi + 1] = val;
        maskData.data[pi + 2] = val;
        maskData.data[pi + 3] = val > 0 ? 255 : 0;
      }
      maskCtx.putImageData(maskData, 0, 0);

      resolve(maskCanvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem para detecção de bordas'));
    img.src = imageDataUri;
  });
}

/**
 * Color Region Extractor — identifies distinct color regions in an image
 * and extracts them as separate layers.
 *
 * Uses a simple k-means-inspired color quantization approach.
 */
export interface ExtractedRegion {
  mask: string; // data URI of the mask
  dominantColor: string; // hex color
  bounds: { x: number; y: number; width: number; height: number };
  label: string;
}

export function extractColorRegions(
  imageDataUri: string,
  imageWidth: number,
  imageHeight: number,
  numRegions: number = 5,
): Promise<ExtractedRegion[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Falha ao criar canvas')); return; }

      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
      const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
      const data = imageData.data;
      const totalPixels = imageWidth * imageHeight;

      // Sample pixels for color quantization (take every 4th pixel for speed)
      const samples: [number, number, number][] = [];
      for (let i = 0; i < data.length; i += 16) {
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }

      // Simple k-means clustering
      const centroids: [number, number, number][] = [];
      for (let i = 0; i < numRegions; i++) {
        const idx = Math.floor((i / numRegions) * samples.length);
        centroids.push([...samples[idx]]);
      }

      // Run 3 iterations of k-means
      for (let iter = 0; iter < 3; iter++) {
        const sums: [number, number, number][] = Array.from({ length: numRegions }, () => [0, 0, 0]);
        const counts = new Array(numRegions).fill(0);

        for (const [r, g, b] of samples) {
          let minDist = Infinity;
          let minIdx = 0;
          for (let c = 0; c < centroids.length; c++) {
            const dr = r - centroids[c][0];
            const dg = g - centroids[c][1];
            const db = b - centroids[c][2];
            const dist = dr * dr + dg * dg + db * db;
            if (dist < minDist) { minDist = dist; minIdx = c; }
          }
          sums[minIdx][0] += r;
          sums[minIdx][1] += g;
          sums[minIdx][2] += b;
          counts[minIdx]++;
        }

        for (let c = 0; c < numRegions; c++) {
          if (counts[c] > 0) {
            centroids[c] = [
              Math.round(sums[c][0] / counts[c]),
              Math.round(sums[c][1] / counts[c]),
              Math.round(sums[c][2] / counts[c]),
            ];
          }
        }
      }

      // Create masks for each region
      const regions: ExtractedRegion[] = [];
      const regionPixels = new Uint8Array(totalPixels);

      // Assign each pixel to nearest centroid
      for (let i = 0; i < totalPixels; i++) {
        const pi = i * 4;
        const r = data[pi], g = data[pi + 1], b = data[pi + 2], a = data[pi + 3];
        if (a < 128) { regionPixels[i] = 255; continue; } // transparent = skip

        let minDist = Infinity;
        let minIdx = 0;
        for (let c = 0; c < centroids.length; c++) {
          const dr = r - centroids[c][0];
          const dg = g - centroids[c][1];
          const db = b - centroids[c][2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < minDist) { minDist = dist; minIdx = c; }
        }
        regionPixels[i] = minIdx;
      }

      // Generate mask + bounding box for each region
      for (let c = 0; c < numRegions; c++) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = imageWidth;
        maskCanvas.height = imageHeight;
        const maskCtx = maskCanvas.getContext('2d')!;
        const maskData = maskCtx.createImageData(imageWidth, imageHeight);

        let minX = imageWidth, minY = imageHeight, maxX = 0, maxY = 0;
        let count = 0;

        for (let i = 0; i < totalPixels; i++) {
          if (regionPixels[i] === c) {
            const pi = i * 4;
            const x = i % imageWidth;
            const y = Math.floor(i / imageWidth);
            maskData.data[pi] = 255;
            maskData.data[pi + 1] = 255;
            maskData.data[pi + 2] = 255;
            maskData.data[pi + 3] = 255;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            count++;
          }
        }

        maskCtx.putImageData(maskData, 0, 0);

        const pct = ((count / totalPixels) * 100).toFixed(1);
        const hex = '#' + centroids[c].map(v => v.toString(16).padStart(2, '0')).join('');

        regions.push({
          mask: maskCanvas.toDataURL('image/png'),
          dominantColor: hex,
          bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
          label: `Região ${c + 1} (${pct}%)`,
        });
      }

      // Sort by area (largest first)
      regions.sort((a, b) => (b.bounds.width * b.bounds.height) - (a.bounds.width * a.bounds.height));

      resolve(regions);
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem para extração'));
    img.src = imageDataUri;
  });
}

/**
 * Extract foreground from background using color distance.
 * Creates a mask that separates the foreground (different from background color)
 * from the background.
 */
export function extractForeground(
  imageDataUri: string,
  imageWidth: number,
  imageHeight: number,
  bgSampleX: number = 0,
  bgSampleY: number = 0,
  tolerance: number = 30,
): Promise<{ foreground: string; background: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Falha ao criar canvas')); return; }

      ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
      const imageData = ctx.getImageData(0, 0, imageWidth, imageHeight);
      const data = imageData.data;

      // Sample background color from corner
      const bgIdx = (Math.round(bgSampleY) * imageWidth + Math.round(bgSampleX)) * 4;
      const bgR = data[bgIdx], bgG = data[bgIdx + 1], bgB = data[bgIdx + 2];

      const tolSq = (tolerance / 100) * 255;
      const isBg = (i: number) => {
        const dr = data[i] - bgR;
        const dg = data[i + 1] - bgG;
        const db = data[i + 2] - bgB;
        return (dr * dr + dg * dg + db * db) < tolSq * tolSq * 3;
      };

      // Create foreground mask
      const fgCanvas = document.createElement('canvas');
      fgCanvas.width = imageWidth;
      fgCanvas.height = imageHeight;
      const fgCtx = fgCanvas.getContext('2d')!;
      const fgData = fgCtx.createImageData(imageWidth, imageHeight);

      // Create background mask
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = imageWidth;
      bgCanvas.height = imageHeight;
      const bgCtx = bgCanvas.getContext('2d')!;
      const bgData = bgCtx.createImageData(imageWidth, imageHeight);

      for (let i = 0; i < data.length; i += 4) {
        if (isBg(i)) {
          // Background pixel: keep in bg, transparent in fg
          bgData.data[i] = data[i];
          bgData.data[i + 1] = data[i + 1];
          bgData.data[i + 2] = data[i + 2];
          bgData.data[i + 3] = data[i + 3];
          fgData.data[i + 3] = 0;
        } else {
          // Foreground pixel: keep in fg, transparent in bg
          fgData.data[i] = data[i];
          fgData.data[i + 1] = data[i + 1];
          fgData.data[i + 2] = data[i + 2];
          fgData.data[i + 3] = data[i + 3];
          bgData.data[i + 3] = 0;
        }
      }

      fgCtx.putImageData(fgData, 0, 0);
      bgCtx.putImageData(bgData, 0, 0);

      resolve({
        foreground: fgCanvas.toDataURL('image/png'),
        background: bgCanvas.toDataURL('image/png'),
      });
    };
    img.onerror = () => reject(new Error('Falha ao carregar imagem'));
    img.src = imageDataUri;
  });
}
