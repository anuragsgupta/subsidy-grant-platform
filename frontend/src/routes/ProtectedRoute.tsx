import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AccessDeniedPage } from '../features/auth/pages/AccessDeniedPage';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  /** If provided, only these roles may access the subtree. */
  allowedRoles?: UserRole[];
}

/**
 * Guards a route subtree:
 * 1. While the session is initializing, show a full-page spinner.
 * 2. If unauthenticated, redirect to /login (preserving the attempted path).
 * 3. If authenticated but role not allowed, show Access Denied.
 * 4. Otherwise, render the child <Outlet/>.
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-gov-blue" size={32} aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
}
