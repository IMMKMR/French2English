import React, { useState, useEffect } from 'react';
import CameraView from './components/CameraView';
import { initOcr, recognizeText } from './lib/ocr';
import { initTranslator, translateText } from './lib/translator';
import { Languages, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState({ ocr: 0, translator: 0 });
  const [error, setError] = useState(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null); 
  const [isFirstCapture, setIsFirstCapture] = useState(true);

  useEffect(() => {
    const initializeEngines = async () => {
      try {
        await initOcr((progress) => {
          setInitProgress(prev => ({ ...prev, ocr: progress }));
        });
        
        await initTranslator((progress) => {
          setInitProgress(prev => ({ ...prev, translator: progress }));
        });
        
        setIsInitializing(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize models. Please ensure you are connected to internet for the first run.');
      }
    };
    
    initializeEngines();
  }, []);

  const handleCapture = async (imageDataUrl) => {
    setIsProcessing(true);
    try {
      const extractedText = await recognizeText(imageDataUrl);
      const cleanedText = extractedText.trim();
      
      // Update OCR result immediately so we know it's reading
      if (cleanedText) {
        setResult(prev => ({
          original: cleanedText,
          translated: prev?.translated || ''
        }));
      }

      // Skip translation if it's identical or totally empty
      if (!cleanedText || (result && result.original === cleanedText)) {
        return;
      }
      
      const translated = await translateText(cleanedText);
      
      setResult({
        original: cleanedText,
        translated: translated
      });
      setIsFirstCapture(false);
      
    } catch (err) {
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-icon-wrapper">
          <Languages size={32} color="white" />
        </div>
        <h1 className="app-title">Live Translator</h1>
        <p className="app-subtitle">French to English • 100% Offline</p>
      </header>

      <main className="main-layout">
        <div className="left-panel">
          {isInitializing ? (
            <div className="glass-panel init-panel">
              <div className="spinner"></div>
              <h2>Initializing Models</h2>
              <p className="subtitle-text">
                Downloading models on first run. This might take a few moments. They will be cached for offline use.
              </p>
              
              <div className="progress-container">
                <div className="progress-group">
                  <div className="progress-labels">
                    <span>OCR Engine</span>
                    <span>{Math.round(initProgress.ocr * 100)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill primary-fill" style={{ width: `${initProgress.ocr * 100}%` }}></div>
                  </div>
                </div>
                <div className="progress-group">
                  <div className="progress-labels">
                    <span>Translation Model</span>
                    <span>{Math.round(initProgress.translator * 100)}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill accent-fill" style={{ width: `${initProgress.translator * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="glass-panel error-panel">
              <AlertCircle size={48} className="error-icon" />
              <p>{error}</p>
            </div>
          ) : (
            <CameraView onCapture={handleCapture} />
          )}
        </div>

        <div className="right-panel">
          <AnimatePresence>
            {!isInitializing && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel result-panel original-panel"
              >
                <div className="panel-accent-border primary-border"></div>
                <h3>Detected French</h3>
                <div className="result-box">
                  {isFirstCapture && isProcessing ? (
                    <div className="skeleton-loader">
                      <div className="skeleton-line w-75"></div>
                      <div className="skeleton-line w-50"></div>
                    </div>
                  ) : result?.original ? (
                    <p className="result-text">{result.original}</p>
                  ) : (
                    <p className="placeholder-text">Point camera at text to translate...</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!isInitializing && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-panel result-panel translated-panel"
              >
                <div className="panel-accent-border success-border"></div>
                <h3>English Translation</h3>
                <div className="result-box">
                  {isFirstCapture && isProcessing ? (
                    <div className="skeleton-loader">
                      <div className="skeleton-line w-100 mt-2"></div>
                      <div className="skeleton-line w-75"></div>
                    </div>
                  ) : result?.translated ? (
                    <p className="result-text translated-text">{result.translated}</p>
                  ) : (
                    <p className="placeholder-text">Translation will appear here...</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
