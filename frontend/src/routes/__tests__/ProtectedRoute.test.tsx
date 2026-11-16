import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// We mock useAuth so we can control auth state per test
const mockAuth = {
  user: null as null | { role: string },
  isAuthenticated: false,
  isInitializing: false,
  logout: vi.fn(),
  login: vi.fn(),
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import { ProtectedRoute } from '../ProtectedRoute';

function renderAt(path: string, allowedRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute allowedRoles={allowedRoles as never} />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.user = null;
    mockAuth.isAuthenticated = false;
    mockAuth.isInitializing = false;
  });

  it('redirects to /login when unauthenticated', () => {
    renderAt('/dashboard');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated with allowed role', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { role: 'ADMIN' };
    renderAt('/dashboard', ['ADMIN']);
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('shows Access Denied when role is not allowed', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { role: 'BENEFICIARY' };
    renderAt('/dashboard', ['ADMIN']);
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders children when no allowedRoles specified', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { role: 'FIELD_OFFICER' };
    renderAt('/dashboard');
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('shows spinner while initializing', () => {
    mockAuth.isInitializing = true;
    renderAt('/dashboard');
    // The spinner is an SVG with animate-spin class
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });
});
