import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const CameraView = ({ onCapture, isProcessing }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  
  // Track if we should continue processing frames
  const isActiveRef = useRef(true);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Request a high resolution feed if possible to improve OCR
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

  const preprocessCanvas = (canvas, context, width, height) => {
    // Advanced image preprocessing for better OCR
    const imageData = context.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    // Apply grayscale and high contrast thresholding
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale using luminance
      let v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      
      // Increase contrast (thresholding to make text pop)
      // Any pixel darker than average becomes black, lighter becomes white
      v = v > 128 ? 255 : 0; 
      
      data[i] = data[i + 1] = data[i + 2] = v;
    }
    
    context.putImageData(imageData, 0, 0);
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isProcessing || !isActiveRef.current) return;
    
    const video = videoRef.current;
    
    // Ensure video is ready
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Preprocess the image to improve OCR accuracy
    preprocessCanvas(canvas, context, canvas.width, canvas.height);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(imageDataUrl);
  }, [isProcessing, onCapture]);

  // Real-time loop
  useEffect(() => {
    let timeoutId;
    
    const loop = () => {
      // Throttle captures to give the engine time to process
      if (!isProcessing) {
        captureFrame();
      }
      timeoutId = setTimeout(loop, 1000); // Check every 1 second
    };
    
    loop();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [captureFrame, isProcessing]);

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
          {/* Debug canvas could be shown if needed, but we keep it hidden */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {/* We only show a subtle indicator when processing instead of blocking the whole view */}
          {isProcessing && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full p-2 flex items-center justify-center border border-white/10 z-10">
               <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          
          {/* Reticle to guide the user */}
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
