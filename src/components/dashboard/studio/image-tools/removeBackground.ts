/**
 * Background Removal utility using @imgly/background-removal (client-side ML).
 * Runs entirely in the browser via ONNX Runtime WebAssembly — no API key needed.
 *
 * @see https://github.com/imgly/background-removal-js
 *
 * IMPORTANT: The @imgly/background-removal import is dynamic to prevent Vite dev server
 * from crashing when it can't resolve onnxruntime-web/webgpu subpath exports.
 */

export interface RemoveBackgroundOptions {
  /** Progress callback: (stage, current, total) */
  onProgress?: (stage: string, current: number, total: number) => void;
  /** Output format (default: 'image/png') */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Output quality for lossy formats (0-1, default: 0.8) */
  quality?: number;
}

/**
 * Convert a data URI to a Blob (avoids CSP fetch(data:) issues).
 */
function dataUriToBlob(dataUri: string): Blob {
  const [header, base64Data] = dataUri.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Remove the background from an image URL or data URI.
 * Returns a new data URI with transparent background (PNG).
 *
 * @param imageSource - Image URL, data URI, or File/Blob
 * @param options - Optional configuration
 * @returns Data URI with transparent background
 */
export async function removeImageBackground(
  imageSource: string | File | Blob,
  options: RemoveBackgroundOptions = {},
): Promise<string> {
  const { format = 'image/png', quality = 0.8, onProgress } = options;

  // Convert data URIs to Blob to bypass CSP connect-src restrictions on data: scheme
  let source: string | Blob = imageSource;
  if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    source = dataUriToBlob(imageSource);
  }

  // Dynamic import to prevent Vite dev server crash from onnxruntime-web/webgpu resolution
  const { removeBackground } = await import('@imgly/background-removal');

  const blob = await removeBackground(source, {
    progress: (key: string, current: number, total: number) => {
      onProgress?.(key, current, total);
    },
    output: {
      format,
      quality,
    },
    publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/',
    device: 'cpu',
  });

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao converter resultado para data URI'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
