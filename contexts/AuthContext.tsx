import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuthBoot } from '../hooks/useAuthBoot';
import useLocalStorage from '../hooks/useLocalStorage';
import { fileToBase64 } from '../utils';
import { fastLogout } from '../services/fastLogout';

interface LocalProfile {
    displayName: string | null;
    profilePicture: string | null; // base64 data URL string
    styleSignature: string | null;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
    updateProfile: (updates: Partial<Pick<User, 'displayName' | 'styleSignature'>>) => Promise<void>;
    updateAvatar: (file: File) => Promise<void>;
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
    const [loading, setLoading] = useState(true);
    
    const [localProfile, setLocalProfile] = useLocalStorage<LocalProfile | null>('dripsocial-local-profile', null);

    useEffect(() => {
        setLoading(true);
        if (session?.user) {
            // If there's a session, create a user object.
            // Use local profile data if it exists, otherwise create a default.
            const profileData = localProfile || {
                displayName: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'New User',
                profilePicture: null,
                styleSignature: 'Edit your profile to set a style signature!'
            };

            if (!localProfile) {
                setLocalProfile(profileData);
            }

            setUser({
                id: session.user.id,
                username: session.user.user_metadata?.username || session.user.email || 'user',
                displayName: profileData.displayName,
                profilePicture: profileData.profilePicture,
                styleSignature: profileData.styleSignature,
            });
        } else {
            setUser(null);
        }
        setLoading(false);
    }, [session, localProfile, setLocalProfile]);

    const logout = () => {
        fastLogout({
            onLocalClear: () => {
                setUser(null);
                setLocalProfile(null);
            },
        });
    };

    const updateProfile = async (updates: Partial<Pick<User, 'displayName' | 'styleSignature'>>) => {
        setLocalProfile(prev => {
            const newProfile = { ...(prev || {}) } as LocalProfile;
            if (updates.displayName !== undefined) newProfile.displayName = updates.displayName;
            if (updates.styleSignature !== undefined) newProfile.styleSignature = updates.styleSignature;
            return newProfile;
        });
    };

    const updateAvatar = async (file: File) => {
        const base64Image = await fileToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64Image}`;
        setLocalProfile(prev => ({
            ...(prev || { displayName: null, styleSignature: null }) as LocalProfile,
            profilePicture: dataUrl,
        }));
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
        login: legacyLogin, 
        signup: legacySignup 
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
