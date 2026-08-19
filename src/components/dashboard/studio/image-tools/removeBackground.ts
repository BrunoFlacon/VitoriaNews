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

  // Dynamic import to prevent Vite dev server crash from onnxruntime-web/webgpu resolution
  const { removeBackground } = await import('@imgly/background-removal');

  const blob = await removeBackground(imageSource, {
    progress: (key: string, current: number, total: number) => {
      onProgress?.(key, current, total);
    },
    output: {
      format,
      quality,
    },
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
