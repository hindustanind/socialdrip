import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => void;
    updateProfile: (updates: Partial<User>) => Promise<void>;
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
    const [user, setUser] = useLocalStorage<User | null>('dripsocial-user', null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
                    console.error('Error fetching profile:', error);
                    setUser(null);
                } else if (profile) {
                    const appUser: User = {
                        id: session.user.id,
                        username: profile.username,
                        displayName: profile.username,
                        styleSignature: profile.style_signature || `Exploring the world of fashion with DripSocial!`,
                        profilePicture: profile.avatar_url || null,
                    };
                    setUser(appUser);
                } else {
                    setUser(null); // User exists in auth, but not in profiles. Log them out.
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = (user: User) => {
        setUser(user);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        // Clear all app data for a full reset
        window.localStorage.removeItem('dripsocial-outfits');
        window.localStorage.removeItem('dripsocial-avatar');
        window.localStorage.removeItem('dripsocial-user');
    };

    const updateProfile = async (updates: Partial<User>): Promise<void> => {
        setUser(prevUser => (prevUser ? { ...prevUser, ...updates } : null));
    };
    
    // Dummy signup for legacy components that are no longer used
    const legacySignup = (username: string, email: string, password: string) => false;

    const value = { user, loading, logout, updateProfile, login, signup: legacySignup };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
