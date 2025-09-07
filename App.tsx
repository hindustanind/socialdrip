import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

type Page = 'home' | 'generator' | 'closet' | 'ava' | 'profile';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const FullScreenLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
    <div className="fixed inset-0 bg-[#0a0118] flex items-center justify-center z-[9999]">
        <Spinner text={text} />
    </div>
);

const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const previousUserRef = useRef(user); // Track previous user state

    const [viewedUserId, setViewedUserId] = useState<string | null>(null);

    const [outfits, setOutfits] = useLocalStorage<Outfit[]>('dripsocial-outfits', []);
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


    const showToast = useCallback((message: string, type: 'info' | 'error' = 'info', duration = 8000) => {
        setToast({ message, visible: true, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), duration);
    }, []);

    const incrementDripScore = useCallback(() => {
        setDripScore(prev => prev + 1);
    }, [setDripScore]);

    // Effect to scroll to top and set flag for first-time login
    useEffect(() => {
        if (!previousUserRef.current && user) { // User just logged in
            window.scrollTo({ top: 0, behavior: 'auto' });
            setIsInitialLogin(true);
        }
        previousUserRef.current = user;
    }, [user]);
    
    useEffect(() => {
        const handleError = (e: ErrorEvent) => {
            showToast(`An unexpected error occurred: ${e.message}`, 'error');
        };
        const handleRejection = (e: PromiseRejectionEvent) => {
            showToast(`An unexpected error occurred: ${e.reason?.message || 'Promise rejected'}`, 'error');
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [showToast]);

    // Effect to show the "Today's Top Picks" toast on the home page.
    useEffect(() => {
        // Conditions to exit early: not on home page, or no user.
        if (currentPage !== 'home' || !user?.displayName) {
            return;
        }

        const today = new Date().toDateString();

        // Condition 1: Is this the very first login after onboarding?
        const isFirstEverLogin = isInitialLogin;
        
        // Condition 2: Is this the first visit of the day?
        const isFirstVisitToday = lastWelcomeToastDate !== today;
        
        // If either condition is met, show the toast.
        if (isFirstEverLogin || isFirstVisitToday) {
            // Using a timeout to give the user a moment to orient themselves.
            const showTimer = setTimeout(() => {
                showToast(`🔥 Hey ${user.displayName} 👋, scroll down to see what's Trending!`);
                // Mark that we've shown the toast today.
                setLastWelcomeToastDate(today);
                // Reset the initial login flag so it doesn't trigger again this session.
                if (isInitialLogin) {
                    setIsInitialLogin(false);
                }
            }, 2000);

            // Cleanup the timer if the component unmounts or dependencies change.
            return () => clearTimeout(showTimer);
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
            if (page === p) return p;
            if (page === 'profile') {
                setViewedUserId(userId);
            }
            return page;
        });
    }, []);

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
    
    const handleOutfitSaved = useCallback((newOutfit: Omit<Outfit, 'id' | 'createdAt'>) => {
        const outfitWithId: Outfit = {
            ...newOutfit,
            id: `outfit-${Date.now()}`,
            createdAt: Date.now(),
        };
        setOutfits(prevOutfits => [outfitWithId, ...prevOutfits]);
        handleNavigate('closet');
    }, [setOutfits, handleNavigate]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        setIsInstallable(false);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
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
                setOutfits={setOutfits}
                avatar={avatar}
                setAvatar={setAvatar}
                isDevMode={isDevMode}
                setSelectedOutfit={setSelectedOutfit}
                dripScore={dripScore}
            />
        ),
        ava: (
            <AvaStylistPage userName={user?.displayName!} outfits={outfits} isDevMode={isDevMode} />
        ),
        profile: (
            <ProfilePage 
                key={viewedUserId || user?.id} // Re-mount when user changes
                viewedUserId={viewedUserId}
                onNavigate={handleNavigate}
            />
        ),
    }), [user, viewedUserId, outfits, avatar, isDevMode, setOutfits, setAvatar, setSelectedOutfit, handleNavigate, handleOutfitSaved, dripScore, showToast]);


    if (loading) {
        return <FullScreenLoader text="Loading..." />;
    }

    if (!user) {
        return <LoginPage />;
    }
    
    return (
        <div className="min-h-screen w-full relative">
            <Header 
                currentPage={currentPage} 
                setCurrentPage={handleNavigate} 
                isDevMode={isDevMode} 
                setIsDevMode={setIsDevMode} 
                isInstallable={isInstallable}
                onInstallClick={handleInstallClick}
            />
            <main className={
                currentPage === 'home'
                ? ''
                : 'pt-24 px-4 sm:px-6 lg:px-8 pb-20'
            }>
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
                    toast.visible
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-full opacity-0 pointer-events-none'
                } ${toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-700' : 'bg-gradient-to-r from-[#7b2ff7] to-[#f107a3]'}`}
                role="status"
                aria-live="polite"
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