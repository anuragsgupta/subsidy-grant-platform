import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import type { UserResponse } from '../../types/auth';

// Mock auth.service
const mockGetMe = vi.fn();
vi.mock('../../services/auth.service', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
}));

// Mock token storage helpers
const mockGetAccessToken = vi.fn();
vi.mock('../../services/api-client', () => ({
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
  clearTokens: vi.fn(),
  saveTokens: vi.fn(),
}));

import { AuthProvider, useAuth } from '../AuthContext';

const fakeUser: UserResponse = {
  id: 'uuid-1',
  username: 'admin',
  fullName: 'Admin User',
  email: 'admin@test.com',
  phone: null,
  active: true,
  role: 'ADMIN',
  regionIds: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

// Test harness to read context values
let contextValue: ReturnType<typeof useAuth> | null = null;
function ContextProbe() {
  contextValue = useAuth();
  return null;
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <ContextProbe />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextValue = null;
    vi.useRealTimers();
  });

  it('starts with isInitializing=true then false when no token', async () => {
    mockGetAccessToken.mockReturnValue(null);
    renderWithProvider();

    // Before the effect runs, should be initializing
    expect(contextValue).toBeTruthy();
    // After the effect resolves, isInitializing should be false
    await waitFor(() => {
      expect(contextValue!.isInitializing).toBe(false);
    });
    expect(contextValue!.user).toBeNull();
    expect(contextValue!.isAuthenticated).toBe(false);
  });

  it('hydrates user on startup when token is valid', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    mockGetMe.mockResolvedValue(fakeUser);

    renderWithProvider();

    await waitFor(() => {
      expect(contextValue!.user).toEqual(fakeUser);
    });
    expect(contextValue!.isAuthenticated).toBe(true);
    expect(contextValue!.isInitializing).toBe(false);
  });

  it('clears state when /me returns 401', async () => {
    mockGetAccessToken.mockReturnValue('expired-token');
    mockGetMe.mockRejectedValue(new Error('Unauthorized'));

    renderWithProvider();

    await waitFor(() => {
      expect(contextValue!.user).toBeNull();
    });
    expect(contextValue!.isAuthenticated).toBe(false);
    expect(contextValue!.isInitializing).toBe(false);
  });

  it('login() stores tokens and sets user from /me', async () => {
    mockGetAccessToken.mockReturnValue(null);
    mockGetMe.mockResolvedValue(fakeUser);

    renderWithProvider();

    await waitFor(() => {
      expect(contextValue!.isInitializing).toBe(false);
    });

    const tokenResp = { accessToken: 'new-token', tokenType: 'Bearer' as const, expiresAt: '2099-01-01T00:00:00Z' };
    const user = await act(async () => contextValue!.login(tokenResp));

    expect(user).toEqual(fakeUser);
    expect(contextValue!.user).toEqual(fakeUser);
    expect(contextValue!.isAuthenticated).toBe(true);
  });

  it('logout() clears user', async () => {
    mockGetAccessToken.mockReturnValue('valid-token');
    mockGetMe.mockResolvedValue(fakeUser);

    renderWithProvider();

    await waitFor(() => {
      expect(contextValue!.isAuthenticated).toBe(true);
    });

    act(() => contextValue!.logout());

    expect(contextValue!.user).toBeNull();
    expect(contextValue!.isAuthenticated).toBe(false);
  });
});
