import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/beneficiaries/hooks/useBeneficiaries', () => ({
  useBeneficiariesQuery: vi.fn(),
  useBeneficiaryQuery: vi.fn(),
  useBeneficiaryByUserIdQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllApplications: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  getBeneficiaryByUserId: vi.fn(() => undefined),
  getAllBeneficiaries: vi.fn(() => []),
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getApplicationById: vi.fn(() => undefined),
  addApplication: vi.fn(),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [], applicationsByRegionId: [], recentActivity: [] })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useBeneficiaryQuery } from '../../hooks/useBeneficiaries';
import { getAllApplications } from '../../../../services/demo-data.service';
import BeneficiaryDetailPage from '../BeneficiaryDetailPage';

const baseUser = { id: 'u1', username: 'admin', fullName: 'Admin', email: 'a@b.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function renderDetail(id: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role: 'ADMIN' } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/admin/beneficiaries/${id}`]}>
        <Routes><Route path="/admin/beneficiaries/:id" element={<BeneficiaryDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const beneficiary = { id: 'ben-001', referenceId: 'BEN/2024/00001', fullName: 'Ramesh Kumar', type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North District', email: 'r@t.com', phone: '123', status: 'ACTIVE' as const, nationalId: '****4521', ssn: '****8832' };
const apps = [
  { id: 'a1', referenceNumber: 'APP-001', beneficiaryId: 'ben-001', beneficiaryName: 'Ramesh Kumar', schemeId: 's1', schemeName: 'Scheme A', requestedAmount: 100000, status: 'APPROVED' as const, submissionDate: '2025-01-15', timeline: [] },
  { id: 'a2', referenceNumber: 'APP-002', beneficiaryId: 'ben-001', beneficiaryName: 'Ramesh Kumar', schemeId: 's2', schemeName: 'Scheme B', requestedAmount: 200000, status: 'SUBMITTED' as const, submissionDate: '2025-01-20', timeline: [] },
];

describe('BeneficiaryDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderDetail('ben-001');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows not found when beneficiary is undefined', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('ben-999');
    await waitFor(() => expect(screen.getByText(/Beneficiary not found/i)).toBeInTheDocument());
  });

  it('renders beneficiary name when loaded', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(getAllApplications).mockReturnValue([]);
    renderDetail('ben-001');
    await waitFor(() => expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThanOrEqual(1));
  });

  it('renders masked nationalId starting with asterisks', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(getAllApplications).mockReturnValue([]);
    renderDetail('ben-001');
    await waitFor(() => expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThanOrEqual(1));
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('****4521');
  });

  it('shows application history when apps exist', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(getAllApplications).mockReturnValue(apps as any);
    renderDetail('ben-001');
    await waitFor(() => expect(screen.getByText('APP-001')).toBeInTheDocument());
    expect(screen.getByText('APP-002')).toBeInTheDocument();
  });

  it('shows no applications found when history is empty', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(getAllApplications).mockReturnValue([]);
    renderDetail('ben-001');
    await waitFor(() => expect(screen.getByText(/No applications found/i)).toBeInTheDocument());
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(getAllApplications).mockReturnValue([]);
    renderDetail('ben-001');
    await waitFor(() => expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
