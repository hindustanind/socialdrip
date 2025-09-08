import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supa';
import { loadProfile, updateProfileData, uploadProfileAvatar } from '../lib/profile';
import { profiler } from '../dev/logoutProfiler';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isLoggingOut: boolean;
    setIsLoggingOut: React.Dispatch<React.SetStateAction<boolean>>;
    logout: () => void;
    updateProfile: (updates: Partial<Pick<User, 'displayName' | 'styleSignature'>>) => Promise<void>;
    updateAvatar: (file: File) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within a AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    useEffect(() => {
        setLoading(true);
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
                if (session) {
                    try {
                        const profile = await loadProfile();
                        setUser(profile);
                    } catch (error) {
                        console.error("[AUTH] Failed to load profile on auth change:", error);
                        setUser(null); // Clear user on profile load failure
                    }
                } else {
                    setUser(null);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
            setLoading(false);
        });
        
        // Initial check in case onAuthStateChange doesn't fire for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const logout = useCallback(async () => {
        if (process.env.NODE_ENV !== 'production') profiler.start();
        setIsLoggingOut(true);
        
        // Defer sign out to ensure it doesn't block the UI transition for the overlay
        queueMicrotask(async () => {
            const { error } = await supabase.auth.signOut();
            if (error) console.error("Sign out error:", error);
            // onAuthStateChange listener will set user to null, triggering rerender to LoginPage
        });
    }, []);

    const updateProfile = async (updates: Partial<Pick<User, 'displayName' | 'styleSignature'>>) => {
        if (!user) throw new Error("User not authenticated");
        await updateProfileData(updates);
        // Optimistically update local state for a snappier UI response
        setUser(currentUser => currentUser ? { ...currentUser, ...updates } : null);
    };

    const updateAvatar = async (file: File) => {
        if (!user) throw new Error("User not authenticated");
        const { publicUrl } = await uploadProfileAvatar(file);
        // Update local state with the new public URL from storage
        setUser(currentUser => currentUser ? { ...currentUser, profilePicture: publicUrl } : null);
    };
    
    const value: AuthContextType = useMemo(() => ({ 
        user, 
        loading,
        isLoggingOut,
        setIsLoggingOut,
        logout, 
        updateProfile, 
        updateAvatar,
    }), [user, loading, isLoggingOut, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
