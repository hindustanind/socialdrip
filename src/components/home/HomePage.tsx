import React, { useState, useEffect, useMemo } from 'react';
import Button from '../shared/Button';
import { Outfit } from '../../types';
import { MALE_IMAGES, FEMALE_IMAGES } from '../../constants';
import SignedImg from '../shared/SignedImg';

// Helper function to shuffle an array (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

// New component for the rotating outfit card
const RotatingOutfitCard: React.FC<{ outfit: Outfit; onClick: () => void; }> = ({ outfit, onClick }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if ((outfit.imagePaths?.length || 0) > 1) {
            const interval = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % (outfit.imagePaths?.length || 1));
            }, 4000); // 4000ms interval for a slow rotation
            return () => clearInterval(interval);
        }
    }, [outfit.imagePaths]);
    
    const currentPath = outfit.imagePaths?.[currentIndex];

    return (
        <div
            className="outfit-card-border-glow animate-border-glow-always group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg bg-gray-800 transition-transform duration-300 ease-in-out hover:scale-105"
            onClick={onClick}
            role="button"
            tabIndex={0}
            aria-label={`View details for ${outfit.name || 'outfit'}`}
            onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
        >
            {currentPath ? (
                <SignedImg
                    path={currentPath}
                    alt={outfit.name || 'User saved outfit'}
                    className="relative z-[1] h-full w-full object-cover"
                    draggable="false"
                />
            ) : (
                 <img
                    src={outfit.images[currentIndex]}
                    alt={outfit.name || 'User saved outfit'}
                    className="relative z-[1] h-full w-full object-cover"
                    draggable="false"
                />
            )}
            {/* Vignette Effect */}
            <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
            
            {/* Hover Effects */}
            <div className="absolute inset-0 z-[3] bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute bottom-0 left-0 right-0 z-[4] bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <h3 className="truncate font-bold text-white drop-shadow-lg">{outfit.name || `Outfit #${outfit.id.slice(-4)}`}</h3>
            </div>
        </div>
    );
};


interface HomePageProps {
  onGetStarted: () => void;
  userName: string;
  outfits: Outfit[];
  setSelectedOutfit: (outfit: Outfit | null) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onGetStarted, userName, outfits, setSelectedOutfit }) => {
    // Randomize and interleave images on component mount to create a dynamic, alternating sequence.
    const HOMEPAGE_IMAGES = useMemo(() => {
        const shuffledFemale = shuffleArray(FEMALE_IMAGES);
        const shuffledMale = shuffleArray(MALE_IMAGES);

        const interleaved = [];
        const maxLength = Math.max(shuffledFemale.length, shuffledMale.length);
        
        // To add variety, randomly decide if the sequence starts with a male or female image
        const startsWithFemale = Math.random() < 0.5;
        const arr1 = startsWithFemale ? shuffledFemale : shuffledMale;
        const arr2 = startsWithFemale ? shuffledMale : shuffledFemale;

        for (let i = 0; i < maxLength; i++) {
            if (i < arr1.length) {
                interleaved.push(arr1[i]);
            }
            if (i < arr2.length) {
                interleaved.push(arr2[i]);
            }
        }
        return interleaved;
    }, []);

    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (HOMEPAGE_IMAGES.length < 2) return;
        const interval = setInterval(() => {
            setCurrentIndex(prevIndex => (prevIndex + 1) % HOMEPAGE_IMAGES.length);
        }, 2000); // Fast-paced transition every 2 seconds

        return () => clearInterval(interval);
    }, [HOMEPAGE_IMAGES.length]);

    // Carousel configuration
    const carouselConfig = {
        rotateY: -20,
        translateZ: -180,
        translateX: 35,
    };
    
    const trendingOutfits = outfits.slice(0, 3);

    return (
        <div className="w-full">
            {/* Full-screen hero section */}
            <div 
                className="relative w-full h-screen flex flex-col items-center justify-center gap-8 overflow-hidden"
                style={{ perspective: '1200px' }}
            >
                {/* Greeting & CTA */}
                <div className="z-10 text-center animate-fade-in space-y-4">
                    <h1 
                        className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]"
                        style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}
                    >
                        Welcome, {userName}!
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Your AI-powered virtual closet and stylist. Upload outfits, create an avatar, and get personalized fashion advice.
                    </p>
                    <div className="pt-4">
                        <Button onClick={onGetStarted} className="px-8 py-3 text-lg">
                            Get Started
                        </Button>
                    </div>
                </div>

                {/* Carousel */}
                <div 
                    className="relative w-[60%] sm:w-[40%] md:w-[30%] lg:w-[25%] aspect-[3/4]"
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    {HOMEPAGE_IMAGES.map((src, index) => {
                        const len = HOMEPAGE_IMAGES.length;
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
                        
                        const rotateY = offset * carouselConfig.rotateY;
                        const translateZ = Math.abs(offset) * carouselConfig.translateZ;
                        const translateX = offset * carouselConfig.translateX;
                        const scale = offset === 0 ? 1 : 0.9;

                        return (
                            <div
                                key={index}
                                className="absolute top-0 left-0 w-full h-full transition-all duration-500 rounded-lg overflow-hidden"
                                style={{
                                    transform: `translateX(${translateX}%) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`,
                                    zIndex: HOMEPAGE_IMAGES.length - Math.abs(offset),
                                    opacity: Math.abs(offset) > 2 ? 0 : 1, // Fade out cards that are far away
                                    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                <img
                                    src={src}
                                    alt={`Fashion showcase ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    draggable="false"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none'; // Hide broken images
                                    }}
                                />
                                <div 
                                    className="absolute inset-0 bg-black/50 transition-opacity duration-500"
                                    style={{
                                        opacity: offset === 0 ? 0 : 0.6 // Darken non-active cards
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
                
                {/* Vignette Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0118] via-[#0a0118]/50 to-transparent pointer-events-none"></div>
            </div>

            {/* Trending Section */}
            <div id="style-picks" className="w-full bg-transparent py-20 text-center">
                <h2 className="text-4xl font-bold flex items-center justify-center gap-3">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00f2ff] to-[#f400f4]">
                        Trending
                    </span>
                    <span className="animate-fire-shimmer" style={{ fontSize: '2.5rem' }}>
                        🔥
                    </span>
                </h2>
                <div className="mt-12 max-w-6xl mx-auto px-4">
                    {trendingOutfits.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            {trendingOutfits.map(outfit => (
                               <RotatingOutfitCard
                                    key={outfit.id}
                                    outfit={outfit}
                                    onClick={() => setSelectedOutfit(outfit)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex min-h-[250px] items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-white/5 py-10">
                            <p className="text-lg text-gray-400">Save outfits to your closet to see them trending here!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;