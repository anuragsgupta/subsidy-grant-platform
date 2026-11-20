import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';

const mocks = vi.hoisted(() => ({
  listSchemes: vi.fn(),
  getBeneficiaryForUser: vi.fn(),
  submitApplication: vi.fn(),
  listApplications: vi.fn(),
  listBeneficiaries: vi.fn(),
  user: { id: 'demo-beneficiary-user', role: 'BENEFICIARY' as string, fullName: 'Demo User', regionIds: [] as number[] },
}));
vi.mock('../../../services/demo-data.service', () => ({
  demoDataService: {
    listSchemes: mocks.listSchemes,
    getBeneficiaryForUser: mocks.getBeneficiaryForUser,
    submitApplication: mocks.submitApplication,
    listApplications: mocks.listApplications,
    listBeneficiaries: mocks.listBeneficiaries,
    getScheme: vi.fn(),
    getApplication: vi.fn(),
  },
  isApplicationVisibleToRole: (application: { beneficiaryId: string }, user: { role: string }, linked?: string) =>
    user.role === 'ADMIN' || (user.role === 'BENEFICIARY' && application.beneficiaryId === linked),
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));

import ApplicationListPage from '../pages/ApplicationListPage';
import SubmitApplicationPage from '../pages/SubmitApplicationPage';

const scheme = {
  id: 's-1', code: 'AGRI-1', name: 'Farmer support', description: 'Grant', status: 'OPEN',
  minGrantAmount: 10000, maxGrantAmount: 50000, startDate: '2025-01-01', endDate: '2025-12-31', criteria: [],
};
const linked = { id: 'b-1', userId: 'demo-beneficiary-user', referenceId: 'BEN-1', fullName: 'Riya Sharma', type: 'INDIVIDUAL', regionId: 1, regionName: 'North', email: 'riya@example.test', phone: '123', nationalId: '****1234', ssn: '****5678', status: 'ACTIVE' };

describe('Application pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.role = 'BENEFICIARY';
  });

  it('scopes the application list to the signed-in beneficiary', async () => {
    mocks.getBeneficiaryForUser.mockResolvedValue(linked);
    mocks.listApplications.mockResolvedValue([
      { id: 'a-1', referenceNo: 'APP-1', beneficiaryId: 'b-1', schemeId: 's-1', status: 'SUBMITTED', workflowStage: 'SUBMITTED', requestedAmount: 20000, submittedAt: '2025-02-01T10:00:00Z' },
      { id: 'a-2', referenceNo: 'APP-2', beneficiaryId: 'b-2', schemeId: 's-1', status: 'SUBMITTED', workflowStage: 'SUBMITTED', requestedAmount: 30000, submittedAt: '2025-02-02T10:00:00Z' },
    ]);
    mocks.listBeneficiaries.mockResolvedValue([linked]);
    mocks.listSchemes.mockResolvedValue([scheme]);
    renderWithProviders(<ApplicationListPage />);
    expect(await screen.findByText('APP-1')).toBeInTheDocument();
    expect(screen.queryByText('APP-2')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });

  it('validates required fields and records a valid submission once', async () => {
    mocks.listSchemes.mockResolvedValue([scheme]);
    mocks.getBeneficiaryForUser.mockResolvedValue(linked);
    mocks.submitApplication.mockResolvedValue({ referenceNo: 'APP-20260101-000001' });
    const user = userEvent.setup();
    renderWithProviders(<SubmitApplicationPage />);
    await screen.findByRole('combobox', { name: /scheme/i });
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    expect(await screen.findByText('Select a scheme.')).toBeInTheDocument();
    expect(screen.getByText('Enter a requested amount.')).toBeInTheDocument();
    expect(mocks.submitApplication).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByRole('combobox', { name: /scheme/i }), 's-1');
    await user.type(screen.getByRole('spinbutton', { name: /requested amount/i }), '25000');
    await user.click(screen.getByRole('button', { name: /submit application/i }));
    await waitFor(() => expect(mocks.submitApplication).toHaveBeenCalledTimes(1));
    expect(mocks.submitApplication).toHaveBeenCalledWith('b-1', 's-1', 25000);
    expect(await screen.findByText(/APP-20260101-000001/)).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
