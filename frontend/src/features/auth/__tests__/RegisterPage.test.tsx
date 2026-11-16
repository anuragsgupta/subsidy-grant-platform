import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock auth service
const mockRegister = vi.fn();
vi.mock('../../../services/auth.service', () => ({
  authService: { register: (...args: unknown[]) => mockRegister(...args) },
}));

// Mock auth context
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: false,
    user: null,
    isInitializing: false,
    logout: vi.fn(),
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import RegisterPage from '../pages/RegisterPage';
import { ApiError } from '../../../services/api-client';

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all five fields', () => {
    renderRegister();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it('shows Zod validation error for short username', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText(/username/i), 'ab');
    await user.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() => {
      expect(screen.getByText(/at least 4 characters/i)).toBeInTheDocument();
    });
  });

  it('shows Zod validation error for password without digit', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^Password/i), 'password');
    await user.click(screen.getByRole('button', { name: /^register$/i }));
    expect(await screen.findByText(/^Password must contain at least one letter/i)).toBeInTheDocument();
  });

  it('maps backend fieldErrors to form fields on 400', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue(
      new ApiError(
        'VALIDATION_FAILED',
        'Validation failed',
        [{ field: 'email', message: 'Email already exists' }],
        400,
      ),
    );

    renderRegister();
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^Password/i), 'password1');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('shows inline error on 409 duplicate resource', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValue(
      new ApiError('DUPLICATE_RESOURCE', 'Username already exists', undefined, 409),
    );

    renderRegister();
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/username/i), 'takenuser');
    await user.type(screen.getByLabelText(/email/i), 'test@test.com');
    await user.type(screen.getByLabelText(/^Password/i), 'password1');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });
  });

  it('submits and shows toast on success', async () => {
    const user = userEvent.setup();
    const { toast } = await import('sonner');
    mockRegister.mockResolvedValue({ id: '1', username: 'newuser', fullName: 'Test', email: 't@t.com', phone: null, active: true, role: 'BENEFICIARY', regionIds: [], createdAt: '', updatedAt: '' });

    renderRegister();
    await user.type(screen.getByLabelText(/full name/i), 'New User');
    await user.type(screen.getByLabelText(/username/i), 'newuser');
    await user.type(screen.getByLabelText(/email/i), 'new@test.com');
    await user.type(screen.getByLabelText(/^Password/i), 'password1');
    await user.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalled();
      expect(vi.mocked(toast.success)).toHaveBeenCalled();
    });
  });
});
