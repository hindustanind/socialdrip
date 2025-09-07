import React, { useEffect, useRef, useState } from 'react';
import Spinner from '../shared/Spinner';

interface AvatarVideoPlayerProps {
    src: string;
}

const AvatarVideoPlayer: React.FC<AvatarVideoPlayerProps> = ({ src }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let objectUrl: string | null = null;
        setIsLoading(true);

        const fetchAndSetVideo = async () => {
            setError(null);
            setVideoSrc(null);
            try {
                const response = await fetch(src);
                if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }
                const videoBlob = await response.blob();
                objectUrl = URL.createObjectURL(videoBlob);
                setVideoSrc(objectUrl);
            } catch (err) {
                console.error("Error fetching video:", err);
                setError(err instanceof Error ? err.message : 'Unknown error loading video.');
                setIsLoading(false);
            }
        };

        if (src) {
            fetchAndSetVideo();
        }

        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [src]);

    useEffect(() => {
        if (videoSrc && videoRef.current) {
            videoRef.current.play().catch(e => {
                console.warn("Video autoplay was prevented:", e);
            });
        }
    }, [videoSrc]);

    if (error) {
        return <div className="w-full h-full flex items-center justify-center bg-black text-red-400 p-4 text-center">{error}</div>;
    }

    return (
        <div className="w-full h-full relative">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <Spinner text="Loading Avatar..." />
                </div>
            )}
            <video
                ref={videoRef}
                key={videoSrc} 
                src={videoSrc || ''}
                autoPlay
                loop
                muted
                playsInline
                className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoadedData={() => setIsLoading(false)}
                onError={(e) => {
                    const videoError = e.currentTarget.error;
                    console.error(`Video player error: Code ${videoError?.code} - ${videoError?.message}`);
                    setError(`Video playback failed. Code: ${videoError?.code}`);
                    setIsLoading(false);
                }}
            >
                Your browser does not support the video tag.
            </video>
        </div>
    );
};

export default AvatarVideoPlayer;
