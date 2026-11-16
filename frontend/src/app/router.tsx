import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_DEFAULT_ROUTES } from '../types/auth';
import { NotFoundPage } from '../features/common/NotFoundPage';
import { PlaceholderPage } from '../features/placeholders/PlaceholderPage';

const loadingFallback = <div className="p-6 text-text-secondary">Loading…</div>;

function lazyPage(factory: () => Promise<{ default: ComponentType }>) {
  const Component = lazy(factory);
  return (
    <Suspense fallback={loadingFallback}>
      <Component />
    </Suspense>
  );
}

/** Redirects to the role-appropriate default route. */
function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DEFAULT_ROUTES[user.role]} replace />;
}

export const router = createBrowserRouter([
  // Public routes (no AppShell, no auth)
  {
    path: '/login',
    element: lazyPage(() => import('../features/auth/pages/LoginPage')),
  },
  {
    path: '/register',
    element: lazyPage(() => import('../features/auth/pages/RegisterPage')),
  },

  // Protected routes — wrapped in ProtectedRoute, rendered inside AppShell
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <RoleRedirect /> },
          { path: 'dashboard', element: lazyPage(() => import('../features/dashboard/pages/DashboardPage')) },
          { path: 'profile', element: lazyPage(() => import('../features/profile/pages/ProfilePage')) },
          { path: 'schemes', element: lazyPage(() => import('../features/schemes/pages/SchemeListPage')) },
          { path: 'schemes/:id', element: lazyPage(() => import('../features/schemes/pages/SchemeDetailPage')) },
          { path: 'applications', element: lazyPage(() => import('../features/applications/pages/ApplicationListPage')) },
          { path: 'applications/new', element: lazyPage(() => import('../features/applications/pages/SubmitApplicationPage')) },
          { path: 'applications/:id', element: lazyPage(() => import('../features/applications/pages/ApplicationDetailPage')) },

          // Admin-only
          { path: 'admin/beneficiaries', element: lazyPage(() => import('../features/beneficiaries/pages/BeneficiaryListPage')) },
          { path: 'admin/beneficiaries/:id', element: lazyPage(() => import('../features/beneficiaries/pages/BeneficiaryDetailPage')) },
          { path: 'admin/users', element: lazyPage(() => import('../features/users/pages/UserListPage')) },
          { path: 'admin/users/new', element: lazyPage(() => import('../features/users/pages/CreateUserPage')) },
          { path: 'admin/users/:id', element: lazyPage(() => import('../features/users/pages/UserDetailPage')) },
          { path: 'admin/regions', element: lazyPage(() => import('../features/regions/pages/RegionListPage')) },
          { path: 'admin/settings', element: lazyPage(() => import('../features/settings/pages/SettingsPage')) },
          { path: 'admin/audit', element: lazyPage(() => import('../features/audit/pages/AuditLogPage')) },
          { path: 'admin/dashboard', element: lazyPage(() => import('../features/dashboard/pages/DashboardPage')) },

          // Role-scoped dashboards (all render the same DashboardPage for now)
          { path: 'portal/dashboard', element: lazyPage(() => import('../features/dashboard/pages/DashboardPage')) },
          { path: 'field/dashboard', element: lazyPage(() => import('../features/dashboard/pages/DashboardPage')) },
          { path: 'district/dashboard', element: lazyPage(() => import('../features/dashboard/pages/DashboardPage')) },
          { path: 'finance/dashboard', element: lazyPage(() => import('../features/dashboard/pages/DashboardPage')) },

          // Placeholder sections
          { path: 'verification', element: <PlaceholderPage title="Verification" description="This feature is coming soon." /> },
          { path: 'disbursement', element: <PlaceholderPage title="Disbursement" description="This feature is coming soon." /> },
          { path: 'compliance', element: <PlaceholderPage title="Compliance" description="This feature is coming soon." /> },
          { path: 'analytics', element: <PlaceholderPage title="Analytics" description="This feature is coming soon." /> },
          { path: 'beneficiary/profile', element: lazyPage(() => import('../features/beneficiaries/pages/BeneficiaryProfilePage')) },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
