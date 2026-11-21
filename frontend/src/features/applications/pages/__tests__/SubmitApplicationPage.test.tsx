import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/schemes/hooks/useSchemes', () => ({
  useSchemesQuery: vi.fn(),
  useSchemeQuery: vi.fn(),
}));

vi.mock('../../../../features/beneficiaries/services/beneficiary.service', () => ({
  beneficiaryService: { getAll: vi.fn(), getById: vi.fn(), getByUserId: vi.fn() },
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  getBeneficiaryByUserId: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
  addApplication: vi.fn(),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [], applicationsByRegionId: [], recentActivity: [] })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useSchemesQuery } from '../../../schemes/hooks/useSchemes';
import { beneficiaryService } from '../../../beneficiaries/services/beneficiary.service';
import { addApplication, generateReferenceNumber, getAllApplications, getSchemeById } from '../../../../services/demo-data.service';
import { toast } from 'sonner';
import SubmitApplicationPage from '../SubmitApplicationPage';

const baseUser = { id: 'test-user-id', username: 'tester', fullName: 'Test User', email: 't@t.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><SubmitApplicationPage /></MemoryRouter></QueryClientProvider>);
}

const scheme = { id: 'sch-002', code: 'RHS-002', name: 'Rural Housing Scheme', status: 'OPEN' as const, minGrantAmount: 120000, maxGrantAmount: 250000, startDate: '2024-10-01', endDate: '2026-03-31', description: '', eligibilityCriteria: [] };

describe('SubmitApplicationPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole('BENEFICIARY'); vi.mocked(useSchemesQuery).mockReturnValue({ data: [scheme], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any); });

  it('ADMIN role shows permission denied, no form', () => {
    mockRole('ADMIN');
    renderPage();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit application/i })).not.toBeInTheDocument();
  });

  it('BENEFICIARY role renders form with submit button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
  });

  it('shows exactly one demo badge', () => {
    renderPage();
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });

  it('invalid submit shows validation error and does not call addApplication', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));
    await waitFor(() => expect(screen.getByText(/select a scheme/i)).toBeInTheDocument());
    expect(vi.mocked(addApplication)).not.toHaveBeenCalled();
  });

  it('valid submit calls addApplication once and shows success toast', async () => {
    vi.mocked(getSchemeById).mockReturnValue(scheme as any);
    vi.mocked(beneficiaryService.getByUserId).mockResolvedValue({ id: 'ben-001', fullName: 'Ramesh Kumar' } as any);
    vi.mocked(getAllApplications).mockReturnValue([]);
    vi.mocked(generateReferenceNumber).mockReturnValue('APP-20240101-000001');

    renderPage();
    fireEvent.change(screen.getByLabelText(/scheme/i), { target: { value: 'sch-002' } });
    fireEvent.change(screen.getByLabelText(/requested amount/i), { target: { value: '150000' } });
    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => expect(vi.mocked(addApplication)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(toast.success)).toHaveBeenCalled();
  });
});
