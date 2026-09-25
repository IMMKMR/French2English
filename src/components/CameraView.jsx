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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
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
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
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
      // Wait 1 second after previous capture FINISHES
      timeoutId = setTimeout(loop, 1000); 
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
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2 flex items-center justify-center border border-white/10 z-10">
               <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0">
             <div className="w-3/4 h-1/2 border-2 border-primary/50 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] flex flex-col justify-between">
                <div className="flex justify-between w-full p-2">
                   <div className="w-4 h-4 border-t-2 border-l-2 border-primary"></div>
                   <div className="w-4 h-4 border-t-2 border-r-2 border-primary"></div>
                </div>
                <div className="flex justify-between w-full p-2">
                   <div className="w-4 h-4 border-b-2 border-l-2 border-primary"></div>
                   <div className="w-4 h-4 border-b-2 border-r-2 border-primary"></div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraView;
