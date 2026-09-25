import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const CameraView = ({ onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  
  const isActiveRef = useRef(true);
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Request standard resolution for better performance
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or unavailable.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      isActiveRef.current = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActiveRef.current) return;
    
    const video = videoRef.current;
    // Mobile browsers might have different ready states, ensure it has some video
    if (video.readyState < 2) return; 

    const canvas = canvasRef.current;
    
    // Scale down the image for OCR to massively improve performance and reliability
    // Tesseract struggles and hangs on huge 1080p+ images in browser
    const MAX_WIDTH = 800;
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    setIsProcessingLocal(true);
    try {
      await onCapture(imageDataUrl);
    } finally {
      setIsProcessingLocal(false);
    }
  }, [onCapture]);

  useEffect(() => {
    let timeoutId;
    let isCapturing = false;
    
    const loop = async () => {
      if (!isCapturing && isActiveRef.current) {
        isCapturing = true;
        try {
          await captureFrame();
        } catch (e) {
          console.error(e);
        }
        isCapturing = false;
      }
      // Wait 1.5 seconds after previous capture FINISHES
      timeoutId = setTimeout(loop, 1500); 
    };
    
    loop();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [captureFrame]);

  return (
    <div className="camera-view-container glass-panel">
      {error ? (
        <div className="camera-error">
          <p className="error-text">{error}</p>
          <button onClick={startCamera} className="btn-primary">
            Retry Camera
          </button>
        </div>
      ) : (
        <div className="video-wrapper">
          <video ref={videoRef} autoPlay playsInline className="video-feed" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {isProcessingLocal && (
            <div className="processing-indicator">
               <RefreshCw className="spinner-icon-small" />
            </div>
          )}
          
          <div className="reticle-container">
             <div className="reticle-box">
                <div className="reticle-corners top-corners">
                   <div className="corner top-left"></div>
                   <div className="corner top-right"></div>
                </div>
                <div className="reticle-corners bottom-corners">
                   <div className="corner bottom-left"></div>
                   <div className="corner bottom-right"></div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraView;
