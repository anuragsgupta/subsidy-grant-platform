import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../features/beneficiaries/services/beneficiary.service', () => ({
  beneficiaryService: { getAll: vi.fn(), getById: vi.fn(), getByUserId: vi.fn() },
}));

vi.mock('../../../../features/beneficiaries/hooks/useBeneficiaries', () => ({
  useBeneficiariesQuery: vi.fn(),
  useBeneficiaryQuery: vi.fn(),
  useBeneficiaryByUserIdQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  getBeneficiaryByUserId: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({
    totalApplications: 0, pendingApplications: 0, approvedApplications: 0,
    rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [],
    applicationsByRegionId: [], recentActivity: [],
  })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useBeneficiariesQuery } from '../../../../features/beneficiaries/hooks/useBeneficiaries';
import BeneficiaryListPage from '../BeneficiaryListPage';

const baseUser = {
  id: 'test-user-id', username: 'tester', fullName: 'Test User',
  email: 't@t.com', phone: null, active: true,
  regionIds: [1], createdAt: '', updatedAt: '',
};

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: { ...baseUser, role } as any,
    isAuthenticated: true, isInitializing: false,
    login: vi.fn(), logout: vi.fn(),
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><BeneficiaryListPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

const ben1 = { id: 'ben-001', referenceId: 'BEN/001', fullName: 'Ramesh Kumar', type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North', email: 'r@r.com', phone: '123', status: 'ACTIVE' as const, nationalId: '****4521', ssn: '****8832' };
const ben2 = { id: 'ben-002', referenceId: 'BEN/002', fullName: 'Sunita Sharma', type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North', email: 's@s.com', phone: '456', status: 'ACTIVE' as const, nationalId: '****7812', ssn: '****3341' };

describe('BeneficiaryListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('BENEFICIARY role sees permission denied', () => {
    mockRole('BENEFICIARY');
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    expect(document.body.textContent?.toLowerCase()).toMatch(/access|denied|permission/);
  });

  it('ADMIN + loading shows animate-pulse', () => {
    mockRole('ADMIN');
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('ADMIN + empty shows empty message', async () => {
    mockRole('ADMIN');
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no beneficiaries match/i)).toBeInTheDocument());
  });

  it('ADMIN + 2 beneficiaries renders both names', async () => {
    mockRole('ADMIN');
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: [ben1, ben2], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument());
    expect(screen.getByText('Sunita Sharma')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    mockRole('ADMIN');
    vi.mocked(useBeneficiariesQuery).mockReturnValue({ data: [ben1], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getByText('Ramesh Kumar'));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
