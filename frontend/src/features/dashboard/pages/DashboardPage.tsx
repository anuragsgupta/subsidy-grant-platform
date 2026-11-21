import { useAuth } from '../../../contexts/AuthContext';
import { AdminDashboard } from '../components/AdminDashboard';
import { BeneficiaryDashboard } from '../components/BeneficiaryDashboard';
import { DistrictOfficerDashboard } from '../components/DistrictOfficerDashboard';
import { FieldOfficerDashboard } from '../components/FieldOfficerDashboard';
import { FinanceApproverDashboard } from '../components/FinanceApproverDashboard';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';

/**
 * Entry point for the /dashboard route.
 *
 * Renders the appropriate role-specific dashboard based on the authenticated
 * user's role.  Returns null while the session is still initialising (the
 * router's <ProtectedRoute> wrapper prevents the shell from rendering this
 * page at all during that window, so null here is a safe fallback).
 *
 * This file is the default export so the router can code-split it with
 * React.lazy().
 */
export default function DashboardPage() {
  const { user } = useAuth();

  // Session not yet initialised — ProtectedRoute should prevent this,
  // but guard defensively to avoid rendering with a null user.
  if (!user) return null;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'BENEFICIARY':
      return <BeneficiaryDashboard />;
    case 'FIELD_OFFICER':
      return <FieldOfficerDashboard />;
    case 'DISTRICT_OFFICER':
      return <DistrictOfficerDashboard />;
    case 'FINANCE_APPROVER':
      return <FinanceApproverDashboard />;
    default:
      // TypeScript exhaustiveness: `user.role` is typed as UserRole so this
      // branch is unreachable in practice, but it satisfies the type-checker
      // and handles any future role value that hasn't been wired up yet.
      return <PermissionDeniedState />;
  }
}
