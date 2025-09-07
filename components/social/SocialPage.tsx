import React from 'react';

type Page = 'home' | 'generator' | 'closet' | 'ava' | 'profile';

interface SocialPageProps {
  onNavigate: (page: Page) => void;
}

const SocialPage: React.FC<SocialPageProps> = ({ onNavigate }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center text-gray-400">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
                Social Features
            </h1>
            <p className="mt-2 text-lg text-gray-500">This section has been simplified.</p>
        </div>
    );
};

export default SocialPage;
