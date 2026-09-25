import React, { useState, useEffect, useRef, useCallback } from 'react';
import CameraView from './components/CameraView';
import { initOcr, recognizeText } from './lib/ocr';
import { initTranslator, translateText } from './lib/translator';
import { Languages, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState({ ocr: 0, translator: 0 });
  const [error, setError] = useState(null);
  
  const [result, setResult] = useState(null); 
  const [debugLog, setDebugLog] = useState("Waiting for models to load...");
  
  // Use a ref to track last OCR text to avoid stale closures
  const lastOcrTextRef = useRef('');

  useEffect(() => {
    const initializeEngines = async () => {
      try {
        setDebugLog("Loading OCR engine...");
        await initOcr((progress) => {
          setInitProgress(prev => ({ ...prev, ocr: progress }));
        });
        
        setDebugLog("Loading translation model...");
        await initTranslator((progress) => {
          setInitProgress(prev => ({ ...prev, translator: progress }));
        });
        
        setDebugLog("Ready! Scanning will begin shortly...");
        setIsInitializing(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize models. Please ensure you are connected to internet for the first run.');
      }
    };
    
    initializeEngines();
  }, []);

  const handleCapture = useCallback(async (imageDataUrl) => {
    setDebugLog("Scanning frame...");
    try {
      const extractedText = await recognizeText(imageDataUrl);
      const cleanedText = extractedText.trim();
      
      if (!cleanedText) {
        setDebugLog("No text detected. Trying again...");
        return;
      }
      
      setDebugLog(`Found: "${cleanedText.substring(0, 50)}..." — Translating...`);

      // Show detected text immediately
      setResult(prev => ({
        original: cleanedText,
        translated: prev?.translated || 'Translating...'
      }));

      // Skip translation if identical to last
      if (cleanedText === lastOcrTextRef.current) {
        setDebugLog("Same text detected, skipping translation.");
        return;
      }
      lastOcrTextRef.current = cleanedText;
      
      const translated = await translateText(cleanedText);
      
      setResult({
        original: cleanedText,
        translated: translated
      });
      setDebugLog("Translation complete!");
      
    } catch (err) {
      console.error('Processing error:', err);
      setDebugLog(`Error: ${err.message}`);
    }
  }, []);

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
            <div className="camera-layout-wrapper">
               <CameraView onCapture={handleCapture} />
               <div className="glass-panel debug-panel">
                 {debugLog}
               </div>
            </div>
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
                  {result?.original ? (
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
                  {result?.translated ? (
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
