import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../features/applications/services/application.service', () => ({
  applicationService: { getAll: vi.fn(), getById: vi.fn(), add: vi.fn() },
  getApplicationsForRole: vi.fn((apps: unknown[]) => apps),
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
import { applicationService } from '../../services/application.service';
import ApplicationListPage from '../ApplicationListPage';

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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><ApplicationListPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

const app1 = { id: 'app-001', referenceNumber: 'APP-20250115-000001', beneficiaryId: 'ben-001', beneficiaryName: 'Ramesh Kumar', schemeId: 'sch-002', schemeName: 'Rural Housing', requestedAmount: 200000, status: 'SUBMITTED' as const, submissionDate: '2025-01-15', timeline: [] };
const app2 = { id: 'app-002', referenceNumber: 'APP-20250116-000002', beneficiaryId: 'ben-004', beneficiaryName: 'Meera Patel', schemeId: 'sch-002', schemeName: 'Rural Housing', requestedAmount: 180000, status: 'SUBMITTED' as const, submissionDate: '2025-01-16', timeline: [] };

describe('ApplicationListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADMIN + loading shows loading skeleton', () => {
    mockRole('ADMIN');
    vi.mocked(applicationService.getAll).mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('ADMIN + empty shows empty state text', async () => {
    mockRole('ADMIN');
    vi.mocked(applicationService.getAll).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no applications match/i)).toBeInTheDocument());
  });

  it('ADMIN + 2 apps shows both reference numbers', async () => {
    mockRole('ADMIN');
    vi.mocked(applicationService.getAll).mockResolvedValue([app1, app2] as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('APP-20250115-000001')).toBeInTheDocument());
    expect(screen.getByText('APP-20250116-000002')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    mockRole('ADMIN');
    vi.mocked(applicationService.getAll).mockResolvedValue([app1] as any);
    renderPage();
    await waitFor(() => screen.getByText('APP-20250115-000001'));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });

  it('shows date range error when fromDate is after toDate', async () => {
    mockRole('ADMIN');
    vi.mocked(applicationService.getAll).mockResolvedValue([]);
    renderPage();
    await waitFor(() => screen.getByText(/no applications match/i));

    const fromInput = screen.getByLabelText(/submission date from/i);
    const toInput = screen.getByLabelText(/submission date to/i);

    fireEvent.change(fromInput, { target: { value: '2025-02-01' } });
    fireEvent.change(toInput, { target: { value: '2025-01-01' } });

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument()
    );
  });
});
