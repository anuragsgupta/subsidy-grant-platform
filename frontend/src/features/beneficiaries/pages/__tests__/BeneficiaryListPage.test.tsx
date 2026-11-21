import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/beneficiaries/hooks/useBeneficiaries', () => ({
  useBeneficiariesQuery: vi.fn(),
  useBeneficiaryQuery: vi.fn(),
  useBeneficiaryByUserIdQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  getBeneficiaryByUserId: vi.fn(() => undefined),
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
  addApplication: vi.fn(),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [], applicationsByRegionId: [], recentActivity: [] })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useBeneficiariesQuery } from '../../hooks/useBeneficiaries';
import BeneficiaryListPage from '../BeneficiaryListPage';

const baseUser = { id: 'u1', username: 'admin', fullName: 'Admin', email: 'a@b.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><BeneficiaryListPage /></MemoryRouter></QueryClientProvider>);
}

const ben1 = { id: 'b1', referenceId: 'BEN/2024/00001', fullName: 'Ramesh Kumar', type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North District', email: 'r@t.com', phone: '123', status: 'ACTIVE' as const, nationalId: '****4521', ssn: '****8832' };
const ben2 = { id: 'b2', referenceId: 'BEN/2024/00002', fullName: 'Sunita Devi', type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North District', email: 's@t.com', phone: '456', status: 'PENDING' as const, nationalId: '****7812', ssn: '****3341' };

describe('BeneficiaryListPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole('ADMIN'); });

  it('BENEFICIARY role shows permission denied', () => {
    mockRole('BENEFICIARY');
    renderPage();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('ADMIN + loading shows skeleton', () => {
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('ADMIN + empty shows empty state', async () => {
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText(/No beneficiaries match/i)).toBeInTheDocument());
  });

  it('ADMIN + 2 beneficiaries shows both names', async () => {
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: [ben1, ben2], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument());
    expect(screen.getByText('Sunita Devi')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: [ben1], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument());
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
