import React, { useEffect } from 'react';
import ImageCarouselColumn from './ImageCarouselColumn';
import AuthCard from './AuthCard';
import { clearLogoutFlag } from '../../services/logoutFlag';
import { useAuth } from '../../contexts/AuthContext';

// Dev-only profiler import
import { profiler } from "../../dev/logoutProfiler";

const LoginPage: React.FC = () => {
    const { isLoggingOut, setIsLoggingOut } = useAuth();

    useEffect(() => {
        // Mark the final step of the logout profiling sequence.
        if (process.env.NODE_ENV !== 'production') {
            profiler.markLoginMounted();
        }

        // When the login page mounts, the logout process is considered complete.
        // This clears the session flag and tells the AuthContext to remove the overlay.
        clearLogoutFlag();
        if (isLoggingOut) {
            setIsLoggingOut(false);
        }

        const preventDefault = (e: Event) => e.preventDefault();
        
        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('dblclick', preventDefault);
        document.addEventListener('dragstart', preventDefault);

        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('dblclick', preventDefault);
            document.removeEventListener('dragstart', preventDefault);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="h-screen w-full bg-[#0a0118] relative grid grid-cols-1 lg:grid-cols-2 overflow-hidden select-none">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-grid-white/[0.05]"></div>
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center bg-[#0a0118] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

            {/* Left Column: Image Carousel (Desktop Only) */}
            <div className="hidden lg:flex items-center justify-center overflow-hidden h-screen relative">
                <ImageCarouselColumn />
            </div>
            
            {/* Right Column: Auth Card (and Mobile View) */}
            <div className="relative flex flex-col items-center justify-center p-4 h-screen">
                <h1 className="text-5xl font-extrabold tracking-tight mb-8 text-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f400f4] to-[#00f2ff]">
                        DripSocial
                    </span>
                </h1>
                <AuthCard />
            </div>
        </div>
    );
};

export default LoginPage;
