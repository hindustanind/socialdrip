import React from 'react';
import { stories } from './socialData';

const Stories: React.FC = () => {
    return (
        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
            <div className="flex space-x-4 overflow-x-auto no-scrollbar">
                {stories.map(story => (
                    <div key={story.id} className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group">
                        <div className={`relative w-16 h-16 rounded-full p-0.5
                            ${!story.seen ? 'bg-gradient-to-tr from-[#f400f4] to-[#00f2ff]' : 'bg-white/20'}`}>
                            <div className="bg-[#0a0118] p-0.5 rounded-full">
                                <img
                                    src={story.user.avatarUrl}
                                    alt={story.user.displayName}
                                    className="w-full h-full object-cover rounded-full"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{story.user.displayName}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Stories;
