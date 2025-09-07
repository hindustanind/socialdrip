
import React, { useState, useCallback, useRef } from 'react';
import CameraView from '../outfitGenerator/CameraView';
import Button from '../shared/Button';
import { fileToBase64 } from '../../utils';

interface HeadshotUploaderProps {
  onFileSelected: (file: File) => void;
  onClearImage: () => void;
  currentImage: string | null;
  disabled: boolean;
}

const HeadshotUploader: React.FC<HeadshotUploaderProps> = ({ onFileSelected, onClearImage, currentImage, disabled }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File | null) => {
        if (file) {
            onFileSelected(file);
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragging(false);
    }, [disabled]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disabled]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    };
    
    if (showCamera) {
        return (
            <div className="w-full max-w-lg mx-auto aspect-[3/4] bg-black rounded-lg overflow-hidden">
                <CameraView
                    onCapture={(file) => {
                        handleFile(file);
                        setShowCamera(false);
                    }}
                    onClose={() => setShowCamera(false)}
                />
            </div>
        );
    }
    
    if (currentImage) {
        return (
            <div className="relative w-full max-w-lg mx-auto aspect-[3/4]">
                <img src={`data:image/jpeg;base64,${currentImage}`} alt="Headshot preview" className="w-full h-full object-cover rounded-lg" />
                <Button onClick={onClearImage} variant="secondary" className="absolute top-2 right-2 px-2 py-1 text-sm !opacity-90 hover:!opacity-100" disabled={disabled}>Change</Button>
            </div>
        );
    }

    return (
        <div 
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-500 flex flex-col justify-center items-center w-full max-w-lg mx-auto aspect-[3/4]
            ${disabled ? 'opacity-50' : 'cursor-pointer'}
            ${isDragging ? 'border-[#f400f4] bg-white/10 shadow-[0_0_20px_#f400f4]/50' : 'border-gray-500 hover:border-[#00f2ff] hover:bg-white/5'}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} disabled={disabled} />
            <div className="flex flex-col items-center gap-4 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                </svg>
                <p className="text-xl font-semibold text-white">Drop headshot here</p>
                <p className="text-gray-400">or</p>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-4" onClick={(e) => e.stopPropagation()}>
                <Button 
                    type="button"
                    onClick={() => !disabled && fileInputRef.current?.click()}
                    disabled={disabled}
                    variant="primary"
                >
                    Upload File
                </Button>
                 <Button 
                    type="button"
                    onClick={() => !disabled && setShowCamera(true)}
                    disabled={disabled}
                    variant="secondary"
                >
                    Use Camera
                </Button>
            </div>
        </div>
    );
};

export default HeadshotUploader;