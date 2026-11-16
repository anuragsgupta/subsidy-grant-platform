import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock auth service
const mockLogin = vi.fn();
vi.mock('../../../services/auth.service', () => ({
  authService: { login: (...args: unknown[]) => mockLogin(...args) },
}));

// Mock auth context
const mockContextLogin = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: (...args: unknown[]) => mockContextLogin(...args),
    isAuthenticated: false,
    user: null,
    isInitializing: false,
    logout: vi.fn(),
  }),
}));

import LoginPage from '../pages/LoginPage';
import { ApiError } from '../../../services/api-client';

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username and password fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
  });

  it('blocks submit when fields are empty and shows validation errors', async () => {
    const user = userEvent.setup();
    renderLogin();
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitBtn);

    expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('shows and hides password via toggle button', async () => {
    const user = userEvent.setup();
    renderLogin();
    const passwordInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    await user.click(screen.getByLabelText(/show password/i));
    expect(passwordInput.type).toBe('text');
    await user.click(screen.getByLabelText(/hide password/i));
    expect(passwordInput.type).toBe('password');
  });

  it('submits and calls authService.login, then context login on success', async () => {
    const user = userEvent.setup();
    const fakeToken = { accessToken: 'tok', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00Z' };
    const fakeUser = { id: '1', username: 'testuser', fullName: 'Test', email: 't@t.com', phone: null, active: true, role: 'ADMIN', regionIds: [], createdAt: '', updatedAt: '' };
    mockLogin.mockResolvedValue(fakeToken);
    mockContextLogin.mockResolvedValue(fakeUser);

    renderLogin();
    await user.type(screen.getByLabelText(/username/i), 'admin');
    await user.type(screen.getByLabelText(/^Password/i), 'password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({ username: 'admin', password: 'password1' }));
    await waitFor(() => expect(mockContextLogin).toHaveBeenCalledWith(fakeToken));
  });

  it('displays inline error on 401', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new ApiError('UNAUTHENTICATED', 'Invalid username or password', undefined, 401));

    renderLogin();
    await user.type(screen.getByLabelText(/username/i), 'wrong');
    await user.type(screen.getByLabelText(/^Password/i), 'wrongpass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
  });
});
