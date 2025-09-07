import React from 'react';

interface PlaceholderViewProps {
    title: string;
    message: string;
    icon: 'search' | 'notifications' | 'messages';
}

const Icons = {
    search: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    notifications: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    messages: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
};

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title, message, icon }) => {
    const IconComponent = Icons[icon];

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center text-gray-400 page-transition-enter">
            <div className="text-[#00f2ff]/30 mb-4">
                <IconComponent />
            </div>
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff] opacity-70">
                {title} - Coming Soon
            </h2>
            <p className="mt-2 text-lg text-gray-500">{message}</p>
        </div>
    );
};

export default PlaceholderView;
