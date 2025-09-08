
import React, { useState, useRef, useEffect } from 'react';
import { Outfit } from '../../types';

interface OutfitCardProps {
  outfit: Outfit;
  onToggleFavorite: () => void;
  onUpdate: (updates: Partial<Outfit>) => void;
  onTryOn: () => void;
  onViewDetail: () => void;
  onDelete: () => void;
}

const ActionButton: React.FC<{ onClick: (e: React.MouseEvent) => void; label: string; children: React.ReactNode; className?: string }> = ({ onClick, label, children, className }) => (
    <button onClick={onClick} aria-label={label} className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-gray-200 rounded-md hover:bg-white/10 transition-colors ${className}`}>
        {children}
    </button>
);

const OutfitCard = React.memo<OutfitCardProps>(({ outfit, onToggleFavorite, onUpdate, onTryOn, onViewDetail, onDelete }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [draftName, setDraftName] = useState(outfit.name || '');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    
    const cardRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const clickTimeoutRef = useRef<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const outfitName = outfit.name || `Outfit #${outfit.id.slice(-4)}`;
    const tags = outfit.tags || [];

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleRename = () => {
        if (draftName.trim() && draftName !== outfit.name) {
            onUpdate({ name: draftName.trim() });
        }
        setIsRenaming(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleRename();
        if (e.key === 'Escape') {
            setDraftName(outfit.name || '');
            setIsRenaming(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isRenaming) onViewDetail();
    };
    
    useEffect(() => {
        return () => {
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
            }
        };
    }, []);

    const handleCardClick = () => {
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 150);

        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            onToggleFavorite();
        } else {
            clickTimeoutRef.current = window.setTimeout(() => {
                onViewDetail();
                clickTimeoutRef.current = null;
            }, 250);
        }
    };

    if (outfit.isUploading || !outfit.images || outfit.images.length === 0) {
        return (
            <div role="group" aria-label="Uploading outfit..." className="relative aspect-[3/4] rounded-lg bg-white/5 overflow-hidden flex flex-col justify-end">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                <div className="w-full p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                     {outfit.uploadError ? (
                        <div className="text-center">
                            <p className="font-bold text-red-400">Upload Failed</p>
                            <p className="text-xs text-red-500" title={outfit.uploadError}>{outfit.uploadError}</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-gradient-to-r from-[#f400f4] to-[#00f2ff] h-1.5 rounded-full" style={{ width: `${outfit.progress || 0}%` }}></div></div>
                            <p className="font-bold truncate text-sm mt-1">{outfit.name || 'Uploading...'}</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={cardRef}
            className={`outfit-card-border-glow relative aspect-[3/4] rounded-lg group bg-gray-800 transition-all duration-150 ease-in-out hover:shadow-lg ${isPressed ? 'scale-95 border-2 border-[#00f2ff] shadow-[0_0_25px_#00f2ff]' : 'scale-100 border-2 border-transparent'}`}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="group"
            aria-label={outfitName}
        >
            <img
                src={outfit.images[0]}
                alt={outfitName}
                className="relative z-[1] w-full h-full object-cover transition-opacity duration-200 rounded-lg"
                draggable="false"
                loading="lazy"
            />
            
            <div className="absolute inset-0 bg-black/50 transition-opacity duration-300 opacity-0 group-hover:opacity-100 rounded-lg z-[2]" />

            <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                    className={`p-2 rounded-full transition-all duration-300 ${outfit.isFavorite ? 'bg-red-500/80 text-white shadow-lg shadow-red-500/50' : 'bg-black/50 text-gray-300 hover:bg-black/70 hover:text-white'}`}
                    aria-label={outfit.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </button>
                 <button
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                    className="p-2 rounded-full bg-black/50 text-gray-300 hover:bg-black/70 hover:text-white"
                    aria-label="More options"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </div>

            {isMenuOpen && (
                <div ref={menuRef} onClick={e => e.stopPropagation()} className="absolute top-12 right-2 z-20 w-44 bg-gray-200/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-lg p-2 animate-fade-in">
                    <ActionButton onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setIsMenuOpen(false); }} label="Rename outfit">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                        <span>Rename</span>
                    </ActionButton>
                    <ActionButton onClick={(e) => { e.stopPropagation(); onTryOn(); setIsMenuOpen(false); }} label="Try on in Dressing Room">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3-5 3V4z" /></svg>
                        <span>Try On</span>
                    </ActionButton>
                    <div className="my-1 border-t border-white/10"></div>
                    <ActionButton onClick={(e) => { e.stopPropagation(); onDelete(); setIsMenuOpen(false); }} label="Delete outfit" className="text-red-400 hover:bg-red-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        <span>Delete</span>
                    </ActionButton>
                </div>
            )}


            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none rounded-b-lg z-[5]">
                {isRenaming ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={handleRenameKeyDown}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-white/10 border border-white/20 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#00f2ff] pointer-events-auto"
                    />
                ) : (
                     <h3 className="font-bold text-white truncate drop-shadow-lg">{outfitName}</h3>
                )}
                 <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-white/20 text-white rounded-full">{tag}</span>
                    ))}
                </div>
            </div>
        </div>
    );
});
export default OutfitCard;
