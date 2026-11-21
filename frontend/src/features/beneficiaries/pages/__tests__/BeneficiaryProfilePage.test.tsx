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
import { useBeneficiaryByUserIdQuery } from '../../../../features/beneficiaries/hooks/useBeneficiaries';
import BeneficiaryProfilePage from '../BeneficiaryProfilePage';

const baseUser = {
  id: 'test-user-id', username: 'tester', fullName: 'Test User',
  email: 't@t.com', phone: null, active: true, role: 'BENEFICIARY',
  regionIds: [1], createdAt: '', updatedAt: '',
};

function mockBeneficiaryUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: baseUser as any, isAuthenticated: true, isInitializing: false,
    login: vi.fn(), logout: vi.fn(),
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><BeneficiaryProfilePage /></MemoryRouter>
    </QueryClientProvider>
  );
}

const demoBeneficiary = {
  id: 'ben-001', referenceId: 'BEN/2024/00001', fullName: 'Ramesh Kumar Verma',
  type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North District',
  email: 'ramesh@example.com', phone: '+91-9876543210', status: 'ACTIVE' as const,
  nationalId: '****4521', ssn: '****8832', linkedUserId: 'test-user-id',
};

describe('BeneficiaryProfilePage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockBeneficiaryUser(); });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows not found when no beneficiary linked', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(document.body.textContent?.toLowerCase()).toContain('not found')
    );
  });

  it('shows beneficiary full name when loaded', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: demoBeneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Ramesh Kumar Verma').length).toBeGreaterThanOrEqual(1)
    );
  });

  it('shows masked national ID value', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: demoBeneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Ramesh Kumar Verma'));
    expect(document.body.textContent).toContain('****4521');
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: demoBeneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Ramesh Kumar Verma'));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
