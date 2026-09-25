import { pipeline, env } from '@xenova/transformers';

// Skip local check, download models from Hugging Face if not available in cache
env.allowLocalModels = false;

let translatorPipeline = null;

export const initTranslator = async (onProgress) => {
  if (!translatorPipeline) {
    translatorPipeline = await pipeline('translation', 'Xenova/opus-mt-fr-en', {
      progress_callback: (x) => {
        if (x.status === 'progress' && x.file === 'onnx/decoder_model_merged_quantized.onnx') {
          onProgress(x.progress / 100);
        }
      }
    });
  }
  return translatorPipeline;
};

export const translateText = async (text) => {
  if (!translatorPipeline) {
    throw new Error('Translator not initialized. Call initTranslator first.');
  }
  if (!text || text.trim() === '') return '';
  
  // The pipeline returns an array of objects
  const output = await translatorPipeline(text);
  return output[0]?.translation_text || '';
};
