import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const CameraView = ({ onCapture, isProcessing }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }
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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    onCapture(imageDataUrl);
  }, [isProcessing, onCapture]);

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
          
          {isProcessing && (
            <div className="processing-overlay">
              <RefreshCw className="spinner-icon" />
              <p>Processing...</p>
            </div>
          )}
        </div>
      )}

      <div className="camera-controls">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCapture}
          disabled={isProcessing || error}
          className="capture-btn"
        >
          <div className="capture-btn-inner">
            <Camera size={32} color="white" />
          </div>
        </motion.button>
      </div>
    </div>
  );
};

export default CameraView;
