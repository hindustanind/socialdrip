

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';

// --- Interfaces & Constants ---
interface ImageCropperProps {
  imageFile: File;
  onCrop: (base64DataUrl: string) => void;
  onCancel: () => void;
}
interface Crop { x: number; y: number; width: number; height: number; }
type Interaction = | { type: 'move'; startX: number; startY: number; startCrop: Crop } | { type: 'resize'; handle: string; startX: number; startY: number; startCrop: Crop } | null;

const CROP_ASPECT = 3 / 4;
const EXPORT_WIDTH = 1440;
const EXPORT_HEIGHT = 1920;
const MIN_CROP_DIMENSION = 60; // Minimum width/height of the crop box on screen

// --- Helper Functions ---
const getOrientation = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target?.result || !(e.target.result instanceof ArrayBuffer)) {
                resolve(1); return;
            }
            const view = new DataView(e.target.result);
            if (view.getUint16(0, false) !== 0xFFD8) {
                resolve(-2); return;
            }
            let length = view.byteLength, offset = 2;
            while (offset < length) {
                if (view.getUint16(offset + 2, false) <= 8) {
                    resolve(-1); return;
                }
                const marker = view.getUint16(offset, false);
                offset += 2;
                if (marker === 0xFFE1) {
                    if (view.getUint32(offset += 2, false) !== 0x45786966) {
                        resolve(-1); return;
                    }
                    const little = view.getUint16(offset += 6, false) === 0x4949;
                    offset += view.getUint32(offset + 4, little);
                    const tags = view.getUint16(offset, little);
                    offset += 2;
                    for (let i = 0; i < tags; i++) {
                        if (view.getUint16(offset + (i * 12), little) === 0x0112) {
                            resolve(view.getUint16(offset + (i * 12) + 8, little)); return;
                        }
                    }
                } else if ((marker & 0xFF00) !== 0xFF00) {
                    break;
                } else {
                    offset += view.getUint16(offset, false);
                }
            }
            resolve(-1);
        };
        reader.readAsArrayBuffer(file.slice(0, 65536));
    });
};

// --- Main Component ---
const ImageCropper: React.FC<ImageCropperProps> = ({ imageFile, onCrop, onCancel }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [orientation, setOrientation] = useState(1);
    const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 0, height: 0 });
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);

    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const interaction = useRef<Interaction>(null);

    const getImageNaturalDimensions = useCallback(() => {
        const image = imageRef.current;
        if (!image) return { width: 0, height: 0 };
        // orientation values 5-8 are rotated 90 degrees
        const isRotatedByExif = orientation >= 5 && orientation <= 8;
        return isRotatedByExif
            ? { width: image.naturalHeight, height: image.naturalWidth }
            : { width: image.naturalWidth, height: image.naturalHeight };
    }, [orientation]);

    const initializeCrop = useCallback(() => {
        if (!imageRef.current || !containerRef.current || !isImageLoaded) return;
        const container = containerRef.current;
        const { width: imgW, height: imgH } = getImageNaturalDimensions();

        const containerRect = container.getBoundingClientRect();
        const scale = Math.min(containerRect.width / imgW, containerRect.height / imgH);
        
        const dispWidth = imgW * scale;
        const dispHeight = imgH * scale;

        let cropWidth = dispWidth * 0.85;
        let cropHeight = cropWidth / CROP_ASPECT;

        if (cropHeight > dispHeight * 0.85) {
            cropHeight = dispHeight * 0.85;
            cropWidth = cropHeight * CROP_ASPECT;
        }
        
        setCrop({
            x: (containerRect.width - cropWidth) / 2,
            y: (containerRect.height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight,
        });

    }, [isImageLoaded, getImageNaturalDimensions]);

    useEffect(() => {
        let objectUrl: string | null = null;
        const loadImage = async () => {
            setIsImageLoaded(false); // Reset for new images
            const orientationVal = await getOrientation(imageFile);
            setOrientation(orientationVal);
            objectUrl = URL.createObjectURL(imageFile);
            setImageSrc(objectUrl);
        };
        
        loadImage();
        
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [imageFile]);

    useEffect(() => {
        initializeCrop();
        window.addEventListener('resize', initializeCrop);
        return () => window.removeEventListener('resize', initializeCrop);
    }, [initializeCrop]);

    const getBounds = useCallback(() => {
        if (!containerRef.current || !imageRef.current) return { top: 0, left: 0, width: 0, height: 0 };
        const container = containerRef.current;
        const { width: imgW, height: imgH } = getImageNaturalDimensions();
        
        const scale = Math.min(container.clientWidth / imgW, container.clientHeight / imgH);
        const dispW = scale * imgW;
        const dispH = scale * imgH;
        const left = (container.clientWidth - dispW) / 2;
        const top = (container.clientHeight - dispH) / 2;

        return { top, left, width: dispW, height: dispH };
    }, [getImageNaturalDimensions]);

    const onInteractionStart = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize', handle = '') => {
        e.preventDefault();
        e.stopPropagation();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        interaction.current = { type, handle, startX: clientX, startY: clientY, startCrop: crop };
        setIsInteracting(true);
    };

    const onInteractionMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!interaction.current) return;
    
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        // FIX: Remove 'handle' from initial destructuring as it's not present on the 'move' type.
        const { startX, startY, startCrop, type } = interaction.current;
        const bounds = getBounds();
        let newCrop = { ...startCrop };
        
        const dx = clientX - startX;
        const dy = clientY - startY;
    
        if (type === 'move') {
            newCrop.x = startCrop.x + dx;
            newCrop.y = startCrop.y + dy;
        } else if (type === 'resize') {
            // 'handle' is only accessed within the 'resize' type-guard, so this is safe.
            const { handle } = interaction.current;
            let newWidth;
            if (handle.includes('right')) {
                newWidth = startCrop.width + dx;
            } else { // left
                newWidth = startCrop.width - dx;
            }
    
            // Clamp width respecting bounds and aspect ratio
            const maxAllowedWidth = Math.min(bounds.width, bounds.height * CROP_ASPECT);
            newWidth = Math.max(MIN_CROP_DIMENSION, Math.min(newWidth, maxAllowedWidth));
    
            const newHeight = newWidth / CROP_ASPECT;
    
            newCrop.width = newWidth;
            newCrop.height = newHeight;
    
            // Recalculate position for top/left handles based on clamped dimensions
            if (handle.includes('left')) {
                newCrop.x = startCrop.x + startCrop.width - newWidth;
            }
            if (handle.includes('top')) {
                newCrop.y = startCrop.y + startCrop.height - newHeight;
            }
        }
        
        // Clamp position to be within the image bounds
        newCrop.x = Math.max(bounds.left, Math.min(newCrop.x, bounds.left + bounds.width - newCrop.width));
        newCrop.y = Math.max(bounds.top, Math.min(newCrop.y, bounds.top + bounds.height - newCrop.height));
    
        setCrop(newCrop);
    }, [getBounds]);
    
    const onInteractionEnd = useCallback(() => {
      interaction.current = null;
      setIsInteracting(false);
    }, []);

    useEffect(() => {
        if (isInteracting) {
            window.addEventListener('mousemove', onInteractionMove);
            window.addEventListener('mouseup', onInteractionEnd);
            window.addEventListener('touchmove', onInteractionMove, { passive: false });
            window.addEventListener('touchend', onInteractionEnd);
        }
        return () => {
            window.removeEventListener('mousemove', onInteractionMove);
            window.removeEventListener('mouseup', onInteractionEnd);
            window.removeEventListener('touchmove', onInteractionMove);
            window.removeEventListener('touchend', onInteractionEnd);
        };
    }, [isInteracting, onInteractionMove, onInteractionEnd]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
    };

    const handleCropAction = () => {
        const image = imageRef.current;
        if (!image || !isImageLoaded) return;

        const canvas = document.createElement('canvas');
        canvas.width = EXPORT_WIDTH;
        canvas.height = EXPORT_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const bounds = getBounds();
        const { width: imgW } = getImageNaturalDimensions();
        const naturalScale = bounds.width / imgW;

        const sourceX = (crop.x - bounds.left) / naturalScale;
        const sourceY = (crop.y - bounds.top) / naturalScale;
        const sourceWidth = crop.width / naturalScale;
        const sourceHeight = crop.height / naturalScale;

        const w = EXPORT_WIDTH, h = EXPORT_HEIGHT;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        switch (orientation) {
            case 2: ctx.scale(-1, 1); break;
            case 3: ctx.rotate(Math.PI); break;
            case 4: ctx.scale(1, -1); break;
            case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
            case 6: ctx.rotate(0.5 * Math.PI); break;
            case 7: ctx.rotate(0.5 * Math.PI); ctx.scale(-1, 1); break;
            case 8: ctx.rotate(-0.5 * Math.PI); break;
        }
        ctx.translate(-w / 2, -h / 2);

        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, w, h);
        ctx.restore();

        onCrop(canvas.toDataURL('image/jpeg', 0.95));
    };
    
    const imageStyle: React.CSSProperties = {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    };

    return (
        <div className="w-full max-w-md flex flex-col items-center gap-4" onKeyDown={onKeyDown} tabIndex={-1}>
            <div className="text-center">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">Frame Your Shot</h2>
                <p className="text-gray-400">Drag and resize the frame to get the perfect crop.</p>
            </div>

            {/* Editor */}
            <div ref={containerRef} className="w-full aspect-[3/4] bg-black rounded-lg relative flex items-center justify-center overflow-hidden select-none border-2 border-white/10">
                {!isImageLoaded && <Spinner text="Loading Image..." />}
                <img
                    ref={imageRef}
                    src={imageSrc || ''}
                    alt="Crop source"
                    style={imageStyle}
                    className={isImageLoaded ? '' : 'hidden'}
                    draggable={false}
                    onLoad={() => setIsImageLoaded(true)}
                />

                {isImageLoaded && (
                    <>
                        {/* Overlay */}
                        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `0 0 0 2000px rgba(0,0,0,0.7)` }}>
                            <div style={{ position: 'absolute', top: crop.y, left: crop.x, width: crop.width, height: crop.height, boxShadow: '0 0 0 2000px rgba(0,0,0,0)', border: '1px solid rgba(255,255,255,0.5)' }}>
                            </div>
                        </div>
                        
                        {/* Crop frame */}
                        <div
                            className="absolute cursor-move"
                            style={{ top: crop.y, left: crop.x, width: crop.width, height: crop.height }}
                            onMouseDown={(e) => onInteractionStart(e, 'move')}
                            onTouchStart={(e) => onInteractionStart(e, 'move')}
                        >
                            {/* Rule of thirds */}
                            <div className="absolute top-1/3 left-0 w-full h-px bg-white/40"></div>
                            <div className="absolute top-2/3 left-0 w-full h-px bg-white/40"></div>
                            <div className="absolute left-1/3 top-0 h-full w-px bg-white/40"></div>
                            <div className="absolute left-2/3 top-0 h-full w-px bg-white/40"></div>
                            <span className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-sm">3:4</span>
                            
                            {/* Resize handles */}
                            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(handle => (
                                <div key={handle}
                                    className="absolute w-4 h-4 -m-2 border-2 border-[#00f2ff] bg-[#0a0118]/80"
                                    style={{
                                        top: handle.includes('top') ? 0 : '100%',
                                        left: handle.includes('left') ? 0 : '100%',
                                        cursor: `${handle.split('-')[0][0]}${handle.split('-')[1][0]}-resize`
                                    }}
                                    onMouseDown={(e) => onInteractionStart(e, 'resize', handle)}
                                    onTouchStart={(e) => onInteractionStart(e, 'resize', handle)}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full mt-4">
                <Button onClick={onCancel} variant="secondary">Cancel</Button>
                <Button onClick={handleCropAction} disabled={!isImageLoaded}>Crop & Continue</Button>
            </div>
        </div>
    );
};

export default ImageCropper;