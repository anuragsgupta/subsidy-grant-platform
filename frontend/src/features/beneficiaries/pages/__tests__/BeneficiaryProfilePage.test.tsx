import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/beneficiaries/hooks/useBeneficiaries', () => ({
  useBeneficiariesQuery: vi.fn(),
  useBeneficiaryQuery: vi.fn(),
  useBeneficiaryByUserIdQuery: vi.fn(),
}));

vi.mock('../../../../components/layout/PageContainer', () => ({
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
import { useBeneficiaryByUserIdQuery } from '../../hooks/useBeneficiaries';
import BeneficiaryProfilePage from '../BeneficiaryProfilePage';

const baseUser = { id: 'test-user-id', username: 'tester', fullName: 'Test User', email: 't@t.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function renderProfile() {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role: 'BENEFICIARY' } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><BeneficiaryProfilePage /></MemoryRouter></QueryClientProvider>);
}

const beneficiary = { id: 'ben-001', referenceId: 'BEN/2024/00001', fullName: 'Ramesh Kumar', type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North District', email: 'r@t.com', phone: '123', status: 'ACTIVE' as const, nationalId: '****4521', ssn: '****8832' };

describe('BeneficiaryProfilePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state with skeleton', () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    renderProfile();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows not found when beneficiary is undefined', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderProfile();
    await waitFor(() => expect(screen.getByText(/Profile not found/i)).toBeInTheDocument());
  });

  it('renders beneficiary name when loaded', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderProfile();
    await waitFor(() => expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThanOrEqual(1));
  });

  it('renders identity fields at stored masked value', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderProfile();
    await waitFor(() => expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThanOrEqual(1));
    const bodyText = document.body.textContent ?? '';
    expect(bodyText).toContain('****4521');
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useBeneficiaryByUserIdQuery).mockReturnValue({ data: beneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderProfile();
    await waitFor(() => expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
