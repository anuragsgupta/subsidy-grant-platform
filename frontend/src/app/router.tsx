import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { AppShell } from '../components/layout/AppShell';
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

export const router = createBrowserRouter([
  // Public routes (no AppShell)
  {
    path: '/login',
    element: lazyPage(() => import('../features/auth/pages/LoginPage')),
  },
  {
    path: '/register',
    element: lazyPage(() => import('../features/auth/pages/RegisterPage')),
  },
  // Protected routes inside AppShell
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: lazyPage(() => import('../features/dashboard/pages/DashboardPage')),
      },
      {
        path: 'profile',
        element: lazyPage(() => import('../features/profile/pages/ProfilePage')),
      },
      {
        path: 'schemes',
        element: lazyPage(() => import('../features/schemes/pages/SchemeListPage')),
      },
      {
        path: 'schemes/:id',
        element: lazyPage(() => import('../features/schemes/pages/SchemeDetailPage')),
      },
      {
        path: 'applications',
        element: lazyPage(() => import('../features/applications/pages/ApplicationListPage')),
      },
      {
        path: 'applications/new',
        element: lazyPage(() => import('../features/applications/pages/SubmitApplicationPage')),
      },
      {
        path: 'applications/:id',
        element: lazyPage(() => import('../features/applications/pages/ApplicationDetailPage')),
      },
      {
        path: 'beneficiary/profile',
        element: lazyPage(() => import('../features/beneficiaries/pages/BeneficiaryProfilePage')),
      },
      {
        path: 'admin/beneficiaries',
        element: lazyPage(() => import('../features/beneficiaries/pages/BeneficiaryListPage')),
      },
      {
        path: 'admin/beneficiaries/:id',
        element: lazyPage(() => import('../features/beneficiaries/pages/BeneficiaryDetailPage')),
      },
      {
        path: 'admin/users',
        element: lazyPage(() => import('../features/users/pages/UserListPage')),
      },
      {
        path: 'admin/users/new',
        element: lazyPage(() => import('../features/users/pages/CreateUserPage')),
      },
      {
        path: 'admin/users/:id',
        element: lazyPage(() => import('../features/users/pages/UserDetailPage')),
      },
      {
        path: 'admin/regions',
        element: lazyPage(() => import('../features/regions/pages/RegionListPage')),
      },
      {
        path: 'admin/settings',
        element: lazyPage(() => import('../features/settings/pages/SettingsPage')),
      },
      {
        path: 'admin/audit',
        element: lazyPage(() => import('../features/audit/pages/AuditLogPage')),
      },
      {
        path: 'verification',
        element: (
          <PlaceholderPage title="Verification" description="This feature is coming soon." />
        ),
      },
      {
        path: 'disbursement',
        element: (
          <PlaceholderPage title="Disbursement" description="This feature is coming soon." />
        ),
      },
      {
        path: 'compliance',
        element: (
          <PlaceholderPage title="Compliance" description="This feature is coming soon." />
        ),
      },
      {
        path: 'analytics',
        element: (
          <PlaceholderPage title="Analytics" description="This feature is coming soon." />
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
