import React, { useState, useRef, useEffect } from 'react';
import { MusicTrack } from '../../types';

interface MusicPlayerProps {
    tracks: MusicTrack[];
}

const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V9a1 1 0 00-1-1H7zm5 0a1 1 0 00-1 1v2a1 1 0 001 1h1a1 1 0 001-1V9a1 1 0 00-1-1h-1z" clipRule="evenodd" /></svg>;
const PrevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.447 14.032a1 1 0 001.106 0l3.5-2.5a1 1 0 000-1.564l-3.5-2.5a1 1 0 00-1.106 0v5.128zM4 5a1 1 0 00-1 1v8a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1H4z" /></svg>;
const NextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.553 5.968a1 1 0 00-1.106 0l-3.5 2.5a1 1 0 000 1.564l3.5 2.5a1 1 0 001.106 0V5.968zM15 5a1 1 0 00-1 1v8a1 1 0 001 1h1a1 1 0 001-1V6a1 1 0 00-1-1h-1z" /></svg>;

const MusicPlayer: React.FC<MusicPlayerProps> = ({ tracks }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            handleNext();
        };

        audio.addEventListener('ended', handleEnded);

        // Cleanup function to pause and remove listener
        return () => {
            if (audio) {
                audio.pause();
                audio.removeEventListener('ended', handleEnded);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // This effect handles changing the audio source
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.src = tracks[currentTrackIndex].url;
        // If music was playing, the new track should start playing automatically.
        if (isPlaying) {
            audio.load(); // Required for some browsers to load the new source
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("Audio play failed after track change:", e);
                    setIsPlaying(false);
                });
            }
        }
    }, [currentTrackIndex, tracks, isPlaying]);

    // This effect handles toggling play/pause
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("Audio play failed on toggle:", e);
                    // If play fails (e.g. browser policy), update state to reflect reality
                    setIsPlaying(false);
                });
            }
        } else {
            audio.pause();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlaying]);


    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        setCurrentTrackIndex((prevIndex) => (prevIndex + 1) % tracks.length);
    };

    const handlePrev = () => {
        setCurrentTrackIndex((prevIndex) => (prevIndex - 1 + tracks.length) % tracks.length);
    };
    
    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 w-full flex flex-col items-center gap-2 backdrop-blur-sm text-white">
            <audio ref={audioRef} />
            <p className="text-sm font-semibold truncate w-full text-center" title={tracks[currentTrackIndex].name}>
                {tracks[currentTrackIndex].name}
            </p>
            <div className="flex items-center justify-center gap-4 w-full">
                <button onClick={handlePrev} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors transform active:scale-95">
                    <PrevIcon />
                </button>
                <button onClick={handlePlayPause} className="p-3 rounded-full bg-gradient-to-r from-[#f400f4] to-[#00f2ff] hover:scale-105 transition-transform transform active:scale-95">
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button onClick={handleNext} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors transform active:scale-95">
                    <NextIcon />
                </button>
            </div>
        </div>
    );
};

export default MusicPlayer;