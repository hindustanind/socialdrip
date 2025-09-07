import React, { useState, useEffect } from 'react';
import { Outfit, User } from '../../types';
import OutfitViewer from '../outfitGenerator/OutfitViewer';
import Button from '../shared/Button';
import Spinner from '../shared/Spinner';
import * as geminiService from '../../services/geminiService';

interface OutfitDetailViewProps {
  outfit: Outfit;
  isDevMode: boolean;
  currentUser: User;
  onIncrementDripScore: () => void;
}

const OutfitDetailView: React.FC<OutfitDetailViewProps> = ({ outfit, isDevMode, currentUser, onIncrementDripScore }) => {
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isShareSupported, setIsShareSupported] = useState(false);

  useEffect(() => {
    if (navigator.share) {
      setIsShareSupported(true);
    }
  }, []);

  useEffect(() => {
    const fetchDescription = async () => {
      setIsLoading(true);
      
      if (outfit.description) {
        setDescription(outfit.description);
        setIsLoading(false);
        return;
      }
      
      // Fallback for older outfits without a saved description
      if (outfit.isMock) {
        setDescription(`This is a mock description for a stylish ${outfit.category} outfit, generated in Developer Mode. Based on your style profile ("${currentUser.styleSignature}"), I'd suggest pairing this with some minimalist jewelry to really let the main pieces shine. Perfect for a chic city adventure!`);
        setIsLoading(false);
      } else {
        try {
          const desc = await geminiService.generateStylingTips(
              outfit.images[0],
              outfit.category,
              currentUser.styleSignature || '',
              currentUser.displayName || 'friend'
          );
          setDescription(desc);
        } catch (error) {
          console.error("Failed to fetch outfit description:", error);
          const errorMessage = error instanceof geminiService.QuotaExceededError
            ? "So many amazing styles! You've reached the daily limit for new styling tips. Please check back tomorrow!"
            : "Could not load styling tips at the moment.";
          setDescription(errorMessage);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchDescription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfit, isDevMode, currentUser]);

  const imagesForDisplay = outfit.images;
  const imagesForDownload = outfit.originalImages || outfit.images;

  const handleDownloadImage = (imageIndex: number, angle: string) => {
    const imageUrl = imagesForDownload[imageIndex];
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageUrl}`;
    link.download = `DripSocial-Outfit-${angle.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleShare = async () => {
    if (!navigator.share) {
      alert("Web Share API is not supported in your browser.");
      return;
    }

    try {
      const highQualityImage = imagesForDownload[0];
      const dataUrl = `data:image/png;base64,${highQualityImage}`;
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'dripsocial-outfit.png', { type: 'image/png' });

      const shareData = {
        title: 'My DripSocial Outfit',
        text: 'Check out my new look!',
        files: [file],
      };

      if (!navigator.canShare || !navigator.canShare(shareData)) {
        alert("Your browser doesn't support sharing these files.");
        return;
      }

      // Use the Web Share API
      navigator.share(shareData)
        .then(() => {
          // This promise resolves when the user successfully shares OR dismisses the share sheet.
          // Due to browser privacy restrictions, we cannot distinguish between a successful share and a cancellation from the share dialog.
          // We increment the score assuming the user's intent was to share.
          console.log('Share dialog dismissed.');
          onIncrementDripScore();
        })
        .catch((error) => {
          // The promise rejects if the user cancels before the share sheet is shown (AbortError),
          // or if there's an error with the data. We do NOT increment the score in this case.
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('Share was aborted by the user.');
          } else {
            console.error('Sharing failed:', error);
            alert('An error occurred while trying to share.');
          }
        });
    } catch (error) {
      // Catches errors from fetching/creating the image file.
      console.error('Error preparing share data:', error);
      alert('Could not prepare the image for sharing.');
    }
  };


  return (
    <div className="grid md:grid-cols-2 gap-8">
      <OutfitViewer 
        images={imagesForDisplay} 
        showDownloadButton={true}
        onDownload={handleDownloadImage}
      />
      <div className="flex flex-col justify-center">
        <h3 className="text-3xl font-bold mb-2">
          {outfit.category}
        </h3>
        <div className="min-h-[100px] bg-white/5 p-4 rounded-md">
            {isLoading ? <Spinner /> : <p className="text-gray-300">{description}</p>}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {isShareSupported ? (
                <Button onClick={handleShare} variant="primary" className="w-full sm:w-auto flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                    Share Drip
                </Button>
            ) : (
                <p className="text-sm text-gray-500">Sharing is only available on compatible devices (like mobile).</p>
            )}
        </div>
      </div>
    </div>
  );
};

export default OutfitDetailView;