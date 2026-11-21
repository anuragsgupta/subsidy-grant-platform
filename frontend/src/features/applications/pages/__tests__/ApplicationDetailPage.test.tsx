import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../features/applications/services/application.service', () => ({
  applicationService: { getAll: vi.fn(), getById: vi.fn(), add: vi.fn() },
  getApplicationsForRole: vi.fn((apps: unknown[]) => apps),
}));

vi.mock('../../../../features/applications/hooks/useApplications', () => ({
  useApplicationQuery: vi.fn(),
  useApplicationsQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
  getAllSchemes: vi.fn(() => []),
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryByUserId: vi.fn(() => undefined),
  addApplication: vi.fn(),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({
    totalApplications: 0, pendingApplications: 0, approvedApplications: 0,
    rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [],
    applicationsByRegionId: [], recentActivity: [],
  })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useApplicationQuery } from '../../../../features/applications/hooks/useApplications';
import { getBeneficiaryByUserId } from '../../../../services/demo-data.service';
import ApplicationDetailPage from '../ApplicationDetailPage';

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

function renderPage(appId = 'app-001') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/applications/${appId}`]}>
        <Routes><Route path="/applications/:id" element={<ApplicationDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const demoApp = {
  id: 'app-001', referenceNumber: 'APP-20250115-000001', beneficiaryId: 'ben-001',
  beneficiaryName: 'Ramesh Kumar Verma', schemeId: 'sch-002', schemeName: 'Rural Housing Scheme',
  requestedAmount: 200000, status: 'SUBMITTED' as const, submissionDate: '2025-01-15',
  timeline: [
    { stage: 'SUBMITTED' as const, transitionDate: '2025-01-15T10:30:00Z', remark: 'Application submitted.' },
    { stage: 'FIELD_PENDING' as const, transitionDate: '2025-01-17T11:00:00Z', remark: 'Assigned to officer.' },
  ],
};

describe('ApplicationDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole('ADMIN'); });

  it('shows no data while loading', () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.queryByText('APP-20250115-000001')).not.toBeInTheDocument();
  });

  it('shows not found when application is undefined', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(document.body.textContent?.toLowerCase()).toContain('not found')
    );
  });

  it('shows reference number when loaded', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: demoApp, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1)
    );
  });

  it('shows both timeline stage labels', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: demoApp, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('APP-20250115-000001'));
    expect(screen.getAllByText(/submitted/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/field pending/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows 3 disabled workflow action buttons', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: demoApp, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('APP-20250115-000001'));
    const disabledBtns = screen.getAllByRole('button').filter((b) => b.hasAttribute('disabled'));
    expect(disabledBtns.length).toBeGreaterThanOrEqual(3);
  });

  it('BENEFICIARY with mismatched beneficiaryId sees permission denied', async () => {
    mockRole('BENEFICIARY');
    vi.mocked(getBeneficiaryByUserId).mockReturnValue({ id: 'ben-999' } as any);
    vi.mocked(useApplicationQuery).mockReturnValue({ data: demoApp, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(document.body.textContent?.toLowerCase()).toMatch(/access|denied|permission/));
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useApplicationQuery).mockReturnValue({ data: demoApp, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('APP-20250115-000001'));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
