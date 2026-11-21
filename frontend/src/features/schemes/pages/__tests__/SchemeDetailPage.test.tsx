import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/schemes/hooks/useSchemes', () => ({
  useSchemesQuery: vi.fn(),
  useSchemeQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryById: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
  addApplication: vi.fn(),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({ totalApplications: 0, pendingApplications: 0, approvedApplications: 0, rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [], applicationsByRegionId: [], recentActivity: [] })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useSchemeQuery } from '../../hooks/useSchemes';
import SchemeDetailPage from '../SchemeDetailPage';

const baseUser = { id: 'u1', username: 'admin', fullName: 'Admin', email: 'a@b.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
}

function renderDetail(id: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/schemes/${id}`]}>
        <Routes><Route path="/schemes/:id" element={<SchemeDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const scheme = { id: 'sch-001', code: 'AGR-001', name: 'Agricultural Modernisation Fund', description: 'Test desc', status: 'OPEN' as const, minGrantAmount: 50000, maxGrantAmount: 500000, startDate: '2025-01-01', endDate: '2025-12-31', eligibilityCriteria: [{ attribute: 'income', operator: 'GTE' as const, threshold: '50000', mandatory: true, description: 'Test criterion' }, { attribute: 'age', operator: 'GTE' as const, threshold: '18', mandatory: true }] };

describe('SchemeDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole('ADMIN'); });

  it('shows loading state', () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderDetail('sch-001');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows not found message when scheme is undefined', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('sch-999');
    await waitFor(() => expect(screen.getByText(/Scheme not found/i)).toBeInTheDocument());
  });

  it('renders scheme name when loaded', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: scheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('sch-001');
    await waitFor(() => expect(screen.getAllByText('Agricultural Modernisation Fund').length).toBeGreaterThanOrEqual(1));
  });

  it('renders eligibility criteria', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: scheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('sch-001');
    await waitFor(() => expect(screen.getByText('income')).toBeInTheDocument());
    expect(screen.getByText('age')).toBeInTheDocument();
  });

  it('ADMIN sees disabled Edit button', async () => {
    mockRole('ADMIN');
    vi.mocked(useSchemeQuery).mockReturnValue({ data: scheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('sch-001');
    await waitFor(() => expect(screen.getAllByText('Agricultural Modernisation Fund').length).toBeGreaterThanOrEqual(1));
    const editBtn = screen.getByText(/Edit Scheme/i);
    expect(editBtn.closest('button')?.hasAttribute('disabled')).toBe(true);
  });

  it('BENEFICIARY does not see Edit button', async () => {
    mockRole('BENEFICIARY');
    vi.mocked(useSchemeQuery).mockReturnValue({ data: scheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('sch-001');
    await waitFor(() => expect(screen.getAllByText('Agricultural Modernisation Fund').length).toBeGreaterThanOrEqual(1));
    expect(screen.queryByText(/Edit Scheme/i)).not.toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: scheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderDetail('sch-001');
    await waitFor(() => expect(screen.getAllByText('Agricultural Modernisation Fund').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
