import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const CameraView = ({ onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [isProcessingLocal, setIsProcessingLocal] = useState(false);
  
  // Use a ref for the callback so the loop never restarts on re-render
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  
  // Use a ref for the busy flag so it survives across re-renders
  const isBusyRef = useRef(false);
  const isActiveRef = useRef(true);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError('');
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Camera access denied or unavailable.');
      }
    };

    startCamera();
    
    return () => {
      isActiveRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // The main real-time loop. This effect runs ONCE and never restarts.
  useEffect(() => {
    let timeoutId;

    const processFrame = async () => {
      if (!isActiveRef.current) return;
      
      // If already busy, skip this tick
      if (isBusyRef.current) {
        timeoutId = setTimeout(processFrame, 500);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.readyState < 2) {
        // Video not ready yet, try again soon
        timeoutId = setTimeout(processFrame, 500);
        return;
      }
      
      // Scale down for OCR performance
      const MAX_WIDTH = 800;
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      if (width === 0 || height === 0) {
        timeoutId = setTimeout(processFrame, 500);
        return;
      }
      
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, width, height);
      
      const imageDataUrl = canvas.toDataURL('image/png');
      
      isBusyRef.current = true;
      setIsProcessingLocal(true);
      
      try {
        await onCaptureRef.current(imageDataUrl);
      } catch (e) {
        console.error('Capture error:', e);
      }
      
      isBusyRef.current = false;
      setIsProcessingLocal(false);
      
      // Schedule next frame 1 second after finishing
      timeoutId = setTimeout(processFrame, 1000);
    };

    // Start the loop
    timeoutId = setTimeout(processFrame, 2000); // Give models time to init
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Empty deps — runs once, never restarts

  return (
    <div className="camera-view-container glass-panel">
      {error ? (
        <div className="camera-error">
          <p className="error-text">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Retry Camera
          </button>
        </div>
      ) : (
        <div className="video-wrapper">
          <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
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
