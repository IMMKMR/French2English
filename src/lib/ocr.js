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
    // Setting PSM to 3 (default) or 4 (assume a single column of text of variable sizes) usually works best.
    // 11 can be overly sensitive and read garbage from shadows. We will use 3 (fully automatic).
    await worker.setParameters({
      tessedit_pageseg_mode: '3', 
      tessjs_create_pdf: '0',
      tessjs_create_hocr: '0'
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
