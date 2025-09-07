import React, { useState, useRef } from 'react';
import { Post } from './socialData';

interface FeedPostCardProps {
  post: Post;
}

const FeedPostCard: React.FC<FeedPostCardProps> = ({ post }) => {
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [animateLike, setAnimateLike] = useState(false);
    const [showLikeHeart, setShowLikeHeart] = useState(false);
    const lastTap = useRef(0);
    const likeHeartTimeout = useRef<number | null>(null);

    const handleLikeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLiked) {
            setLikeCount(prev => prev - 1);
        } else {
            setLikeCount(prev => prev + 1);
        }
        setIsLiked(!isLiked);
        setAnimateLike(true);
        // Reset animation class after it finishes
        setTimeout(() => setAnimateLike(false), 300);
    };
    
    const handleDoubleClickLike = () => {
        if (!isLiked) {
            setIsLiked(true);
            setLikeCount(prev => prev + 1);
        }

        setShowLikeHeart(true);
        if (likeHeartTimeout.current) {
            clearTimeout(likeHeartTimeout.current);
        }
        likeHeartTimeout.current = window.setTimeout(() => {
            setShowLikeHeart(false);
        }, 800); // Match animation duration
    };

    const handleImageInteraction = () => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            handleDoubleClickLike();
        }
        lastTap.current = now;
    };

    const createRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        // Calculate position relative to the button
        const rect = button.getBoundingClientRect();
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        
        circle.classList.add("ripple");

        // Remove any existing ripple to allow re-triggering
        const existingRipple = button.getElementsByClassName("ripple")[0];
        if (existingRipple) {
            existingRipple.remove();
        }
        button.appendChild(circle);
    };

    return (
        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            {/* Post Header */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                    <img src={post.user.avatarUrl} alt={post.user.displayName} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                        <p className="font-bold text-sm text-white">{post.user.displayName}</p>
                        <p className="text-xs text-gray-400">@{post.user.username} · {post.timestamp}</p>
                    </div>
                </div>
                <button className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                    <DotsIcon />
                </button>
            </div>

            {/* Post Media */}
            <div className="aspect-[4/5] bg-black relative cursor-pointer" onClick={handleImageInteraction}>
                <img src={post.mediaUrl} alt={`Post by ${post.user.displayName}`} className="w-full h-full object-cover" loading="lazy" />
                 {showLikeHeart && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="animate-like-heart-pop">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-28 w-28 text-[#f400f4]" viewBox="0 0 20 20" fill="currentColor" style={{ filter: 'drop-shadow(0px 0px 15px #f400f4)' }}>
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Post Actions */}
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleLikeClick}
                        className={`flex items-center gap-1.5 transition-colors group ${
                            isLiked ? 'text-red-500' : 'text-gray-300 hover:text-red-500'
                        }`}
                    >
                        <span className={animateLike ? 'animate-heart-beat' : ''}>
                           <HeartIcon isFilled={isLiked} />
                        </span>
                        <span className={`text-sm ${isLiked ? 'text-white' : 'group-hover:text-white'}`}>{likeCount.toLocaleString()}</span>
                    </button>
                    <button
                        onClick={createRipple}
                        className="ripple-container flex items-center gap-1.5 text-gray-300 hover:text-[#00f2ff] transition-colors group"
                    >
                        <CommentIcon /> <span className="text-sm group-hover:text-white">{post.comments.length}</span>
                    </button>
                </div>
                 <button className="text-gray-300 hover:text-white">
                    <ShareIcon />
                </button>
            </div>

            {/* Caption & Comments */}
            <div className="px-4 pb-4 space-y-2">
                <p className="text-sm">
                    <span className="font-bold mr-1.5">{post.user.username}</span>
                    {post.caption}
                </p>
                <button className="text-sm text-gray-500 hover:text-gray-300">
                    View all {post.comments.length} comments
                </button>
            </div>
        </div>
    );
};

// --- Elegant, Thin-line SVG Icons ---
const DotsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>;
const HeartIcon: React.FC<{ isFilled: boolean }> = ({ isFilled }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={isFilled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
    </svg>
);
const CommentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>;

export default FeedPostCard;