import React, { useState, useEffect, useCallback } from 'react';
import { getSignedUrl } from '../../lib/outfits';

interface SignedImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  path: string;
  fallback?: React.ReactNode;
}

const SignedImg: React.FC<SignedImgProps> = ({ path, fallback, ...props }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAndSetUrl = useCallback(async (force = false) => {
    if (!path) {
        setIsLoading(false);
        setSrc(null);
        return;
    }
    setIsLoading(true);
    try {
      const url = await getSignedUrl(path, force);
      setSrc(url);
    } catch (error) {
      console.error(`Failed to get signed URL for ${path}:`, error);
      setErrorCount(prev => prev + 1);
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setErrorCount(0);
    fetchAndSetUrl(false);
  }, [path, fetchAndSetUrl]);

  const handleError = () => {
    if (errorCount < 1) {
      console.warn(`Retrying failed image load for path: ${path}`);
      // Force re-sign and retry
      fetchAndSetUrl(true);
    } else {
       console.error(`Giving up on image load for path after retries: ${path}`);
       setIsLoading(false);
    }
    // Note: errorCount is incremented in fetchAndSetUrl on failure, 
    // so we don't need to increment it here.
  };
  
  const handleLoad = () => {
    setIsLoading(false);
    setErrorCount(0); // Reset error count on successful load
  };
  
  if (!path || (errorCount >= 1 && !isLoading)) {
      return <>{fallback || <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs text-red-400 p-2 text-center">Image Load Failed</div>}</>;
  }

  return (
    <>
        {isLoading && <div className="absolute inset-0 bg-black/20 shimmer-overlay"></div>}
        {/* Render img tag only when src is available to prevent 404s on initial render */}
        {src && (
             <img
                {...props}
                src={src}
                onLoad={handleLoad}
                onError={handleError}
                style={{ ...props.style, opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s' }}
            />
        )}
    </>
  );
};

export default SignedImg;