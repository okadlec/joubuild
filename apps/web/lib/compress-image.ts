/**
 * Compress an image file by resizing and re-encoding as JPEG.
 *
 * @param file       The original image File
 * @param maxDimension  Max width/height in pixels (default 1920)
 * @param quality    JPEG quality 0–1 (default 0.8)
 * @returns          Compressed Blob (JPEG) — or original file if compression fails
 */
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.8,
): Promise<Blob> {
  // Only compress raster images
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise<Blob>((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Skip if already smaller than max
      if (width <= maxDimension && height <= maxDimension) {
        // Still re-encode as JPEG to reduce size
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => resolve(blob || file),
          'image/jpeg',
          quality,
        );
        return;
      }

      // Scale down proportionally
      if (width > height) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob || file),
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}
