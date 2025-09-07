import React, { useRef, useEffect, useState, useCallback } from 'react';
import Spinner from '../shared/Spinner';
import Button from '../shared/Button';

interface CameraViewProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              setIsStreaming(true);
            };
          }
        } else {
          setError('Your browser does not support camera access.');
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
             setError('Camera permission was denied. Please allow camera access in your browser settings.');
        } else {
             setError('Could not access the camera. Please ensure it is not being used by another application.');
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        // Flip the image horizontally for a mirror effect, which is more intuitive for selfies.
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }, [onCapture]);
  
  return (
    <div className="relative w-full aspect-[3/4] max-h-[70vh] bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center border-2 border-[#00f2ff]">
      {!isStreaming && !error && <Spinner text="Starting camera..." />}
      {error && (
        <div className="p-4 text-center text-red-300">
          <p className="font-bold">Camera Error</p>
          <p>{error}</p>
          <Button onClick={onClose} variant="secondary" className="mt-4">Go Back</Button>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${isStreaming ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {isStreaming && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
          <button 
            onClick={onClose}
            title="Close Camera"
            className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all transform hover:scale-110 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <button 
              onClick={handleCapture}
              title="Take Photo"
              className="w-16 h-16 rounded-full bg-white/30 border-4 border-white backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg"
          >
              <div className="w-12 h-12 rounded-full bg-white"></div>
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraView;
