import React, { useState, useEffect, useCallback } from 'react';
import { Outfit, OutfitCategory } from '../../types';
import * as geminiService from '../../services/geminiService';
import ImageUploader from './ImageUploader';
import OutfitViewer from './OutfitViewer';
import Button from '../shared/Button';
import GenerationLoader from './GenerationLoader';
import useLocalStorage from '../../hooks/useLocalStorage';
import { compressImage, fileToBase64 } from '../../utils';
import ImageCropper from './ImageCropper';
import Spinner from '../shared/Spinner';

type Angle = 'Front' | 'Right' | 'Back' | 'Left';
const ALL_ANGLES: Angle[] = ['Front', 'Right', 'Back', 'Left'];

interface GenerationState {
  flowStatus: 'idle' | 'moderating' | 'cropping' | 'loading' | 'done' | 'error';
  currentAngle: Angle | null;
  images: Partial<Record<Angle, string>>;
  angleStatuses: Partial<Record<Angle, 'pending' | 'generating' | 'done' | 'error'>>;
  statusText: string;
  progress: number;
  error: string | null;
}

const initialGenerationState: GenerationState = {
  flowStatus: 'idle',
  currentAngle: null,
  images: {},
  angleStatuses: {},
  statusText: '',
  progress: 0,
  error: null,
};

interface GeneratedOutfitData {
  images: string[];
  category: OutfitCategory;
  description: string;
  isMock?: boolean;
}

interface OutfitGeneratorPageProps {
  onOutfitSaved: (newOutfit: Omit<Outfit, 'id' | 'createdAt'>) => Promise<void>;
  isDevMode: boolean;
  userName: string;
  styleSignature: string;
  outfits: Outfit[];
  showToast: (message: string, type?: 'info' | 'error', duration?: number) => void;
}

const dataUrlToMimeType = (dataUrl: string) => {
    return dataUrl.substring(dataUrl.indexOf(":") + 1, dataUrl.indexOf(";"));
}

const OutfitGeneratorPage: React.FC<OutfitGeneratorPageProps> = ({ onOutfitSaved, isDevMode, userName, styleSignature, outfits, showToast }) => {
    const [generationState, setGenerationState] = useState<GenerationState>(initialGenerationState);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [generatedOutfit, setGeneratedOutfit] = useState<GeneratedOutfitData | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'checking' | 'saving'>('idle');
    const [hasGeneratedOutfit, setHasGeneratedOutfit] = useLocalStorage<boolean>('dripsocial-has-generated-outfit', false);
    
    const generateForAngle = useCallback(async (angle: Angle, baseImage: string, frontImage?: string) => {
        try {
            let newImage: string | null = null;
            if (isDevMode) {
                await new Promise(res => setTimeout(res, 1500));
                newImage = baseImage;
            } else {
                if (!geminiService.isApiKeySet()) throw new Error("API key not configured.");
                if (angle === 'Front') {
                    const mimeType = dataUrlToMimeType(`data:image/jpeg;base64,${baseImage}`);
                    newImage = await geminiService.generateCleanFrontView(baseImage, mimeType);
                } else {
                    if (!frontImage) throw new Error("Front view image is required to generate other angles.");
                    newImage = await geminiService.generateSingleAngleView(frontImage, angle);
                }
            }
            if (!newImage) throw new Error("AI failed to generate a valid image.");
            
            setGenerationState(prev => ({
                ...prev,
                images: { ...prev.images, [angle]: newImage },
            }));
        } catch (err) {
            console.error(`Generation failed for ${angle}:`, err);
            if (err instanceof geminiService.QuotaExceededError) {
                showToast(`Hey ${userName}! ✨ You've been on a creative roll and have reached your outfit generation limit for today. Please come back tomorrow to create more amazing looks.`, 'error');
                 setGenerationState(prev => ({
                    ...prev,
                    flowStatus: 'error',
                    error: 'Daily generation limit reached. Please try again tomorrow.',
                    statusText: 'Limit Reached'
                }));
            } else {
                setGenerationState(prev => ({
                    ...prev,
                    angleStatuses: { ...prev.angleStatuses, [angle]: 'error' },
                    error: err instanceof Error ? err.message : `Failed to generate ${angle} view.`,
                    statusText: `Error generating ${angle} view`,
                }));
            }
        }
    }, [isDevMode, showToast, userName]);

    useEffect(() => {
        const { flowStatus, currentAngle, angleStatuses, images } = generationState;
        if (flowStatus === 'loading' && currentAngle && angleStatuses[currentAngle] === 'generating') {
            const baseImage = images['Front'] || (currentAngle === 'Front' ? selectedFile?.name : null);
            if (!baseImage) return;
            
            const base64Image = generationState.images['Front'] || selectedFile!.name;
            const frontViewImage = generationState.images['Front'];

            generateForAngle(currentAngle, base64Image, frontViewImage);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generationState.currentAngle, generationState.flowStatus, generateForAngle]);


    const handleFileSelected = async (file: File) => {
        if (isDevMode) {
            setGenerationState({ ...initialGenerationState, flowStatus: 'cropping' });
            setSelectedFile(file);
            return;
        }
    
        setGenerationState(prev => ({ ...prev, flowStatus: 'moderating', statusText: 'Analyzing your image...' }));
        
        try {
            if (!geminiService.isApiKeySet()) {
                throw new Error("API key not configured.");
            }
            const base64Image = await fileToBase64(file);
            const moderationResult = await geminiService.moderateImage(base64Image);
    
            if (moderationResult.isValid) {
                setSelectedFile(file);
                setGenerationState(prev => ({ ...prev, flowStatus: 'cropping' }));
            } else {
                setGenerationState(prev => ({
                    ...prev,
                    flowStatus: 'error',
                    error: moderationResult.reason,
                    statusText: 'Image Rejected'
                }));
                setSelectedFile(null);
            }
        } catch (err) {
            console.error("Image moderation failed:", err);
            if (err instanceof geminiService.QuotaExceededError) {
                showToast(`Hey ${userName}! ✨ You're uploading so many great styles! You've reached the daily analysis limit. Please come back tomorrow to add more.`, 'error');
                setGenerationState(prev => ({
                    ...prev,
                    flowStatus: 'error',
                    error: 'Daily analysis limit reached. Please try again tomorrow.',
                    statusText: 'Limit Reached'
                }));
            } else {
                setGenerationState(prev => ({
                    ...prev,
                    flowStatus: 'error',
                    error: err instanceof Error ? err.message : 'Failed to analyze the image. Please try again.',
                    statusText: 'Analysis Failed'
                }));
            }
            setSelectedFile(null);
        }
    };

    const handleGenerationStart = (croppedImageDataUrl: string) => {
        const base64Image = croppedImageDataUrl.split(',')[1];
        setSelectedFile(new File([], base64Image));

        setGenerationState({
            flowStatus: 'loading',
            currentAngle: 'Front',
            images: { 'Front': isDevMode ? base64Image : undefined },
            angleStatuses: { 'Front': 'generating', 'Right': 'pending', 'Back': 'pending', 'Left': 'pending' },
            statusText: 'Initializing...',
            progress: 0,
            error: null,
        });
    };
    
    const handlePreviewLoaded = useCallback(async () => {
      const currentAngle = generationState.currentAngle;
      if (!currentAngle) return;
  
      const newAngleStatuses = { ...generationState.angleStatuses, [currentAngle]: 'done' as const };
  
      const currentIndex = ALL_ANGLES.indexOf(currentAngle);
      const nextIndex = currentIndex + 1;
  
      if (nextIndex < ALL_ANGLES.length) {
        const nextAngle = ALL_ANGLES[nextIndex];
        setGenerationState(prev => ({
          ...prev,
          currentAngle: nextAngle,
          angleStatuses: { ...newAngleStatuses, [nextAngle]: 'generating' },
          statusText: `Generating ${nextAngle} view...`,
          progress: (nextIndex / ALL_ANGLES.length) * 80,
        }));
      } else {
        setGenerationState(prev => ({ ...prev, statusText: 'Analyzing style...', progress: 90 }));
        
        const frontView = generationState.images.Front;
        if (!frontView) {
            setGenerationState(prev => ({...prev, flowStatus: 'error', error: 'Could not get front view to finalize.'}));
            return;
        }

        try {
            const category = isDevMode ? OutfitCategory.CASUAL : await geminiService.categorizeOutfit(frontView);
            setGenerationState(prev => ({ ...prev, statusText: 'Crafting your style profile...', progress: 95 }));
            const description = isDevMode ? `This mock description for your ${category} outfit suggests pairing it with classic white sneakers for a relaxed vibe, or ankle boots to dress it up. Perfect for a day out!` : await geminiService.generateStylingTips(frontView, category, styleSignature, userName || 'friend');
            
            const finalImages = ALL_ANGLES.map(angle => generationState.images[angle]).filter((img): img is string => !!img);

            setGeneratedOutfit({ images: finalImages, category, description, isMock: isDevMode });
            setGenerationState(prev => ({...prev, flowStatus: 'done', progress: 100 }));
        } catch (err) {
            console.error("Finalization failed:", err);
            if (err instanceof geminiService.QuotaExceededError) {
                showToast(`Hey ${userName}! ✨ You've been on a creative roll and have reached your outfit generation limit for today. Please come back tomorrow to create more amazing looks.`, 'error');
                 setGenerationState(prev => ({
                    ...prev,
                    flowStatus: 'error',
                    error: 'Daily generation limit reached. Please try again tomorrow.',
                    statusText: 'Limit Reached'
                }));
            } else {
                 setGenerationState(prev => ({...prev, flowStatus: 'error', error: err instanceof Error ? err.message : 'Failed to finalize outfit.'}));
            }
        }
      }
    }, [generationState, isDevMode, userName, styleSignature, showToast]);


    const handleSave = async () => {
        if (!generatedOutfit) return;
        
        try {
            setSaveStatus('saving');
            if (!hasGeneratedOutfit) setHasGeneratedOutfit(true);
            
            const originalImages = generatedOutfit.images;
            const compressedImages = await Promise.all(
                originalImages.map(image => compressImage(image))
            );
            const outfitToSave: Omit<Outfit, 'id' | 'createdAt'> = {
                images: compressedImages,
                originalImages: originalImages,
                category: generatedOutfit.category,
                description: generatedOutfit.description,
                isMock: generatedOutfit.isMock,
                name: `${generatedOutfit.category} Style #${Math.floor(100 + Math.random() * 900)}`,
                tags: [generatedOutfit.category],
            };
            await onOutfitSaved(outfitToSave);
        } catch (err) {
            console.error("Failed to save outfit:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to save the outfit. Please try again.";
            showToast(errorMessage, 'error');
            setGenerationState(prev => ({ ...prev, error: errorMessage }));
        } finally {
            setSaveStatus('idle');
        }
    };

    const handleReset = () => {
        setGenerationState(initialGenerationState);
        setSelectedFile(null);
        setGeneratedOutfit(null);
    };

    const handleCancelCrop = () => {
        setGenerationState(initialGenerationState);
        setSelectedFile(null);
    };

    const handleDownloadImage = (imageIndex: number, angle: string) => {
        if (!generatedOutfit) return;
        const imageUrl = generatedOutfit.images[imageIndex];
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${imageUrl}`;
        link.download = `DripSocial-Outfit-${angle.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getSaveButtonText = () => {
        if (saveStatus === 'saving') return 'Saving...';
        return 'Move to My Outfits';
    };

    const renderContent = () => {
        const { flowStatus, error, statusText } = generationState;

        if (flowStatus === 'cropping' && selectedFile) {
            return (
                 <div key="cropping" className="page-transition-enter flex flex-col items-center justify-center min-h-[60vh] gap-4 w-full">
                    <ImageCropper
                        imageFile={selectedFile}
                        onCrop={handleGenerationStart}
                        onCancel={handleCancelCrop}
                    />
                </div>
            );
        }

        if (flowStatus === 'loading') {
            return (
                <div key="loading" className="page-transition-enter flex items-center justify-center min-h-[calc(100vh-11rem)]">
                    <GenerationLoader
                        progress={generationState.progress}
                        statusText={generationState.statusText}
                        previews={Object.values(generationState.images).filter((img): img is string => !!img)}
                        onPreviewLoaded={handlePreviewLoaded}
                    />
                </div>
            );
        }
        
        if (flowStatus === 'error') {
            return (
                <div key="error" className="page-transition-enter flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="my-8 p-6 bg-red-500/20 border border-red-500 text-red-300 rounded-lg max-w-lg shadow-lg">
                        <p className="font-bold text-lg mb-2">{statusText || 'Operation Failed'}</p>
                        <p>{error}</p>
                        <Button onClick={handleReset} variant="secondary" className="mt-6">Try Again</Button>
                    </div>
                </div>
            );
        }

        if (flowStatus === 'done' && generatedOutfit) {
            const { images, category, description } = generatedOutfit;
            return (
                 <div key="done" className="page-transition-enter flex flex-col items-center gap-8 w-full py-8">
                    <div className="w-full max-w-md">
                        <OutfitViewer 
                            images={images} 
                            showDownloadButton={true} 
                            onDownload={handleDownloadImage}
                            showInitialDragHint={!hasGeneratedOutfit || isDevMode}
                        />
                    </div>
                    <div className="text-center space-y-6 w-full max-w-md">
                        <div>
                            <p className="text-sm font-bold text-[#00f2ff] uppercase tracking-wider">Style Category</p>
                            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">{category}</h2>
                        </div>
                        <div className="bg-white/5 p-4 rounded-md border border-white/10">
                            <p className="text-lg text-gray-300">{description || 'Analyzing your style...'}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button onClick={handleSave} disabled={saveStatus !== 'idle'} className="w-full sm:w-auto">
                                {getSaveButtonText()}
                            </Button>
                            <Button onClick={handleReset} variant="secondary" disabled={saveStatus !== 'idle'} className="w-full sm:w-auto">Generate Another</Button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div key="idle" className="page-transition-enter grid md:grid-cols-2 gap-12 items-center">
                 {flowStatus === 'moderating' ? (
                    <div className="relative aspect-[3/4] max-h-[70vh] flex flex-col justify-center items-center bg-white/5 rounded-lg border-2 border-dashed border-[#00f2ff]">
                        <Spinner text={statusText} />
                    </div>
                ) : (
                    <ImageUploader onFileSelected={handleFileSelected} />
                )}
                <div className="text-left space-y-4">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
                            Bring Your Style to Life.
                        </span>
                    </h1>
                    <p className="text-xl text-gray-300">
                        Drop a photo of an outfit you love. Our AI, AVA, will work her magic to create a stunning 360° digital version for your virtual closet. Even if the photo is half-body, AVA will generate the complete look!
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-400">
                        <li>For best results, use a clear, well-lit, full-body photo.</li>
                        <li>Generates four interactive views: Front, Right, Back, and Left.</li>
                        <li>Automatically categorizes the style for you.</li>
                    </ul>
                    <p className="text-lg text-[#00f2ff] font-semibold">
                        Ready to digitize your wardrobe? Let's begin!
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto max-w-7xl">
            {isDevMode && generationState.flowStatus === 'idle' && (
                <div className="mb-4 p-3 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded-md text-[#00f2ff] text-center">
                    <strong>Developer Mode is ON.</strong> AI generation will be skipped, but you'll see the loading animation.
                </div>
            )}
            {renderContent()}
        </div>
    );
};

export default OutfitGeneratorPage;