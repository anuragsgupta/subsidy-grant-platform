import React, { createContext, useContext, useEffect, useState } from 'react';
import { clearTokens, getAccessToken, saveTokens } from '../services/api-client';
import { getMe } from '../services/auth.service';
import type { TokenResponse, UserResponse } from '../types/auth';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  /** True while the startup /me call is in flight — no protected content is shown. */
  isInitializing: boolean;
  login: (tokenResponse: TokenResponse) => Promise<UserResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // On mount: hydrate user from stored token
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsInitializing(false);
      return;
    }

    getMe()
      .then((u) => setUser(u))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setIsInitializing(false));
  }, []);

  async function login(tokenResponse: TokenResponse): Promise<UserResponse> {
    saveTokens(tokenResponse);
    const u = await getMe();
    setUser(u);
    return u;
  }

  function logout(): void {
    clearTokens();
    setUser(null);
  }

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isInitializing,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook — throws if used outside the provider (catches missing wiring early)
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
