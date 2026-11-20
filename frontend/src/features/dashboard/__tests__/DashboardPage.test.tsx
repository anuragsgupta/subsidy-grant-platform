import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';

const mocks = vi.hoisted(() => ({
  listApplications: vi.fn(),
  listBeneficiaries: vi.fn(),
  listSchemes: vi.fn(),
  getBeneficiaryForUser: vi.fn(),
  getActivity: vi.fn(),
  useRegionsQuery: vi.fn(),
  user: { id: 'admin-1', role: 'ADMIN' as string, fullName: 'Demo Admin', regionIds: [1] },
}));
vi.mock('../../../services/demo-data.service', () => ({
  demoDataService: {
    listApplications: mocks.listApplications,
    listBeneficiaries: mocks.listBeneficiaries,
    listSchemes: mocks.listSchemes,
    getBeneficiaryForUser: mocks.getBeneficiaryForUser,
    getActivity: mocks.getActivity,
  },
}));
vi.mock('../../../features/regions/hooks/useRegions', () => ({ useRegionsQuery: mocks.useRegionsQuery }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));

import DashboardPage from '../pages/DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
    mocks.user.role = 'ADMIN';
    mocks.listApplications.mockResolvedValue([
      { id: 'a-1', referenceNo: 'APP-PENDING', beneficiaryId: 'b-1', schemeId: 's-1', workflowStage: 'SUBMITTED', status: 'SUBMITTED', requestedAmount: 25000, submittedAt: '2025-01-01T10:00:00Z' },
      { id: 'a-2', referenceNo: 'APP-APPROVED', beneficiaryId: 'b-1', schemeId: 's-1', workflowStage: 'APPROVED', status: 'APPROVED', requestedAmount: 10000, submittedAt: '2025-01-02T10:00:00Z' },
    ]);
    mocks.listBeneficiaries.mockResolvedValue([{ id: 'b-1', fullName: 'Riya Sharma' }]);
    mocks.listSchemes.mockResolvedValue([{ id: 's-1', name: 'Farmer Grant' }]);
    mocks.getActivity.mockResolvedValue([]);
    mocks.useRegionsQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  it('shows dashboard statistics and the role-aware pending queue with one demo badge', async () => {
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText('APP-PENDING')).toBeInTheDocument();
    expect(screen.queryByText('APP-APPROVED')).not.toBeInTheDocument();
    expect(screen.getByText('Total applications')).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
