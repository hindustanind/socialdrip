import React, { createContext, useContext, ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuthBoot } from '../hooks/useAuthBoot';
import { setLogoutFlag } from '../services/logoutFlag';
import { getProfile, upsertProfile, uploadAvatar, getAvatarURL } from '../services/profile';
import { isGeminiPreview } from '../utils/envRuntime';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
    updateProfile: (updates: Partial<Pick<User, 'displayName' | 'styleSignature'>>) => Promise<void>;
    updateAvatar: (file: File) => Promise<void>;
    isLoggingOut: boolean;
    setIsLoggingOut: React.Dispatch<React.SetStateAction<boolean>>;
    // Legacy functions for compatibility
    login: (user: User) => void;
    signup: (username: string, email: string, password: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { session, ready } = useAuthBoot();
    const [user, setUser] = useState<User | null>(null);
    const [userSnapshot, setUserSnapshot] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const logoutConfirmTimerRef = useRef<number | null>(null);

    const clearLogoutTimer = useCallback(() => {
        if (logoutConfirmTimerRef.current) {
            clearTimeout(logoutConfirmTimerRef.current);
            logoutConfirmTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        const syncUser = async () => {
            if (session?.user) {
                setLoading(true);
                try {
                    const profileData = await getProfile(session.user.id);
                    const avatarUrl = profileData?.avatar_path ? getAvatarURL(profileData.avatar_path) : null;
                    
                    const finalUser: User = {
                        id: session.user.id,
                        username: profileData?.username || session.user.email!,
                        displayName: profileData?.display_name || session.user.email!.split('@')[0],
                        profilePicture: avatarUrl,
                        styleSignature: profileData?.style_signature || 'Edit your profile to set a style signature!',
                    };
                    setUser(finalUser);
                } catch (error) {
                    console.error("AuthContext: Failed to sync user profile", error);
                    setUser({
                        id: session.user.id,
                        username: session.user.email!,
                        displayName: session.user.email!.split('@')[0],
                        profilePicture: null,
                        styleSignature: null,
                    });
                } finally {
                    setLoading(false);
                }
            } else { // session is null (SIGNED_OUT)
                if (isLoggingOut) {
                    clearLogoutTimer();
                    console.log('[logout] session null → clearing profile');
                    setUserSnapshot(null);
                }
                setUser(null);
                setLoading(false);
            }
        };
        
        if (ready) {
            syncUser();
        } else {
            setLoading(true);
        }
    }, [session, ready, isLoggingOut, clearLogoutTimer]);

    const checkLogoutConfirmation = async () => {
        logoutConfirmTimerRef.current = null;
        const { data } = await supabase.auth.getSession();

        if (data.session && userSnapshot) {
            // Logout failed/timed out, session still present.
            console.log('[logout] session present after timeout → restoring snapshot');
            setUser(userSnapshot);
            setUserSnapshot(null);
            setIsLoggingOut(false);
        }
        // If session is null, the useEffect listening on `session` will handle it.
    };

    const logout = () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        setUserSnapshot(user);
        console.log('[logout] snapshot taken');
        
        setLogoutFlag();

        const signOutOptions = isGeminiPreview() ? { scope: 'global' as const } : undefined;
        supabase.auth.signOut(signOutOptions).catch(e => console.error("[logout] Sign out error:", e));

        logoutConfirmTimerRef.current = window.setTimeout(checkLogoutConfirmation, 1500);
    };

    const updateProfile = async (updates: Partial<Pick<User, 'displayName' | 'styleSignature'>>) => {
        if (!user) throw new Error("User not authenticated");

        const profileUpdates: { display_name?: string | null; style_signature?: string | null; } = {};
        if (updates.displayName !== undefined) {
            profileUpdates.display_name = updates.displayName;
        }
        if (updates.styleSignature !== undefined) {
            profileUpdates.style_signature = updates.styleSignature;
        }

        await upsertProfile(profileUpdates);

        // Update local state to reflect changes immediately
        setUser(currentUser => currentUser ? { ...currentUser, ...updates } : null);
    };

    const updateAvatar = async (file: File) => {
        if (!user) throw new Error("User not authenticated");

        const { path } = await uploadAvatar(file);
        const newAvatarUrl = getAvatarURL(path);

        // Update local state to reflect changes immediately
        setUser(currentUser => currentUser ? { ...currentUser, profilePicture: newAvatarUrl } : null);
    };
    
    // Dummy login/signup for legacy components
    const legacyLogin = (user: User) => { /* No longer used */ };
    const legacySignup = (username: string, email: string, password: string) => false;

    const value: AuthContextType = {
        user,
        loading: !ready || loading,
        logout,
        updateProfile,
        updateAvatar,
        isLoggingOut,
        setIsLoggingOut,
        login: legacyLogin,
        signup: legacySignup
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
