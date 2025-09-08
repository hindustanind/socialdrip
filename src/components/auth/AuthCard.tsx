import React, { useState } from 'react';
import Button from '../shared/Button';
import { useAuthForms } from '../../hooks/useAuthForms';

type AuthTab = 'login' | 'signup';

const AuthCard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AuthTab>('login');

    const {
        loginEmail, setLoginEmail,
        loginPassword, setLoginPassword,
        loginError, loginLoading, login,
        email, setEmail,
        password, setPassword,
        username, setUsername,
        uStatus,
        signupError, signupLoading, createAccount,
    } = useAuthForms();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'login') {
            login();
        } else {
            createAccount();
        }
    };

    const isLogin = activeTab === 'login';
    const isSignup = activeTab === 'signup';
    
    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-black/30 backdrop-blur-lg border border-white/10 rounded-lg shadow-2xl shadow-[#00f2ff]/20">
            {/* Tabs */}
            <div className="flex justify-center p-1 bg-white/5 rounded-full">
                <button onClick={() => setActiveTab('login')} className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors ${isLogin ? 'bg-white/10 text-white' : 'text-gray-400'}`}>Login</button>
                <button onClick={() => setActiveTab('signup')} className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-colors ${!isLogin ? 'bg-white/10 text-white' : 'text-gray-400'}`}>Create Account</button>
            </div>

            <div className="space-y-4">
                {/* Form */}
                <form className="space-y-4" onSubmit={handleSubmit}>
                    {(loginError && isLogin) && <p className="text-center text-sm text-red-400 bg-red-500/10 p-2 rounded-md">{loginError}</p>}
                    {(signupError && isSignup) && <p className="text-center text-sm text-red-400 bg-red-500/10 p-2 rounded-md">{signupError}</p>}
                    
                    {isSignup && (
                         <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                                required
                                className={`w-full bg-white/5 border rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                                    uStatus === 'taken' ? 'border-red-500 focus:ring-red-500' : 'border-white/20 focus:ring-[#00f2ff]'
                                }`}
                            />
                            {uStatus === 'checking' && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 border-2 border-t-transparent border-white/50 rounded-full animate-spin"></div>
                            )}
                            {uStatus === 'taken' && <p className="text-xs text-red-400 mt-1 pl-1">Username is unavailable or invalid.</p>}
                         </div>
                    )}

                    <input
                        type="email"
                        value={isLogin ? loginEmail : email}
                        onChange={(e) => isLogin ? setLoginEmail(e.target.value) : setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full bg-white/5 border border-white/20 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f2ff] transition-all"
                    />
                    <input
                        type="password"
                        value={isLogin ? loginPassword : password}
                        onChange={(e) => isLogin ? setLoginPassword(e.target.value) : setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full bg-white/5 border border-white/20 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00f2ff] transition-all"
                    />
                    
                    <Button type="submit" className="w-full py-3" disabled={loginLoading || signupLoading || (isSignup && uStatus !== 'ok')}>
                        {isLogin ? (loginLoading ? 'Logging in...' : 'Login') : (signupLoading ? 'Creating account...' : 'Create Account')}
                    </Button>
                </form>
            </div>

            {/* Footer */}
            <p className="text-xs text-center text-gray-500">
                By continuing, you agree to our Terms and Privacy Policy.
            </p>
        </div>
    );
};

export default AuthCard;