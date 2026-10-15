/**
 * HisabSetu — Client-Side Receipt OCR Service
 * Powered by Tesseract.js Web Worker (100% offline-capable, local, private).
 * Supports English, Hindi, and Gujarati OCR recognition.
 */

import { createWorker } from 'tesseract.js';

export const SUPPORTED_OCR_LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'hin', label: 'Hindi (हिन्दी)' },
  { code: 'guj', label: 'Gujarati (ગુજરાતી)' }
];

/**
 * Preprocesses an image via an offscreen HTML Canvas:
 * Supports rotation (0, 90, 180, 270 deg) and contrast enhancement for receipt readability.
 */
export async function preprocessImage(imageSource, { rotation = 0, enhanceContrast = true } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const rads = (rotation % 360) * (Math.PI / 180);
        const isOrthogonal = (rotation % 180) !== 0;

        canvas.width = isOrthogonal ? img.height : img.width;
        canvas.height = isOrthogonal ? img.width : img.height;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rads);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Optional grayscale and contrast boost to enhance thermal receipt ink
        if (enhanceContrast) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          // Contrast factor
          const contrast = 1.2;
          const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

          for (let i = 0; i < data.length; i += 4) {
            // Grayscale luminance
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            // Contrast adjustment
            const adjusted = factor * (gray - 128) + 128;
            const clamped = Math.max(0, Math.min(255, adjusted));

            data[i] = clamped;
            data[i + 1] = clamped;
            data[i + 2] = clamped;
          }
          ctx.putImageData(imgData, 0, 0);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedUrl = URL.createObjectURL(blob);
              resolve({ processedUrl, blob });
            } else {
              resolve({ processedUrl: imageSource, blob: null });
            }
          },
          'image/jpeg',
          0.92
        );
      } catch (err) {
        console.warn('Canvas preprocessing fallback to original:', err);
        resolve({ processedUrl: imageSource, blob: null });
      }
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for preprocessing.'));
    };

    img.src = imageSource;
  });
}

/**
 * Executes OCR on an image file or object URL.
 *
 * @param {string|File|Blob} imageInput - The image URL or File
 * @param {Object} options
 * @param {string} options.language - OCR language code ('eng', 'hin', 'guj')
 * @param {Function} options.onProgress - Progress callback ({ status: string, progress: number })
 * @returns {Promise<{ success: boolean, text: string, confidence: number, error?: string }>}
 */
export async function recognizeReceiptText(imageInput, {
  language = 'eng',
  onProgress = () => {}
} = {}) {
  let worker = null;
  try {
    onProgress({ status: 'Initializing OCR Engine...', progress: 0.1 });

    // Validate language
    const validLang = SUPPORTED_OCR_LANGUAGES.some((l) => l.code === language) ? language : 'eng';

    worker = await createWorker(validLang, 1, {
      logger: (m) => {
        if (m && m.status) {
          const prog = m.progress !== undefined ? Math.min(1, Math.max(0, m.progress)) : 0;
          onProgress({
            status: m.status === 'recognizing text'
              ? `Recognizing text (${Math.round(prog * 100)}%)...`
              : `${m.status}...`,
            progress: 0.2 + prog * 0.75
          });
        }
      }
    });

    onProgress({ status: 'Analyzing receipt details...', progress: 0.85 });

    const ret = await worker.recognize(imageInput);
    const text = ret?.data?.text || '';
    const confidence = ret?.data?.confidence || 0;

    onProgress({ status: 'Extraction complete!', progress: 1.0 });

    const trimmed = text.trim();
    if (!trimmed) {
      return {
        success: false,
        text: '',
        confidence: 0,
        error: 'No readable text detected. Please ensure the receipt is well-lit and not blurry.'
      };
    }

    return {
      success: true,
      text: trimmed,
      confidence
    };
  } catch (err) {
    console.error('OCR Recognition failed:', err);
    return {
      success: false,
      text: '',
      confidence: 0,
      error: err.message || 'OCR processing failed. Please check the image and try again.'
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        console.warn('Worker terminate error:', termErr);
      }
    }
  }
}
