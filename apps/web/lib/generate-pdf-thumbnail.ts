/**
 * Generate a JPEG thumbnail from the first page of a PDF.
 * Returns null on any failure so callers can treat it as non-blocking.
 */
export async function generatePdfThumbnail(
  source: File | string,
  maxDimension = 400,
  quality = 0.8,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const docSource =
      source instanceof File ? { data: await source.arrayBuffer() } : source;
    const doc = await pdfjsLib.getDocument(docSource).promise;
    const page = await doc.getPage(1);

    const unscaled = page.getViewport({ scale: 1 });
    const scale = maxDimension / Math.max(unscaled.width, unscaled.height);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality),
    );

    doc.destroy();

    if (!blob) return null;
    return { blob, width: unscaled.width, height: unscaled.height };
  } catch {
    return null;
  }
}
