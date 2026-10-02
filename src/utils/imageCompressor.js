/**
 * Compresses and resizes an image file or dataUrl string
 * (e.g. from camera or photo library) using an offscreen HTML5 canvas
 * to keep uploads lightweight and snappy.
 *
 * @param {File|Blob|string} source - Original image file, blob, or dataUrl string
 * @param {number} maxDimension - Max width or height (default 1280px)
 * @param {number} quality - JPEG compression quality (0.0 to 1.0, default 0.82)
 * @returns {Promise<{ dataUrl: string, width: number, height: number, sizeBytes: number }>}
 */
export function compressImage(source, maxDimension = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!source) {
      return reject(new Error('No image source provided'));
    }

    const processDataUrl = (srcDataUrl, originalSizeBytes = 0) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image for compression'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          return resolve({
            dataUrl: srcDataUrl,
            width: img.width,
            height: img.height,
            sizeBytes: originalSizeBytes,
          });
        }

        // Draw image onto canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Estimate size in bytes from base64 string
        const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
        const sizeBytes = Math.round((base64Length * 3) / 4);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes,
        });
      };

      img.src = srcDataUrl;
    };

    if (typeof source === 'string') {
      const base64Length = source.length - (source.indexOf(',') + 1);
      processDataUrl(source, Math.round((base64Length * 3) / 4));
    } else if (source instanceof Blob || (typeof File !== 'undefined' && source instanceof File)) {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (event) => {
        processDataUrl(event.target.result, source.size);
      };
      reader.readAsDataURL(source);
    } else {
      reject(new Error('Invalid image source type'));
    }
  });
}
