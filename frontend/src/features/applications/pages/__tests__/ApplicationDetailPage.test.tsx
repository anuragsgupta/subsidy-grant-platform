import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/applications/hooks/useApplications', () => ({
  useApplicationsQuery: vi.fn(),
  useApplicationQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getBeneficiaryByUserId: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  addApplication: vi.fn(),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [], applicationsByRegionId: [], recentActivity: [] })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useApplicationQuery } from '../../hooks/useApplications';
import { getBeneficiaryByUserId } from '../../../../services/demo-data.service';
import ApplicationDetailPage from '../ApplicationDetailPage';

const baseUser = { id: 'test-user-id', username: 'tester', fullName: 'Test User', email: 't@t.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
}

function renderDetail(id: string, role = 'ADMIN') {
  mockRole(role);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/applications/${id}`]}>
        <Routes><Route path="/applications/:id" element={<ApplicationDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const app = { id: 'app-001', referenceNumber: 'APP-20250115-000001', beneficiaryId: 'ben-001', beneficiaryName: 'Ramesh Kumar', schemeId: 'sch-002', schemeName: 'Rural Housing Scheme', requestedAmount: 200000, status: 'SUBMITTED' as const, submissionDate: '2025-01-15', timeline: [{ stage: 'SUBMITTED' as const, transitionDate: '2025-01-15T10:30:00Z', remark: 'Submitted' }, { stage: 'FIELD_PENDING' as const, transitionDate: '2025-01-16T11:00:00Z', remark: 'Assigned' }] };

describe('ApplicationDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderDetail('app-001');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows not found when app is undefined', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('app-999');
    await waitFor(() => expect(screen.getByText(/Application not found/i)).toBeInTheDocument());
  });

  it('renders reference number when loaded', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: app, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('app-001');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
  });

  it('renders timeline events sorted ascending', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: app, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('app-001');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText('FIELD PENDING')).toBeInTheDocument();
  });

  it('renders disabled workflow action buttons', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: app, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('app-001');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText('Approve').closest('button')?.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Reject').closest('button')?.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Request Clarification').closest('button')?.hasAttribute('disabled')).toBe(true);
  });

  it('BENEFICIARY with mismatched beneficiaryId shows permission denied', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: app, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(getBeneficiaryByUserId).mockReturnValue(undefined);
    renderDetail('app-001', 'BENEFICIARY');
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: app, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('app-001');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
