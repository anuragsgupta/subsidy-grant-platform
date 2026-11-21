import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../features/beneficiaries/services/beneficiary.service', () => ({
  beneficiaryService: { getAll: vi.fn(), getById: vi.fn(), getByUserId: vi.fn() },
}));

vi.mock('../../../../features/beneficiaries/hooks/useBeneficiaries', () => ({
  useBeneficiaryQuery: vi.fn(),
  useBeneficiariesQuery: vi.fn(),
  useBeneficiaryByUserIdQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  getBeneficiaryByUserId: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
  addApplication: vi.fn(),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({
    totalApplications: 0, pendingApplications: 0, approvedApplications: 0,
    rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [],
    applicationsByRegionId: [], recentActivity: [],
  })),
}));

vi.mock('../../../../utils/mask', () => ({
  maskField: vi.fn((v: string) => v),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useBeneficiaryQuery } from '../../../../features/beneficiaries/hooks/useBeneficiaries';
import { getAllApplications } from '../../../../services/demo-data.service';
import BeneficiaryDetailPage from '../BeneficiaryDetailPage';

const baseUser = {
  id: 'test-user-id', username: 'tester', fullName: 'Test User',
  email: 't@t.com', phone: null, active: true, role: 'ADMIN',
  regionIds: [1], createdAt: '', updatedAt: '',
};

function mockAdmin() {
  vi.mocked(useAuth).mockReturnValue({
    user: baseUser as any, isAuthenticated: true, isInitializing: false,
    login: vi.fn(), logout: vi.fn(),
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/beneficiaries/ben-001']}>
        <Routes><Route path="/admin/beneficiaries/:id" element={<BeneficiaryDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const demoBeneficiary = {
  id: 'ben-001', referenceId: 'BEN/2024/00001', fullName: 'Ramesh Kumar Verma',
  type: 'INDIVIDUAL' as const, regionId: 1, regionName: 'North District',
  email: 'ramesh@example.com', phone: '+91-9876543210', status: 'ACTIVE' as const,
  nationalId: '****4521', ssn: '****8832',
};

describe('BeneficiaryDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockAdmin(); });

  it('shows loading skeleton initially', () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows not found message when beneficiary is undefined', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(document.body.textContent?.toLowerCase()).toContain('not found')
    );
  });

  it('shows beneficiary full name when loaded', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: demoBeneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Ramesh Kumar Verma').length).toBeGreaterThanOrEqual(1)
    );
  });

  it('shows masked national ID', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: demoBeneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Ramesh Kumar Verma'));
    expect(document.body.textContent).toContain('****4521');
  });

  it('shows application history entries', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: demoBeneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    vi.mocked(getAllApplications).mockReturnValue([
      { id: 'app-001', referenceNumber: 'APP-20250115-000001', beneficiaryId: 'ben-001', beneficiaryName: 'Ramesh Kumar Verma', schemeId: 'sch-002', schemeName: 'Rural Housing', requestedAmount: 200000, status: 'SUBMITTED', submissionDate: '2025-01-15', timeline: [] },
      { id: 'app-003', referenceNumber: 'APP-20250110-000003', beneficiaryId: 'ben-001', beneficiaryName: 'Ramesh Kumar Verma', schemeId: 'sch-001', schemeName: 'Agri Fund', requestedAmount: 300000, status: 'FIELD_PENDING', submissionDate: '2025-01-10', timeline: [] },
    ] as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Ramesh Kumar Verma'));
    expect(screen.getByText('APP-20250115-000001')).toBeInTheDocument();
    expect(screen.getByText('APP-20250110-000003')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useBeneficiaryQuery).mockReturnValue({ data: demoBeneficiary, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Ramesh Kumar Verma'));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
