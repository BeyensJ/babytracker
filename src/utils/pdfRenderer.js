import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch (err) {
    console.warn('[PDFRenderer] Could not set workerSrc:', err);
  }
}

/**
 * Render a PDF (dataUrl, ArrayBuffer, or Blob) to an image data URL (JPEG/PNG/WebP).
 * If multi-page, renders up to maxPages pages vertically stitched.
 * 
 * @param {string|ArrayBuffer|Blob|Uint8Array} source 
 * @param {Object} [options]
 * @param {number} [options.scale=1.75]
 * @param {number} [options.maxPages=5]
 * @param {number} [options.quality=0.88]
 * @param {string} [options.format='image/jpeg']
 * @returns {Promise<string>} dataUrl of rendered image
 */
export async function renderPdfToImage(source, options = {}) {
  const {
    scale = 1.75,
    maxPages = 5,
    quality = 0.88,
    format = 'image/jpeg',
  } = options;

  let loadingTask;

  if (typeof source === 'string' && source.startsWith('data:')) {
    const base64Data = source.split(',')[1];
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    loadingTask = pdfjsLib.getDocument({ data: bytes });
  } else if (source instanceof Blob) {
    const arrayBuffer = await source.arrayBuffer();
    loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  } else if (source instanceof ArrayBuffer) {
    loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(source) });
  } else if (source instanceof Uint8Array) {
    loadingTask = pdfjsLib.getDocument({ data: source });
  } else {
    loadingTask = pdfjsLib.getDocument(source);
  }

  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, maxPages);

  if (numPages === 0) {
    throw new Error('PDF has no pages');
  }

  const pageCanvases = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    // Fill white background for pages that might have transparency
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    pageCanvases.push(canvas);
    totalHeight += canvas.height;
    maxWidth = Math.max(maxWidth, canvas.width);
  }

  if (pageCanvases.length === 1) {
    return pageCanvases[0].toDataURL(format, quality);
  }

  // Multi-page stitching:
  const dividerHeight = 12;
  const combinedCanvas = document.createElement('canvas');
  combinedCanvas.width = maxWidth;
  combinedCanvas.height = totalHeight + (pageCanvases.length - 1) * dividerHeight;
  const combinedCtx = combinedCanvas.getContext('2d');

  combinedCtx.fillStyle = '#F8FAFC';
  combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

  let currentY = 0;
  for (let i = 0; i < pageCanvases.length; i++) {
    const pCanvas = pageCanvases[i];
    const offsetX = Math.floor((maxWidth - pCanvas.width) / 2);
    combinedCtx.drawImage(pCanvas, offsetX, currentY);
    currentY += pCanvas.height;

    if (i < pageCanvases.length - 1) {
      combinedCtx.fillStyle = '#CBD5E1';
      combinedCtx.fillRect(16, currentY + Math.floor(dividerHeight / 2) - 1, maxWidth - 32, 2);
      currentY += dividerHeight;
    }
  }

  return combinedCanvas.toDataURL(format, quality);
}
