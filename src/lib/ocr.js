import Tesseract from 'tesseract.js';

let worker = null;

export const initOcr = async (onProgress) => {
  if (!worker) {
    worker = await Tesseract.createWorker('fra', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          onProgress(m.progress);
        }
      }
    });
    // Use PSM 11 (Sparse text) which is much better for finding text on objects/labels with varied layouts
    await worker.setParameters({
      tessedit_pageseg_mode: '11', 
      tessjs_create_pdf: '0',
      tessjs_create_hocr: '0',
      tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?-\'éèêëàâçîïôùûüÉÈÊËÀÂÇÎÏÔÙÛÜ '
    });
  }
  return worker;
};

export const recognizeText = async (imageElement) => {
  if (!worker) {
    throw new Error('OCR Worker not initialized. Call initOcr first.');
  }
  const { data: { text } } = await worker.recognize(imageElement);
  return text;
};

export const terminateOcr = async () => {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
};
