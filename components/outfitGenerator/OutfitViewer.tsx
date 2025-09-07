

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VIEW_ANGLES } from '../../constants';
import Spinner from '../shared/Spinner';

interface OutfitViewerProps {
    images?: string[];
    showDownloadButton?: boolean;
    onDownload?: (imageIndex: number, angle: string) => void;
    onGenerate360?: () => void;
    isGenerating360?: boolean;
    showInitialDragHint?: boolean;
    isAutoplaying?: boolean;
}

const ControlButton: React.FC<{onClick: (e: React.MouseEvent) => void, children: React.ReactNode, title: string}> = ({onClick, children, title}) => (
    <button title={title} onClick={(e) => { e.stopPropagation(); onClick(e); }} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all transform hover:scale-110 active:scale-95">
        {children}
    </button>
);

const OutfitViewer: React.FC<OutfitViewerProps> = ({ images, showDownloadButton = false, onDownload, onGenerate360, isGenerating360 = false, showInitialDragHint = false, isAutoplaying = false }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isViewerActive, setIsViewerActive] = useState(false);
    const [isHintVisible, setIsHintVisible] = useState(showInitialDragHint);
    const [isUserDriven, setIsUserDriven] = useState(false); // State to stop autoplay on interaction
    const [areImagesLoading, setAreImagesLoading] = useState(true);
    
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const panStartPos = useRef({ x: 0, y: 0 });
    const dragStartIndex = useRef(0);
    const pinchStartDistance = useRef(0);
    const pinchStartZoom = useRef(1);

    const stopAutoplay = useCallback(() => {
        setIsUserDriven(true);
        setIsHintVisible(false);
    }, []);

    const handleRotate = useCallback((direction: 'left' | 'right') => {
        stopAutoplay();
        if (images && images.length === 1 && onGenerate360 && !isGenerating360) {
            onGenerate360();
            return;
        }
        if (isGenerating360 || !images || images.length <= 1) return;

        setCurrentIndex(prev => {
            const newIndex = direction === 'left'
                ? (prev - 1 + images.length) % images.length
                : (prev + 1) % images.length;
            return newIndex;
        });
    }, [images, onGenerate360, isGenerating360, stopAutoplay]);

    const handleZoom = useCallback((direction: 'in' | 'out') => {
        stopAutoplay();
        setZoom(prev => {
            const newZoom = direction === 'in' ? Math.min(prev * 1.5, 3) : Math.max(prev / 1.5, 1);
            // The useEffect hook will handle clamping and resetting the pan.
            return newZoom;
        });
    }, [stopAutoplay]);

    const handleResetView = useCallback(() => {
        stopAutoplay();
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [stopAutoplay]);

    const handleDragMove = useCallback((clientX: number, clientY: number) => {
        if (!isDragging || !containerRef.current) return;
        
        if (zoom > 1) { // Panning logic
            const imageEl = imageRef.current;
            const containerEl = containerRef.current;
            if (!imageEl || !containerEl || imageEl.naturalHeight === 0) return;
    
            const containerRect = containerEl.getBoundingClientRect();
            
            const containerAspectRatio = containerRect.width / containerRect.height;
            const imageAspectRatio = imageEl.naturalWidth / imageEl.naturalHeight;
            
            let baseCoverHeight;
            if (imageAspectRatio > containerAspectRatio) {
                baseCoverHeight = containerRect.height;
            } else {
                baseCoverHeight = containerRect.width / imageAspectRatio;
            }
    
            const zoomedImgHeight = baseCoverHeight * zoom;
            const maxPanPixels = Math.max(0, (zoomedImgHeight - containerRect.height) / 2);
            
            const proposedPanY = panStartPos.current.y + (clientY - dragStartPos.current.y);
            const newY = Math.max(-maxPanPixels, Math.min(maxPanPixels, proposedPanY));
            
            setPan({ x: 0, y: newY }); // Y-axis only pan
    
        } else { // Rotation logic
             const dx = clientX - dragStartPos.current.x;

            if (images && images.length === 1 && onGenerate360 && !isGenerating360) {
                if (Math.abs(dx) > 20) { // Trigger on a meaningful drag
                    onGenerate360();
                }
                return; // Prevent rotation while only one image exists
            }

            if (isGenerating360 || !images || images.length <= 1) return;

            const dragThreshold = containerRef.current.offsetWidth / (images.length * 1.2); // Sensitivity
            
            const offset = Math.round(dx / dragThreshold);
            
            const newIndex = (dragStartIndex.current - offset % images.length + images.length) % images.length;
            setCurrentIndex(newIndex);
        }
    }, [isDragging, zoom, images, onGenerate360, isGenerating360]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        pinchStartDistance.current = 0;
        if (containerRef.current) {
            containerRef.current.style.cursor = zoom > 1 ? 'grab' : 'ew-resize';
        }
    }, [zoom]);
    
    // --- IMAGE PRELOADING ---
    useEffect(() => {
        if (!images || images.length === 0) {
            setAreImagesLoading(false);
            return;
        }

        // If the images are base64, they are already loaded.
        const isUrlBased = images[0]?.startsWith('http');
        if (!isUrlBased) {
            setAreImagesLoading(false);
            return;
        }

        setAreImagesLoading(true);
        let loadedCount = 0;
        const totalImages = images.length;

        images.forEach(src => {
            const img = new Image();
            img.src = src;
            const onFinish = () => {
                loadedCount++;
                if (loadedCount === totalImages) {
                    setAreImagesLoading(false);
                }
            };
            img.onload = onFinish;
            img.onerror = () => {
                console.warn(`Failed to preload image: ${src}`);
                onFinish(); // Count errors as "finished" to not block the UI
            };
        });

    }, [images]);

    // Autoplay effect for images
    useEffect(() => {
        if (isAutoplaying && !isUserDriven && !areImagesLoading && images && images.length > 1) {
            const intervalId = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % images.length);
            }, 100); // 10fps for smooth rotation
            return () => clearInterval(intervalId);
        }
    }, [isAutoplaying, isUserDriven, areImagesLoading, images]);
    
    // Re-clamp pan when zoom changes to ensure it's always within bounds
    useEffect(() => {
        const imageEl = imageRef.current;
        const containerEl = containerRef.current;
        if (!imageEl || !containerEl || imageEl.naturalHeight === 0) return;

        if (zoom <= 1) {
            setPan({ x: 0, y: 0 });
            return;
        }

        const containerRect = containerEl.getBoundingClientRect();
        
        const containerAspectRatio = containerRect.width / containerRect.height;
        const imageAspectRatio = imageEl.naturalWidth / imageEl.naturalHeight;
        
        let baseCoverHeight;
        if (imageAspectRatio > containerAspectRatio) {
            // Wider image. Visual height is container height.
            baseCoverHeight = containerRect.height;
        } else {
            // Taller image. Visual height is scaled up to fit width.
            baseCoverHeight = containerRect.width / imageAspectRatio;
        }

        const zoomedImgHeight = baseCoverHeight * zoom;
        const maxPanPixels = Math.max(0, (zoomedImgHeight - containerRect.height) / 2);

        setPan(currentPan => ({
            x: 0,
            y: Math.max(-maxPanPixels, Math.min(maxPanPixels, currentPan.y))
        }));

    }, [zoom]);


    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handleRotate('left');
            if (e.key === 'ArrowRight') handleRotate('right');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleRotate]);
    
    // Hide controls on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsViewerActive(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // MOUSE move/up listeners for dragging
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);
    
    // MOUSE WHEEL zoom listener
    useEffect(() => {
        const currentRef = containerRef.current;
        if (!currentRef) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            handleZoom(e.deltaY < 0 ? 'in' : 'out');
        };

        currentRef.addEventListener('wheel', handleWheel, { passive: false });
        return () => currentRef.removeEventListener('wheel', handleWheel);
    }, [handleZoom]);

    // --- LOADING STATE ---
    if (areImagesLoading) {
        return (
            <div className="relative w-full h-full bg-black/20 rounded-lg overflow-hidden flex items-center justify-center">
                <Spinner text="Loading 360° View..." />
            </div>
        );
    }

    // --- FALLBACK UI ---
    if (!images || images.length === 0) {
        return (
            <div className="relative w-full max-w-2xl mx-auto aspect-[3/4] bg-black/20 rounded-lg flex items-center justify-center text-gray-500">
                <p>No content available.</p>
            </div>
        );
    }
    
    const handleDragStart = (clientX: number, clientY: number) => {
        stopAutoplay();
        setIsDragging(true);
        dragStartPos.current = { x: clientX, y: clientY };
        panStartPos.current = pan;
        dragStartIndex.current = currentIndex;
        if (containerRef.current) {
            containerRef.current.style.cursor = zoom > 1 ? 'grabbing' : 'grab';
        }
    };
    
    // TOUCH event handlers for pinch-to-zoom and drag, attached directly
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        stopAutoplay(); // Stop on any touch
        if (e.touches.length === 1) {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
        } else if (e.touches.length === 2) {
            e.preventDefault();
            setIsDragging(false); // Prevent drag from interfering with pinch
            const distance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            pinchStartDistance.current = distance;
            pinchStartZoom.current = zoom;
        }
    };
    
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (isDragging && e.touches.length === 1) {
            // A one-finger drag is for panning (if zoomed) or rotation.
            // In either case, we prevent the browser's default scroll behavior.
            e.preventDefault();
            handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        } else if (e.touches.length === 2) {
            // For pinch-to-zoom, we always prevent default to avoid page zoom.
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            if (pinchStartDistance.current > 0) {
                const scale = currentDistance / pinchStartDistance.current;
                const newZoom = pinchStartZoom.current * scale;
                const clampedZoom = Math.max(1, Math.min(newZoom, 3));
                
                setZoom(clampedZoom);
                // The useEffect hook will handle clamping and resetting the pan.
            }
        }
    };

    const cursorStyle = () => {
        if (isGenerating360) return 'wait';
        if (zoom > 1) return isDragging ? 'grabbing' : 'grab';
        if (images.length > 1) return 'ew-resize';
        if (images.length === 1 && onGenerate360) return 'ew-resize';
        return 'default';
    };

    return (
        <div 
            ref={containerRef} 
            className="relative w-full max-w-2xl mx-auto aspect-[3/4] bg-black/20 rounded-lg overflow-hidden select-none touch-none"
            onMouseDown={(e) => { setIsViewerActive(true); handleDragStart(e.clientX, e.clientY); }}
            onTouchStart={(e) => { setIsViewerActive(true); handleTouchStart(e); }}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleDragEnd}
            onTouchCancel={handleDragEnd}
            style={{ cursor: cursorStyle() }}
        >
            {isHintVisible && (
                <div 
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 pointer-events-none animate-hint"
                    onAnimationEnd={() => setIsHintVisible(false)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                    <p className="text-2xl font-bold text-white drop-shadow-lg mt-2">Drag to Rotate</p>
                </div>
            )}
            {isGenerating360 && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 p-4">
                    <Spinner text="Generating views..." />
                </div>
            )}
            <img 
                ref={imageRef}
                src={
                    images[currentIndex]?.startsWith('http')
                    ? images[currentIndex]
                    : `data:image/png;base64,${images[currentIndex]}`
                } 
                alt={VIEW_ANGLES[currentIndex]}
                className="w-full h-full object-cover transition-transform duration-100"
                style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
                draggable="false"
            />
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 p-3 bg-black/40 backdrop-blur-sm rounded-full transition-opacity duration-300 ${isViewerActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <ControlButton onClick={() => handleZoom('in')} title="Zoom In">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                </ControlButton>
                <ControlButton onClick={() => handleZoom('out')} title="Zoom Out">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                </ControlButton>
                 <ControlButton onClick={handleResetView} title="Fit to Frame">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 1v-4m0 0h-4m4 0l-5 5" /></svg>
                </ControlButton>
                <ControlButton onClick={() => handleRotate('right')} title="Rotate Right">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </ControlButton>
                <ControlButton onClick={() => handleRotate('left')} title="Rotate Left">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </ControlButton>
                {showDownloadButton && onDownload && (
                     <ControlButton onClick={() => onDownload(currentIndex, VIEW_ANGLES[currentIndex])} title="Download View">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     </ControlButton>
                )}
            </div>
        </div>
    );
};

export default OutfitViewer;