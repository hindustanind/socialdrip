import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { User } from '../../types';

declare global {
  interface Window {
    scrollLockCount?: number;
  }
}

type Page = 'home' | 'generator' | 'closet' | 'ava' | 'profile';

interface HeaderProps {
    currentPage: Page;
    setCurrentPage: (page: Page, userId?: string | null) => void;
    isDevMode: boolean;
    setIsDevMode: (isDevMode: boolean) => void;
    isInstallable: boolean;
    onInstallClick: () => void;
}

const DevModeToggle: React.FC<{ isDevMode: boolean, setIsDevMode: (isDevMode: boolean) => void }> = ({ isDevMode, setIsDevMode }) => (
    <div className="flex items-center justify-between">
        <div className="flex flex-col">
            <span className={`text-base font-medium ${isDevMode ? 'text-[#00f2ff]' : 'text-gray-200'}`}>Developer Mode</span>
            <span className="text-sm text-gray-400">Skips AI generation for faster testing.</span>
        </div>
        <label htmlFor="dev-mode-toggle" className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" id="dev-mode-toggle" className="sr-only peer" checked={isDevMode} onChange={(e) => setIsDevMode(e.target.checked)} />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#00f2ff] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all duration-300 peer-checked:bg-gradient-to-r from-[#f400f4] to-[#00f2ff]"></div>
        </label>
    </div>
);

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDevMode: boolean;
    setIsDevMode: (isDevMode: boolean) => void;
    user: User;
    onUpdateUser: (updates: Partial<User>) => Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, isDevMode, setIsDevMode, user, onUpdateUser }) => {
    const [displayName, setDisplayName] = useState(user.displayName || '');

    const handleSave = async () => {
        if (displayName.trim()) {
            await onUpdateUser({ displayName: displayName.trim() });
            onClose();
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            setDisplayName(user.displayName || '');
        }
    }, [isOpen, user.displayName]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Settings">
            <div className="p-4 flex flex-col gap-6">
                <div>
                    <label htmlFor="username-input" className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                    <input
                        id="username-input"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f2ff] transition-all"
                    />
                </div>
                <DevModeToggle isDevMode={isDevMode} setIsDevMode={setIsDevMode} />
                <div className="flex justify-end gap-4 mt-4">
                    <Button onClick={onClose} variant="secondary">Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </Modal>
    );
};

interface NavLinkProps {
    id: Page;
    label: string;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const NavLink: React.FC<NavLinkProps> = ({ id, label, currentPage, setCurrentPage }) => {
    const isActive = currentPage === id;
    
    const baseClasses = "px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/20 focus:ring-[#00f2ff]";
    const activeClasses = "bg-gradient-to-r from-[#f400f4] to-[#00f2ff] text-white shadow-md shadow-black/30";
    const inactiveClasses = "text-gray-300 hover:text-white";

    return (
        <button 
            onClick={() => setCurrentPage(id)} 
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            {label}
        </button>
    );
};


const Header: React.FC<HeaderProps> = ({ currentPage, setCurrentPage, isDevMode, setIsDevMode, isInstallable, onInstallClick }) => {
    const { user: currentUser, logout, updateProfile } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
      if (isMenuOpen) {
        window.scrollLockCount = (window.scrollLockCount || 0) + 1;
        if (window.scrollLockCount === 1) {
          document.body.classList.add('no-scroll');
        }
      }
      return () => {
        if (isMenuOpen) {
          window.scrollLockCount = Math.max(0, (window.scrollLockCount || 0) - 1);
          if (window.scrollLockCount === 0) {
            document.body.classList.remove('no-scroll');
          }
        }
      };
    }, [isMenuOpen]);


    const navItems = [
        { id: 'home', label: 'Home' },
        { id: 'generator', label: 'Outfit Generator' },
        { id: 'closet', label: 'My Outfits' },
        { id: 'ava', label: 'AVA Stylist' },
    ];
    
    if (!currentUser) return null;

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-lg border-b border-white/10 px-4 sm:px-6 lg:px-8">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between h-20">
                        <div className="text-3xl font-bold tracking-tighter cursor-pointer" onClick={() => setCurrentPage('home')}>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
                                DripSocial
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <nav className="hidden md:flex items-center space-x-1 p-1 bg-black/20 rounded-full">
                                {navItems.map(item => <NavLink key={item.id} id={item.id as Page} label={item.label} currentPage={currentPage} setCurrentPage={(page) => setCurrentPage(page, null)} />)}
                            </nav>
                            <div className="flex items-center gap-4">
                                {isInstallable && (
                                    <button
                                        onClick={onInstallClick}
                                        title="Install DripSocial App"
                                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-[#00f2ff] backdrop-blur-sm hover:scale-105 hover:shadow-[0_0_15px_#00f2ff] hover:bg-white/20 text-sm font-semibold transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Install App
                                    </button>
                                )}
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                                        className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center border-2 border-transparent hover:border-[#00f2ff] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/20 focus:ring-[#00f2ff]"
                                        aria-haspopup="true"
                                        aria-expanded={isMenuOpen}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </button>
                                    {isMenuOpen && (
                                        <div className="absolute top-14 right-0 z-50 w-56 bg-[#1a0a37]/90 backdrop-blur-lg border border-[#00f2ff]/30 rounded-lg shadow-2xl shadow-[#00f2ff]/20 p-2 animate-fade-in">
                                            <div className="flex items-center gap-3 p-2 border-b border-[#00f2ff]/20 mb-2">
                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border-2 border-transparent">
                                                    {currentUser?.profilePicture ? (
                                                        <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-full" />
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-white truncate">{currentUser.displayName || 'User'}</p>
                                                    <p className="text-xs text-gray-400">Style Seeker</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { setCurrentPage('profile', currentUser.id); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-md hover:bg-[#00f2ff]/10 transition-colors ${currentPage === 'profile' ? 'text-white bg-[#00f2ff]/20' : 'text-gray-200'}`}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                                My Profile
                                            </button>
                                                <button onClick={() => { setIsSettingsModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 rounded-md hover:bg-[#00f2ff]/10 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                                </svg>
                                                Settings
                                            </button>
                                            <div className="my-1 border-t border-[#00f2ff]/20"></div>
                                            <button onClick={() => { logout(); setIsMenuOpen(false); }} title="Reset App" className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-red-400 rounded-md hover:bg-red-500/20 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <SettingsModal 
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                isDevMode={isDevMode}
                setIsDevMode={setIsDevMode}
                user={currentUser}
                onUpdateUser={updateProfile}
            />
        </>
    );
};

export default Header;