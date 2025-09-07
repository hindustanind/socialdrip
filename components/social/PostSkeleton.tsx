import React from 'react';

const PostSkeleton: React.FC = () => {
    return (
        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-white/10"></div>
                <div className="flex-grow space-y-2">
                    <div className="h-3 w-2/5 rounded bg-white/10"></div>
                    <div className="h-2 w-1/4 rounded bg-white/10"></div>
                </div>
            </div>

            {/* Media */}
            <div className="aspect-[4/5] bg-white/10"></div>

            {/* Actions & Caption */}
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-4">
                    <div className="h-4 w-12 rounded bg-white/10"></div>
                    <div className="h-4 w-12 rounded bg-white/10"></div>
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-white/10"></div>
                    <div className="h-3 w-3/4 rounded bg-white/10"></div>
                </div>
            </div>
        </div>
    );
};

export default PostSkeleton;
