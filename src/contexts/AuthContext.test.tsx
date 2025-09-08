import { render, act, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';

// Mock dependencies of AuthContext
vi.mock('../hooks/useAuthBoot');
vi.mock('../services/fastLogout');
vi.mock('../services/logoutFlag');
vi.mock('../services/profile');
vi.mock('../dev/logoutProfiler');

import { useAuthBoot } from '../hooks/useAuthBoot';
import { fastLogout } from '../services/fastLogout';

// A simple test consumer component
const TestConsumer = () => {
    const auth = useAuth();
    if (auth.loading) return <div>App is loading...</div>;
    return (
        <div>
            <div data-testid="loading">{String(auth.loading)}</div>
            <div data-testid="isLoggingOut">{String(auth.isLoggingOut)}</div>
            <div data-testid="user">{auth.user ? auth.user.id : 'null'}</div>
            <button onClick={auth.logout}>Logout</button>
            <button onClick={() => auth.setIsLoggingOut(false)}>ResetLogout</button>
        </div>
    );
};


describe('AuthContext State Transitions', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // FIX: Correctly mock fastLogout to invoke its onLocalClear callback.
        vi.mocked(fastLogout).mockImplementation((options) => {
            options?.onLocalClear?.();
            return Promise.resolve();
        });
    });

    it('should correctly transition through logout states', async () => {
        // 1. Initial State (Simulate being logged in)
        vi.mocked(useAuthBoot).mockReturnValue({ session: { user: { id: '123' } }, ready: true });
        
        render(
            <AuthProvider>
                <TestConsumer />
            </AuthProvider>
        );

        // Wait for profile loading to complete.
        await screen.findByTestId('user');

        expect(screen.getByTestId('user').textContent).toBe('123');
        expect(screen.getByTestId('isLoggingOut').textContent).toBe('false');

        // 2. Click logout button
        const logoutButton = screen.getByText('Logout');
        act(() => {
            fireEvent.click(logoutButton);
        });

        // 3. Assert intermediate state during logout
        // isLoggingOut becomes true, and user becomes null.
        expect(screen.getByTestId('isLoggingOut').textContent).toBe('true');
        expect(screen.getByTestId('user').textContent).toBe('null');

        // 4. Assert that the state can be reset by a component like LoginPage
        const resetButton = screen.getByText('ResetLogout');
        act(() => {
            fireEvent.click(resetButton);
        });
        expect(screen.getByTestId('isLoggingOut').textContent).toBe('false');
    });
});
