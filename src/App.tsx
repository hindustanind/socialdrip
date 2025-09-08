import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Header from './components/myOutfits/Header';
import HomePage from './components/home/HomePage';
import OutfitGeneratorPage from './components/outfitGenerator/OutfitGeneratorPage';
import MyOutfitsPage from './components/myOutfits/MyOutfitsPage';
import AvaStylistPage from './components/ava/AvaStylistPage';
import ProfilePage from './components/profile/ProfilePage';
import Chatbot from './components/chatbot/Chatbot';
import useLocalStorage from './hooks/useLocalStorage';
import { Outfit, Avatar, User } from './types';
import OutfitDetailModal from './components/myOutfits/OutfitDetailModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import Spinner from './components/shared/Spinner';
import { listOutfits, createOutfit, deleteOutfit, updateOutfit } from './services/outfits';
import ConnectivityProbes from './components/ConnectivityProbes';
import { installPurgeCacheUtil } from './dev/purgeCache';

if (process.env.NODE_ENV !== 'production') {
    installPurgeCacheUtil();
}

type Page = 'home' | 'generator' | 'closet' | 'ava' | 'profile';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const FullScreenLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
    return createPortal(
        <div className="fixed inset-0 bg-[#0a0118] flex items-center justify-center z-[2147483647] will-change-opacity">
            <Spinner text={text} />
        </div>,
        document.body
    );
};

const AppContent: React.FC = () => {
    const { user, loading, isLoggingOut } = useAuth();
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const previousUserRef = useRef(user);

    const [viewedUserId, setViewedUserId] = useState<string | null>(null);

    const [outfits, setOutfits] = useState<Outfit[]>([]);
    const [isLoadingOutfits, setIsLoadingOutfits] = useState(true);
    const [closetError, setClosetError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    
    const [avatar, setAvatar] = useLocalStorage<Avatar | null>('dripsocial-avatar', null);
    const [dripScore, setDripScore] = useLocalStorage<number>('dripsocial-dripscore', 0);
    const [isDevMode, setIsDevMode] = useState(false);
    const [selectedOutfit, setSelectedOutfit] = useState<Outfit | null>(null);
    
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    
    const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'info' | 'error' }>({
        message: '',
        visible: false,
        type: 'info',
    });
    
    const [isInitialLogin, setIsInitialLogin] = useState(false);
    const [lastWelcomeToastDate, setLastWelcomeToastDate] = useLocalStorage<string | null>('dripsocial-last-welcome-toast', null);
    
    useEffect(() => {
        const isOverlayActive = loading || isLoggingOut;
        if (isOverlayActive) {
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.documentElement.style.overflow = '';
        };
    }, [loading, isLoggingOut]);
    
    const showToast = useCallback((message: string, type: 'info' | 'error' = 'info', duration = 8000) => {
        setToast({ message, visible: true, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), duration);
    }, []);
    
    const initializeCloset = useCallback(async () => {
        if (!user) {
            setOutfits([]);
            setIsLoadingOutfits(false);
            return;
        }
    
        setIsLoadingOutfits(true);
        setClosetError(null);
        try {
            const { items, nextCursor: newCursor } = await listOutfits();
            setOutfits(items);
            setNextCursor(newCursor);
            setHasMore(newCursor !== null);
        } catch (error: any) {
            const errorMessage = error.message || "An unknown error occurred while loading your closet.";
            console.error("Failed to initialize closet:", error);
            setClosetError(errorMessage);
            setOutfits([]); // Ensure outfits is empty on error
            showToast("Could not load your closet.", 'error');
        } finally {
            setIsLoadingOutfits(false);
        }
    }, [user, showToast]);

    const loadMoreOutfits = useCallback(async () => {
        if (!hasMore || isLoadingOutfits || !nextCursor) return;
        
        setIsLoadingOutfits(true);
        try {
            const { items, nextCursor: newCursor } = await listOutfits(20, nextCursor);
            setOutfits(prev => [...prev, ...items]);
            setNextCursor(newCursor);
            setHasMore(newCursor !== null);
        } catch (error: any) {
             const errorMessage = error.message || "An unknown error occurred while loading more outfits.";
             console.error("Failed to load more outfits:", error);
             showToast("Could not load more outfits.", 'error');
        } finally {
            setIsLoadingOutfits(false);
        }
    }, [hasMore, isLoadingOutfits, nextCursor, showToast]);


    useEffect(() => {
        initializeCloset();
    }, [initializeCloset]);


    const incrementDripScore = useCallback(() => {
        setDripScore(prev => prev + 1);
    }, [setDripScore]);

    useEffect(() => {
        if (!previousUserRef.current && user) {
            window.scrollTo({ top: 0, behavior: 'auto' });
            setIsInitialLogin(true);
        }
        previousUserRef.current = user;
    }, [user]);
    
    useEffect(() => {
        const handleError = (e: ErrorEvent) => showToast(`An unexpected error occurred: ${e.message}`, 'error');
        const handleRejection = (e: PromiseRejectionEvent) => showToast(`An unexpected error occurred: ${e.reason?.message || 'Promise rejected'}`, 'error');
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [showToast]);

    useEffect(() => {
        if (currentPage !== 'home' || !user?.displayName) return;
        const today = new Date().toDateString();
        if ((isInitialLogin || lastWelcomeToastDate !== today)) {
            const timer = setTimeout(() => {
                showToast(`🔥 Hey ${user.displayName} 👋, scroll down to see what's Trending!`);
                setLastWelcomeToastDate(today);
                if (isInitialLogin) setIsInitialLogin(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [currentPage, user, isInitialLogin, lastWelcomeToastDate, setLastWelcomeToastDate, showToast]);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleNavigate = useCallback((page: Page, userId: string | null = null) => {
        setCurrentPage(p => {
            if (page === p && (page !== 'profile' || userId === viewedUserId)) return p;
            if (page === 'profile') setViewedUserId(userId);
            return page;
        });
    }, [viewedUserId]);

    useEffect(() => {
        const preventDefault = (e: Event) => e.preventDefault();
        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('dblclick', preventDefault);
        document.addEventListener('dragstart', preventDefault);
        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('dblclick', preventDefault);
            document.removeEventListener('dragstart', preventDefault);
        };
    }, []);
    
    const handleOutfitSaved = useCallback(async (newOutfitData: Omit<Outfit, 'id' | 'createdAt'>) => {
        const newOutfit = await createOutfit({
            name: newOutfitData.name || 'New Outfit',
            description: newOutfitData.description,
            category: newOutfitData.category,
            images: newOutfitData.images,
            originalImages: newOutfitData.originalImages || [],
        });
        setOutfits(prevOutfits => [newOutfit, ...prevOutfits]);
        handleNavigate('closet');
    }, [handleNavigate]);

    const handleUpdateOutfit = useCallback(async (outfitId: string, updates: Partial<Outfit>) => {
        try {
            await updateOutfit(outfitId, updates);
            setOutfits(prev => prev.map(o => o.id === outfitId ? { ...o, ...updates } : o));
        } catch (error) {
            console.error('Failed to update outfit:', error);
            showToast('Could not update outfit.', 'error');
        }
    }, [showToast]);
    
    const handleDeleteOutfit = useCallback(async (outfitId: string) => {
        try {
            await deleteOutfit(outfitId);
            setOutfits(prev => prev.filter(o => o.id !== outfitId));
        } catch (error) {
            console.error('Failed to delete outfit:', error);
            showToast('Could not delete outfit.', 'error');
        }
    }, [showToast]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        setIsInstallable(false);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA install outcome: ${outcome}`);
        setDeferredPrompt(null);
    };

    const memoizedPages = useMemo(() => ({
        home: (
            <HomePage 
                onGetStarted={() => handleNavigate('generator')} 
                userName={user?.displayName!} 
                outfits={outfits}
                setSelectedOutfit={setSelectedOutfit}
            />
        ),
        generator: (
            <OutfitGeneratorPage
                onOutfitSaved={handleOutfitSaved}
                isDevMode={isDevMode}
                userName={user?.displayName!}
                styleSignature={user?.styleSignature!}
                outfits={outfits}
                showToast={showToast}
            />
        ),
        closet: (
            <MyOutfitsPage
                outfits={outfits}
                onUpdateOutfit={handleUpdateOutfit}
                onDeleteOutfit={handleDeleteOutfit}
                isLoading={isLoadingOutfits}
                error={closetError}
                onRetry={initializeCloset}
                avatar={avatar}
                setAvatar={setAvatar}
                isDevMode={isDevMode}
                setSelectedOutfit={setSelectedOutfit}
                dripScore={dripScore}
                loadMoreOutfits={loadMoreOutfits}
                hasMore={hasMore}
            />
        ),
        ava: (
            <AvaStylistPage userName={user?.displayName!} outfits={outfits} isDevMode={isDevMode} />
        ),
        profile: (
            <ProfilePage 
                key={viewedUserId || user?.id}
                viewedUserId={viewedUserId}
                onNavigate={handleNavigate}
            />
        ),
    }), [user, viewedUserId, outfits, isLoadingOutfits, avatar, isDevMode, setAvatar, setSelectedOutfit, handleNavigate, handleOutfitSaved, dripScore, showToast, handleUpdateOutfit, handleDeleteOutfit, closetError, initializeCloset, loadMoreOutfits, hasMore]);

    if (loading || isLoggingOut) {
        return <FullScreenLoader text={isLoggingOut ? "Logging out..." : "Loading..."} />;
    }

    if (!user) {
        return <LoginPage />;
    }
    
    return (
        <div className="min-h-screen w-full relative">
            <ConnectivityProbes />
            <Header 
                currentPage={currentPage} 
                setCurrentPage={handleNavigate} 
                isDevMode={isDevMode} 
                setIsDevMode={setIsDevMode} 
                isInstallable={isInstallable}
                onInstallClick={handleInstallClick}
            />
            <main className={currentPage === 'home' ? '' : 'pt-24 px-4 sm:px-6 lg:px-8 pb-20'}>
               <div className="relative">
                    {Object.entries(memoizedPages).map(([page, component]) => (
                        <div key={page} className={currentPage === page ? 'page-transition-enter' : 'hidden'}>
                            {component}
                        </div>
                    ))}
                </div>
            </main>
            {currentPage !== 'closet' && <Chatbot outfits={outfits} isDevMode={isDevMode} userName={user.displayName} />}
            
            {selectedOutfit && (
                <OutfitDetailModal 
                    outfit={selectedOutfit} 
                    onClose={() => setSelectedOutfit(null)} 
                    isDevMode={isDevMode}
                    currentUser={user}
                    onIncrementDripScore={incrementDripScore}
                />
            )}
            
            <div
                className={`fixed bottom-0 left-0 right-0 z-[999999] p-[14px] font-bold text-white text-center transition-[transform,opacity] duration-500 ease transform rounded-t-[8px] ${
                    toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
                } ${toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-700' : 'bg-gradient-to-r from-[#7b2ff7] to-[#f107a3]'}`}
                role="status" aria-live="polite"
            >
                {toast.message}
            </div>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
