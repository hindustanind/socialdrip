import React, { useState, useCallback } from 'react';
import CameraView from './CameraView';

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  }, [onFileSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  if (showCamera) {
    return <CameraView onCapture={onFileSelected} onClose={() => setShowCamera(false)} />;
  }

  return (
    <div 
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-500 flex flex-col justify-center items-center aspect-[3/4] max-h-[70vh] cursor-pointer
        ${isDragging ? 'border-[#f400f4] bg-white/10 shadow-[0_0_20px_#f400f4]/50' : 'border-gray-500 hover:border-[#00f2ff] hover:bg-white/5'}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
        <input type="file" id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
        <div className="flex flex-col items-center gap-4 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            <p className="text-xl font-semibold text-white">Drop your outfit photo here</p>
            <p className="text-gray-400">or</p>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-4" onClick={(e) => e.stopPropagation()}>
            <button 
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="px-6 py-2 rounded-md font-bold text-white transition-all duration-500 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a0a37] active:scale-95 bg-gradient-to-r from-[#f400f4] to-[#00f2ff] hover:scale-105 hover:shadow-[0_0_15px_#f400f4,0_0_15px_#00f2ff] hover:brightness-110"
            >
                Upload File
            </button>
             <button 
                type="button"
                onClick={() => setShowCamera(true)}
                className="px-6 py-2 rounded-md font-bold text-white transition-all duration-500 ease-in-out transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a0a37] active:scale-95 bg-white/10 border border-[#00f2ff] backdrop-blur-sm hover:scale-105 hover:shadow-[0_0_15px_#00f2ff] hover:bg-white/20"
            >
                Use Camera
            </button>
        </div>
        <p className="text-xs text-gray-500 mt-4 px-4">Tip: For best results, use a clear photo where the person is standing and fills most of the frame.</p>
    </div>
  );
};

export default ImageUploader;