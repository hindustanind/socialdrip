import React, { createContext, useContext, ReactNode, useState } from 'react';
import { User } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
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
        window.localStorage.removeItem('dripsocial-dripscore');
        window.localStorage.removeItem('dripsocial-last-welcome-toast');
    };

    const updateProfile = async (updates: Partial<User>): Promise<void> => {
        setUser(prevUser => (prevUser ? { ...prevUser, ...updates } : null));
    };
    
    // Dummy signup for legacy components that are no longer used
    const legacySignup = (username: string, email: string, password: string) => false;

    const value = { user, setUser, loading, setLoading, logout, updateProfile, login, signup: legacySignup };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
