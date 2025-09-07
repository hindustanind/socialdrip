import React, { useEffect, useRef } from 'react';
import Spinner from '../shared/Spinner';

interface GenerationLoaderProps {
  progress: number;
  statusText: string;
  previews: string[]; // Array of base64 image strings
  onPreviewLoaded?: () => void;
}

const GenerationLoader: React.FC<GenerationLoaderProps> = ({ progress, statusText, previews, onPreviewLoaded }) => {
  const latestPreview = previews.length > 0 ? previews[previews.length - 1] : null;
  const lastLoadedPreviewCount = useRef(0);

  const handleImageLoad = () => {
    if (onPreviewLoaded && previews.length > lastLoadedPreviewCount.current) {
      lastLoadedPreviewCount.current = previews.length;
      onPreviewLoaded();
    }
  };
  
  // Reset if previews are cleared
  useEffect(() => {
    if (previews.length === 0) {
        lastLoadedPreviewCount.current = 0;
    }
  }, [previews.length]);


  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center w-full max-w-lg">
      <div className="w-full max-w-sm">
        <div className="relative aspect-[3/4] bg-black/20 rounded-lg overflow-hidden border-2 border-dashed border-white/20 flex items-center justify-center">
          {latestPreview ? (
            <>
              <img
                key={previews.length} // Key to force re-render on new image
                src={`data:image/png;base64,${latestPreview}`}
                alt="Generated preview"
                className="w-full h-full object-cover animate-fade-in"
                onLoad={handleImageLoad}
              />
              <div className="absolute inset-0 shimmer-overlay"></div>
            </>
          ) : (
            <Spinner text="Generating..." />
          )}
        </div>
      </div>
      
      <div className="w-full">
        <div className="flex justify-between items-center mb-2 text-base font-semibold">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
            {statusText}
          </span>
          <span className="text-white">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-4">
          <div
            className="bg-gradient-to-r from-[#f400f4] to-[#00f2ff] h-4 rounded-full"
            style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Please be aware that AI may generate inaccurate results.</p>
      </div>
    </div>
  );
};

export default GenerationLoader;