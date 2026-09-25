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
