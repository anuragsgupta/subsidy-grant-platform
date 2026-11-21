import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../features/schemes/services/scheme.service', () => ({
  schemeService: { getAll: vi.fn(), getById: vi.fn() },
}));

vi.mock('../../../../features/schemes/hooks/useSchemes', () => ({
  useSchemeQuery: vi.fn(),
  useSchemesQuery: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
  getStats: vi.fn(() => ({
    totalApplications: 0, pendingApplications: 0, approvedApplications: 0,
    rejectedApplications: 0, totalRequestedAmount: 0, applicationsByStatus: [],
    applicationsByRegionId: [], recentActivity: [],
  })),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useSchemeQuery } from '../../../../features/schemes/hooks/useSchemes';
import SchemeDetailPage from '../SchemeDetailPage';

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

function renderPage(id = 'sch-001') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/schemes/${id}`]}>
        <Routes><Route path="/schemes/:id" element={<SchemeDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const demoScheme = {
  id: 'sch-001', code: 'AGR-001', name: 'Agricultural Fund',
  status: 'OPEN' as const, minGrantAmount: 50000, maxGrantAmount: 500000,
  startDate: '2025-04-01', endDate: '2025-12-31', description: 'Test desc',
  eligibilityCriteria: [
    { attribute: 'farmerStatus', operator: 'EQ' as const, threshold: 'REGISTERED', mandatory: true },
    { attribute: 'landHolding', operator: 'GTE' as const, threshold: '1', mandatory: true },
  ],
};

describe('SchemeDetailPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole('ADMIN'); });

  it('shows loading skeleton initially', () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows not found when scheme is undefined', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(document.body.textContent?.toLowerCase()).toContain('not found')
    );
  });

  it('shows scheme name when loaded', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: demoScheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByText('Agricultural Fund').length).toBeGreaterThanOrEqual(1)
    );
  });

  it('shows both eligibility criteria attributes', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: demoScheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Agricultural Fund'));
    expect(screen.getByText('farmerStatus')).toBeInTheDocument();
    expect(screen.getByText('landHolding')).toBeInTheDocument();
  });

  it('ADMIN sees disabled Edit Scheme button', async () => {
    mockRole('ADMIN');
    vi.mocked(useSchemeQuery).mockReturnValue({ data: demoScheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Agricultural Fund'));
    const editBtn = screen.getByRole('button', { name: /edit scheme/i });
    expect(editBtn).toBeDisabled();
  });

  it('BENEFICIARY does not see Edit Scheme button', async () => {
    mockRole('BENEFICIARY');
    vi.mocked(useSchemeQuery).mockReturnValue({ data: demoScheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Agricultural Fund'));
    expect(screen.queryByRole('button', { name: /edit scheme/i })).not.toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useSchemeQuery).mockReturnValue({ data: demoScheme, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => screen.getAllByText('Agricultural Fund'));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
