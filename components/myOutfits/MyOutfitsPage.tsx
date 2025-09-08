

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Outfit, Avatar, OutfitCategory } from '../../types';
import CategoryFilter from './CategoryFilter';
import OutfitCard from './OutfitCard';
import * as geminiService from '../../services/geminiService';
import Spinner from '../shared/Spinner';
import OutfitViewer from '../outfitGenerator/OutfitViewer';
import Button from '../shared/Button';
import HeadshotUploader from './HeadshotUploader';
import AvatarVideoPlayer from './AvatarVideoPlayer';
import PoseDeck from './PoseDeck';
import { PRESET_POSES } from '../../presetPoses';
import ImageCropper from '../outfitGenerator/ImageCropper';

const DressingRoomLoader: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-250px)] page-transition-enter">
        <div className="animate-swing-hanger" style={{filter: 'drop-shadow(0 0 10px #00f2ff)'}}>
            <svg width="100" height="100" viewBox="0 0 24 24" fill="#00f2ff">
                <path d="M20.38 3.46 16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
            </svg>
        </div>
        <p className="mt-8 text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
            Preparing dressing room...
        </p>
    </div>
);

const ComingSoonPlaceholder: React.FC = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-350px)] text-center text-gray-400 page-transition-enter">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4 text-[#00f2ff]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff] opacity-70">
            Coming Soon!
        </h2>
        <p className="mt-2 text-lg">The Dressing Room is getting ready for its grand debut.</p>
    </div>
);

const EmptyClosetPlaceholder: React.FC = () => (
    <div className="relative text-center py-20 min-h-[400px] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
            <svg
                className="w-4/5 h-4/5 text-white/5"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <path d="M20.38 3.46 16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
            </svg>
        </div>
        <div className="relative z-10">
            <p className="text-2xl text-gray-400">Your closet is empty.</p>
            <p className="text-gray-500">Go to the 'Outfit Generator' to add your first style!</p>
        </div>
    </div>
);

interface MyOutfitsPageProps {
    outfits: Outfit[];
    onUpdateOutfit: (outfitId: string, updates: Partial<Outfit>) => Promise<void>;
    onDeleteOutfit: (outfitId: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    onRetry: () => void;
    avatar: Avatar | null;
    setAvatar: (avatar: Avatar | null) => void;
    isDevMode: boolean;
    setSelectedOutfit: (outfit: Outfit | null) => void;
    dripScore: number;
    loadMoreOutfits: () => void;
    hasMore: boolean;
}

const MyOutfitsPage: React.FC<MyOutfitsPageProps> = ({ outfits, onUpdateOutfit, onDeleteOutfit, isLoading, error, onRetry, avatar, setAvatar, isDevMode, setSelectedOutfit, dripScore, loadMoreOutfits, hasMore }) => {
    const [activeCategory, setActiveCategory] = useState<OutfitCategory>(OutfitCategory.ALL);
    const [view, setView] = useState<'closet' | 'dressingRoom'>('closet');
    const [displayedView, setDisplayedView] = useState(view);
    const [animationClass, setAnimationClass] = useState('page-transition-enter');

    const [dressingRoomImages, setDressingRoomImages] = useState<string[] | null>(null);
    const [wornOutfitId, setWornOutfitId] = useState<string | null>(null);
    const [isDressing, setIsDressing] = useState(false);
    const [faceImage, setFaceImage] = useState<string | null>(null);
    const [isPreparingDressingRoom, setIsPreparingDressingRoom] = useState(false);

    const [avatarCreationStep, setAvatarCreationStep] = useState<'upload' | 'cropping'>('upload');
    const [headshotFile, setHeadshotFile] = useState<File | null>(null);
    const [selectedPresetPoseId, setSelectedPresetPoseId] = useState<string | null>(null);
    const [isGeneratingTryOn, setIsGeneratingTryOn] = useState(false);
    const [tryOnResultImage, setTryOnResultImage] = useState<string | null>(null);
    const [dressingRoomError, setDressingRoomError] = useState<string | null>(null);

    const outfitGridRef = useRef<HTMLDivElement>(null);
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (view !== displayedView) {
            setAnimationClass('page-transition-exit');
            const timer = setTimeout(() => {
                setDisplayedView(view);
                setAnimationClass('page-transition-enter');
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [view, displayedView]);
    
    useEffect(() => {
        if (!hasMore || isLoading || view !== 'closet') return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    loadMoreOutfits();
                }
            },
            { rootMargin: "400px" }
        );

        const currentLoader = loaderRef.current;
        if (currentLoader) {
            observer.observe(currentLoader);
        }

        return () => {
            if (currentLoader) {
                observer.unobserve(currentLoader);
            }
        };
    }, [hasMore, isLoading, loadMoreOutfits, view]);


    const filteredOutfits = useMemo(() => {
        if (activeCategory === OutfitCategory.FAVORITES) {
            return outfits.filter(o => o.isFavorite);
        }
        if (activeCategory === OutfitCategory.ALL) return outfits;
        return outfits.filter(o => o.category === activeCategory);
    }, [outfits, activeCategory]);
    
    const handleSwitchToDressingRoom = () => {
        if (view === 'dressingRoom' || isPreparingDressingRoom) return;
        setIsPreparingDressingRoom(true);
        setTimeout(() => {
            setView('dressingRoom');
            setIsPreparingDressingRoom(false);
        }, 2000);
    };

    const handleTryOnOutfit = useCallback(async (outfitToTryOn: Outfit) => {
        if (!avatar?.images || isDressing) return;
        setWornOutfitId(outfitToTryOn.id);
        setIsDressing(true);
        setDressingRoomError(null);
        setDressingRoomImages([outfitToTryOn.images[0]]); 

        try {
            if (!outfitToTryOn.isMock && geminiService.isApiKeySet()) {
                const frontView = await geminiService.dressAvatar(avatar.images[0], outfitToTryOn.images[0]);
                setDressingRoomImages([frontView]);
            } else {
                 setDressingRoomImages(outfitToTryOn.images);
            }
        } catch (err) {
            const errorMessage = err instanceof geminiService.QuotaExceededError
                ? "You've reached your try-on limit for today! Please come back tomorrow to see more amazing looks on your avatar."
                : (err instanceof Error ? err.message : 'Failed to dress avatar.');
            setDressingRoomError(errorMessage);
            if (avatar?.images) setDressingRoomImages(avatar.images);
            setWornOutfitId(null);
        } finally {
            setIsDressing(false);
        }
    }, [avatar, isDressing]);

    const handleRemoveOutfit = () => {
        setWornOutfitId(null);
        if (avatar?.images) {
            setDressingRoomImages(avatar.images);
        }
    };

    const handleHeadshotFileSelected = (file: File) => {
        setHeadshotFile(file);
        setAvatarCreationStep('cropping');
    };

    const handleClearHeadshot = () => {
        setFaceImage(null);
        setHeadshotFile(null);
        setAvatarCreationStep('upload');
        setTryOnResultImage(null);
        setDressingRoomError(null);
    };

    const handleHeadshotCrop = (croppedImageDataUrl: string) => {
        const base64 = croppedImageDataUrl.split(',')[1];
        setFaceImage(base64);
        setHeadshotFile(null);
        setAvatarCreationStep('upload');
    };
    
    const handleHeadshotCropCancel = () => {
        setHeadshotFile(null);
        setAvatarCreationStep('upload');
    };

    const handleGenerateTryOn = useCallback(async (headshot: string, poseImageUrl: string) => {
        setIsGeneratingTryOn(true);
        setDressingRoomError(null);
        setTryOnResultImage(null);
        try {
            const poseImageB64 = await new Promise<string>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Could not get canvas context'));
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL.split(',')[1]);
                };
                img.onerror = () => reject(new Error(`Failed to load preset pose image.`));
                img.src = poseImageUrl;
            });

            let resultImage: string;
            if (isDevMode) {
                await new Promise(res => setTimeout(res, 2000));
                resultImage = headshot;
            } else {
                if (!geminiService.isApiKeySet()) throw new Error("API key not configured.");
                resultImage = await geminiService.generateTryOn(headshot, poseImageB64);
            }
            setTryOnResultImage(resultImage);

        } catch (err) {
            const errorMessage = err instanceof geminiService.QuotaExceededError
                ? "You've reached your virtual try-on limit for today! Please come back tomorrow to generate more looks."
                : (err instanceof Error ? err.message : 'Failed to generate try-on preview.');
            setDressingRoomError(errorMessage);
        } finally {
            setIsGeneratingTryOn(false);
        }
    }, [isDevMode]);
    
    useEffect(() => {
        if (faceImage && selectedPresetPoseId) {
            const pose = PRESET_POSES.find(p => p.id === selectedPresetPoseId);
            if (pose) {
                handleGenerateTryOn(faceImage, pose.image);
            }
        }
    }, [faceImage, selectedPresetPoseId, handleGenerateTryOn]);

    const renderClosetContent = () => {
        if (isLoading && outfits.length === 0) {
            return (
                <div className="flex justify-center items-center min-h-[400px]">
                    <Spinner text="Loading your closet..." />
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-20 min-h-[400px] flex flex-col items-center justify-center bg-red-500/10 border-2 border-dashed border-red-500/50 rounded-lg">
                    <p className="text-xl text-red-300">Failed to load your closet</p>
                    <p className="text-gray-400 mt-2 max-w-md">{error}</p>
                    <Button onClick={onRetry} variant="secondary" className="mt-6">
                        Retry
                    </Button>
                </div>
            );
        }

        return (
            <div>
                <div>
                    {filteredOutfits.length > 0 ? (
                        <div ref={outfitGridRef} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" style={{ outline: 'none' }} tabIndex={-1}>
                            {filteredOutfits.map((outfit, index) => (
                                <div
                                    key={outfit.id}
                                    className="outfit-card-reveal"
                                    style={{ '--delay': `${index * 50}ms` } as React.CSSProperties}
                                >
                                    <OutfitCard
                                        outfit={outfit}
                                        onToggleFavorite={() => onUpdateOutfit(outfit.id, { isFavorite: !outfit.isFavorite })}
                                        onUpdate={(updates) => onUpdateOutfit(outfit.id, updates)}
                                        onTryOn={() => { handleSwitchToDressingRoom(); if(avatar) handleTryOnOutfit(outfit); }}
                                        onViewDetail={() => setSelectedOutfit(outfit)}
                                        onDelete={() => onDeleteOutfit(outfit.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        !isLoading && <EmptyClosetPlaceholder />
                    )}
                </div>
                {hasMore && (
                    <div ref={loaderRef} className="flex justify-center items-center h-20">
                        {isLoading && <Spinner text="Loading more..." />}
                    </div>
                )}
            </div>
        );
    };
    
     const renderDressingRoomContent = () => {
        if (!isDevMode) {
            return <ComingSoonPlaceholder />;
        }

        if (!avatar) {
            if (avatarCreationStep === 'cropping' && headshotFile) {
                return (
                    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
                        <ImageCropper
                            imageFile={headshotFile}
                            onCrop={handleHeadshotCrop}
                            onCancel={handleHeadshotCropCancel}
                        />
                    </div>
                );
            }
             const leftPanelTitle = tryOnResultImage ? "Your Virtual Try-On" : "Provide Headshot";
             const leftPanelSubtitle = tryOnResultImage
                ? "Here's your look! Select a different outfit to try another one."
                : "Drop a clear photo of your face. For best results, use a forward-facing image with neutral lighting.";

             return (
                <div className="grid md:grid-cols-2 gap-8 h-[calc(100vh-12rem)] overflow-hidden">
                    <div className="flex flex-col items-center justify-start h-full gap-4 p-2">
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">{leftPanelTitle}</h3>
                        <p className="text-sm text-gray-400 text-center mb-2 max-w-md">{leftPanelSubtitle}</p>
                        <div className="w-full flex-grow flex items-center justify-center">
                            {isGeneratingTryOn ? (
                                <Spinner text="Generating your look..." />
                            ) : tryOnResultImage ? (
                                <div className="w-full max-w-lg mx-auto">
                                    <OutfitViewer images={[tryOnResultImage]} />
                                </div>
                            ) : (
                                <HeadshotUploader
                                    onFileSelected={handleHeadshotFileSelected}
                                    onClearImage={handleClearHeadshot}
                                    currentImage={faceImage}
                                    disabled={isGeneratingTryOn}
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center h-full p-2">
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">Pick Your Outfit</h3>
                            <p className="text-sm text-gray-400 text-center mb-2 max-w-md">Select the clothing for your avatar from our preset styles. Your avatar's unique pose will be preserved.</p>
                        </div>
                        
                        <div className="w-full flex-grow flex items-center justify-center overflow-hidden relative">
                           <PoseDeck poses={PRESET_POSES} selectedId={selectedPresetPoseId} onSelect={setSelectedPresetPoseId} disabled={isGeneratingTryOn} size="large" />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center h-[calc(100vh-15rem)]">
                <div className="w-full max-w-sm">
                    <div className="relative bg-black/20 rounded-xl overflow-hidden shadow-lg border border-white/10 aspect-[3/4]">
                        {isDressing ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/50"><Spinner text="Dressing..." /></div>
                        ) : avatar.videoUrl && wornOutfitId === null ? (
                            <AvatarVideoPlayer src={avatar.videoUrl} />
                        ) : (dressingRoomImages && dressingRoomImages.length > 0 ? (
                            <OutfitViewer
                                images={dressingRoomImages}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">Avatar not available.</div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 my-4">
                    <h3 className="text-lg font-bold text-white">Try On Your Outfits</h3>
                    <Button 
                        variant="secondary" 
                        onClick={handleRemoveOutfit} 
                        disabled={!wornOutfitId || isDressing}
                    >
                        Remove Outfit
                    </Button>
                </div>

                <div className="w-full max-w-3xl mt-auto pb-2">
                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar p-2 justify-start">
                        {outfits.length > 0 ? (
                            outfits.map(outfit => (
                                <button
                                    key={outfit.id}
                                    onClick={() => !isDressing && handleTryOnOutfit(outfit)}
                                    disabled={isDressing}
                                    aria-label={`Try on ${outfit.name || 'outfit'}`}
                                    className={`relative w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0118] focus:ring-[#00f2ff]
                                    ${
                                        wornOutfitId === outfit.id
                                            ? 'border-2 border-[#f400f4] shadow-[0_0_15px_#f400f4] scale-105'
                                            : 'border-2 border-transparent hover:border-white/50'
                                    }`}
                                >
                                    <img
                                        src={outfit.images[0]}
                                        alt={outfit.name || 'Outfit'}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))
                        ) : (
                            Array.from({ length: 5 }).map((_, index) => (
                                <div key={index} className="w-24 h-32 flex-shrink-0 rounded-lg bg-white/10 opacity-50"></div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    const isFadingOutClosetAfterLoader = animationClass === 'page-transition-exit' && view === 'dressingRoom' && displayedView === 'closet';

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-4xl font-extrabold tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
                        {view === 'closet' ? 'My Outfits' : 'Dressing Room'}
                    </span>
                </h1>
                <div
                    className="relative flex w-72 items-center bg-white/10 rounded-full p-1"
                >
                    <div
                        className="absolute h-full w-1/2 top-0 p-1 transition-transform duration-300 ease-in-out"
                        style={{
                            transform: view === 'dressingRoom' ? 'translateX(100%)' : 'translateX(0%)'
                        }}
                    >
                        <div className="w-full h-full bg-gradient-to-r from-[#f400f4] to-[#00f2ff] rounded-full shadow-[0_0_10px_#f400f4]" />
                    </div>
                    
                    <button
                        onClick={() => setView('closet')}
                        className={`relative z-10 flex-1 py-1.5 text-base font-semibold text-center transition-colors duration-300 ${
                            view === 'closet' ? 'text-white' : 'text-gray-300'
                        }`}
                    >
                        Closet
                    </button>

                    <button
                        onClick={handleSwitchToDressingRoom}
                        className={`relative z-10 flex-1 py-1.5 text-base font-semibold text-center transition-colors duration-300 ${
                            view === 'dressingRoom' ? 'text-white' : 'text-gray-300'
                        }`}
                    >
                        Dressing Room
                    </button>
                </div>
            </div>
            
            <div className="flex justify-between items-center mb-8">
                <div>
                    {view === 'closet' && (
                         <CategoryFilter activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
                    )}
                </div>
                <div className="p-[2px] rounded-full animate-border-glow-red shadow-lg shadow-red-500/40 animate-fade-in">
                    <div className="flex items-center gap-3 bg-black/50 backdrop-blur-sm rounded-full px-5 py-2">
                        <div className="w-7 h-7" role="img" aria-label="hanger icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-full h-full" fill="white">
                                <path d="M20.38 3.46 16 2a4 4 0 0 0-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-bold tracking-wider text-white">DRIPSCORE 🔥</p>
                            <p className="text-xl font-bold text-white">{dripScore}</p>
                        </div>
                    </div>
                </div>
            </div>

             {view === 'dressingRoom' && dressingRoomError && <div className="my-4 p-3 bg-red-500/20 border border-red-500 text-red-300 rounded-md text-sm text-center"><p>{dressingRoomError}</p></div>}
            {isPreparingDressingRoom ? (
                <DressingRoomLoader />
            ) : (
                <div className={animationClass}>
                    {isFadingOutClosetAfterLoader ? (
                        <div />
                    ) : (
                        displayedView === 'closet' ? renderClosetContent() : renderDressingRoomContent()
                    )}
                </div>
            )}
        </div>
    );
};

export default MyOutfitsPage;
