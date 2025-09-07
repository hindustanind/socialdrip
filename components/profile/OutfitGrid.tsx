

import React from 'react';
import { OutfitPost } from '../../types';

interface OutfitGridProps {
  posts: OutfitPost[];
  onDeletePost: (postId: string) => void;
  isOwnProfile: boolean;
}

const OutfitGrid: React.FC<OutfitGridProps> = ({ posts, onDeletePost, isOwnProfile }) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 border-2 border-dashed border-white/10 rounded-lg">
        <h3 className="text-2xl font-bold text-gray-400">Showcase is Empty</h3>
        <p className="text-gray-500 mt-2">
            {isOwnProfile ? 'Go to your "Closet" and post your favorite looks to show them off here!' : 'This user has not posted any outfits yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4">
      {posts.map((post, index) => (
        <div key={post.id} className="mb-4 break-inside-avoid group relative overflow-hidden rounded-lg">
          <img 
            src={`data:image/jpeg;base64,${post.imageUrl}`} 
            alt={`Outfit post ${index + 1}`}
            className="w-full h-auto object-cover"
          />
          {isOwnProfile && (
             <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-2">
                <div className="flex justify-end">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDeletePost(post.id); }}
                        className="p-2 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-all transform hover:scale-110 active:scale-95"
                        title="Remove from Showcase"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default OutfitGrid;
