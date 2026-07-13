/**
 * Prepare photos for upload so they fit hosting limits.
 *
 * Vercel serverless functions reject request bodies over ~4.5 MB
 * ("Payload Too Large" / "Entity Too Large"). Phone photos are often
 * 5–12 MB, so we resize/compress images in the browser first.
 */

/** Stay under Vercel’s ~4.5 MB body limit (multipart overhead included). */
export const MAX_API_UPLOAD_BYTES = 3.5 * 1024 * 1024;

const MAX_DIMENSION = 2048;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.55;

function isCompressibleImage(file: File): boolean {
  if (!file.type.startsWith('image/')) return false;
  // Leave formats that canvas can't reliably rewrite alone.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return false;
  return true;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'photo';
}

/**
 * Resize and JPEG-compress an image so it can safely pass through our API.
 * Returns the original file if compression isn't needed or isn't possible.
 */
export async function compressImageForUpload(
  file: File,
  onStatus?: (message: string) => void
): Promise<File> {
  if (!isCompressibleImage(file)) return file;

  // Small files under the limit still get lightly resized if enormous dimensions
  // would produce a huge re-export — but usually we skip when already small.
  const alreadySmall = file.size <= MAX_API_UPLOAD_BYTES;

  try {
    onStatus?.('Optimizing photo for upload…');

    const bitmap = await createImageBitmap(file);
    try {
      let { width, height } = bitmap;

      if (alreadySmall && width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        return file;
      }

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.drawImage(bitmap, 0, 0, width, height);

      let quality = INITIAL_QUALITY;
      let blob: Blob | null = null;

      while (quality >= MIN_QUALITY) {
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
        );
        if (blob && blob.size <= MAX_API_UPLOAD_BYTES) break;
        quality -= 0.08;
      }

      if (!blob) return file;

      // Prefer original if compression made it worse or barely helped a small file.
      if (blob.size >= file.size * 0.98 && file.size <= MAX_API_UPLOAD_BYTES) {
        return file;
      }

      const optimized = new File([blob], `${baseName(file.name)}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      onStatus?.(
        `Optimized ${Math.round(file.size / 1024)}KB → ${Math.round(optimized.size / 1024)}KB`
      );

      return optimized;
    } finally {
      bitmap.close();
    }
  } catch (err) {
    console.warn('Image compression skipped:', err);
    return file;
  }
}

/**
 * Prepare any admin media file for upload (compress images when possible).
 */
export async function prepareFileForUpload(
  file: File,
  onStatus?: (message: string) => void
): Promise<File> {
  if (file.type.startsWith('image/')) {
    return compressImageForUpload(file, onStatus);
  }
  return file;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
