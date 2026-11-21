import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../../features/schemes/services/scheme.service', () => ({
  schemeService: { getAll: vi.fn(), getById: vi.fn() },
}));

vi.mock('../../../../features/beneficiaries/services/beneficiary.service', () => ({
  beneficiaryService: { getAll: vi.fn(), getById: vi.fn(), getByUserId: vi.fn() },
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getAllSchemes: vi.fn(() => []),
  getSchemeById: vi.fn(() => undefined),
  getAllApplications: vi.fn(() => []),
  getApplicationById: vi.fn(() => undefined),
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
import { schemeService } from '../../../../features/schemes/services/scheme.service';
import { beneficiaryService } from '../../../../features/beneficiaries/services/beneficiary.service';
import { addApplication, getSchemeById } from '../../../../services/demo-data.service';
import SubmitApplicationPage from '../SubmitApplicationPage';

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
      <MemoryRouter><SubmitApplicationPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

const openScheme = {
  id: 'sch-002', code: 'RHS-002', name: 'Rural Housing Scheme',
  status: 'OPEN' as const, minGrantAmount: 120000, maxGrantAmount: 250000,
  startDate: '2024-10-01', endDate: '2026-03-31', description: '', eligibilityCriteria: [],
};

describe('SubmitApplicationPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADMIN role sees permission denied state without form', () => {
    mockRole('ADMIN');
    vi.mocked(schemeService.getAll).mockResolvedValue([]);
    renderPage();
    expect(document.body.textContent?.toLowerCase()).toMatch(/access|denied|permission/);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('BENEFICIARY sees form with submit button', async () => {
    mockRole('BENEFICIARY');
    vi.mocked(schemeService.getAll).mockResolvedValue([openScheme]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument());
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    mockRole('BENEFICIARY');
    vi.mocked(schemeService.getAll).mockResolvedValue([openScheme]);
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /submit application/i }));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });

  it('shows validation error on empty submit and does not call addApplication', async () => {
    mockRole('BENEFICIARY');
    vi.mocked(schemeService.getAll).mockResolvedValue([openScheme]);
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /submit application/i }));

    await userEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() =>
      expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(1)
    );
    expect(vi.mocked(addApplication)).not.toHaveBeenCalled();
  });

  it('calls addApplication once on valid submit', async () => {
    mockRole('BENEFICIARY');
    vi.mocked(schemeService.getAll).mockResolvedValue([openScheme]);
    vi.mocked(getSchemeById).mockReturnValue(openScheme);
    vi.mocked(beneficiaryService.getByUserId).mockResolvedValue({
      id: 'ben-001', referenceId: 'BEN/001', fullName: 'Test User',
      type: 'INDIVIDUAL', regionId: 1, regionName: 'North',
      email: 't@t.com', phone: '123', status: 'ACTIVE',
      nationalId: '****4521', ssn: '****8832', linkedUserId: 'test-user-id',
    } as any);

    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /submit application/i }));

    // Select the scheme
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'sch-002');

    // Enter a valid amount
    const amountInput = screen.getByLabelText(/requested amount/i);
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '150000');

    await userEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => expect(vi.mocked(addApplication)).toHaveBeenCalledOnce());
  });
});
