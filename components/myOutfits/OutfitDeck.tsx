
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Outfit } from '../../types';

interface OutfitDeckProps {
    outfits: Outfit[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    disabled: boolean;
    size?: 'small' | 'large';
}

const OutfitDeck: React.FC<OutfitDeckProps> = ({ outfits, selectedId, onSelect, disabled, size = 'small' }) => {
    const dragStartX = useRef<number | null>(null);
    const deckRef = useRef<HTMLDivElement>(null);
    const [isAutoScrolling, setIsAutoScrolling] = useState(true);

    const commandedIndex = useMemo(() => {
        const index = outfits.findIndex(o => o.id === selectedId);
        return Math.max(0, index);
    }, [outfits, selectedId]);

    const [currentIndex, setCurrentIndex] = useState(commandedIndex);

    useEffect(() => {
        setCurrentIndex(commandedIndex);
    }, [commandedIndex]);

    // Auto-scroll effect
    useEffect(() => {
        if (isAutoScrolling && !disabled && outfits.length > 1) {
            const intervalId = window.setInterval(() => {
                setCurrentIndex(prevIndex => (prevIndex + 1) % outfits.length);
            }, 3000); // Auto-scroll every 3 seconds
            return () => clearInterval(intervalId);
        }
    }, [isAutoScrolling, disabled, outfits.length]);

    // Configuration for different sizes
    const sizeConfig = {
        small: {
            container: 'h-[220px]',
            card: 'w-32 h-44',
            cardMargin: '-mt-22 -ml-16',
            rotateY: -25,
            translateZ: -70,
            translateX: 35,
        },
        large: {
            container: 'h-[360px]',
            card: 'w-56 h-72',
            cardMargin: '-mt-36 -ml-28',
            rotateY: -20,
            translateZ: -120,
            translateX: 30,
        }
    };
    const config = sizeConfig[size];

    const stopAutoScrollAndSelect = (newIndex: number) => {
        setIsAutoScrolling(false);
        if (outfits[newIndex] && outfits[newIndex].id !== selectedId) {
            onSelect(outfits[newIndex].id);
        }
    };

    const handleNavigation = (direction: 'next' | 'prev') => {
        if (disabled || outfits.length <= 1) return;
        const len = outfits.length;
        const newIndex = direction === 'next'
            ? (currentIndex + 1) % len
            : (currentIndex - 1 + len) % len;
        stopAutoScrollAndSelect(newIndex);
    };
    
    const handleInteractionStart = () => {
        if (disabled) return;
        setIsAutoScrolling(false);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        handleInteractionStart();
        dragStartX.current = e.clientX;
    };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragStartX.current === null || disabled) return;
        e.preventDefault();
        const threshold = e.currentTarget.offsetWidth / 5; // Swipe threshold of 20%
        const dx = e.clientX - dragStartX.current;
        if (Math.abs(dx) > threshold) {
            handleNavigation(dx > 0 ? 'prev' : 'next');
            dragStartX.current = null; // Reset after swipe
        }
    };
    
    const handleMouseUp = () => {
        dragStartX.current = null;
    };
    
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        handleInteractionStart();
        dragStartX.current = e.touches[0].clientX;
    };
    
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (dragStartX.current === null || disabled) return;
        const threshold = e.currentTarget.offsetWidth / 5; // Swipe threshold of 20%
        const dx = e.touches[0].clientX - dragStartX.current;
        if (Math.abs(dx) > threshold) {
            handleNavigation(dx > 0 ? 'prev' : 'next');
            dragStartX.current = null;
        }
    };

    if (!outfits.length) return null;

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
            <div 
                className={`w-full relative select-none cursor-grab active:cursor-grabbing overflow-hidden ${config.container}`} 
                style={{ perspective: '1000px' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
            >
                <div 
                    ref={deckRef}
                    className="absolute w-full h-full" 
                    style={{ transformStyle: 'preserve-3d', transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' }}
                >
                    {outfits.map((outfit, index) => {
                        const len = outfits.length;
                        const diff = index - currentIndex;
                        let offset;

                        if (len <= 1) {
                            offset = 0;
                        } else if (Math.abs(diff) <= len / 2) {
                            offset = diff;
                        } else if (diff > 0) {
                            offset = diff - len;
                        } else {
                            offset = diff + len;
                        }
                        
                        const isSelected = index === currentIndex;
                        const rotateY = offset * config.rotateY;
                        const translateZ = Math.abs(offset) * config.translateZ;
                        const translateX = offset * config.translateX;
                        
                        return (
                            <div
                                key={outfit.id}
                                className={`absolute top-1/2 left-1/2 transition-all duration-500 rounded-lg overflow-hidden border-4 ${config.card} ${config.cardMargin} ${isSelected ? 'border-[#00f2ff]' : 'border-transparent'}`}
                                style={{
                                    transform: `translateX(${translateX}%) rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
                                    zIndex: outfits.length - Math.abs(offset),
                                    transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                                    opacity: Math.abs(offset) > 2 ? 0 : 1,
                                    cursor: disabled ? 'default' : 'pointer',
                                }}
                                onClick={() => {
                                    if(disabled) return;
                                    stopAutoScrollAndSelect(index);
                                }}
                            >
                                <img
                                    src={`data:image/jpeg;base64,${outfit.images[0]}`}
                                    alt="Outfit for pose"
                                    className="w-full h-full object-cover"
                                    draggable="false"
                                />
                                <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isSelected ? 'opacity-0' : 'opacity-100'}`} />
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="flex items-center gap-4 mt-auto pt-4">
                <button onClick={() => handleNavigation('prev')} disabled={disabled || outfits.length <= 1} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-lg font-semibold">{outfits.length > 0 ? currentIndex + 1 : 0} / {outfits.length}</span>
                <button onClick={() => handleNavigation('next')} disabled={disabled || outfits.length <= 1} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
};

export default OutfitDeck;
