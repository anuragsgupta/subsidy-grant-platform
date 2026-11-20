import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';

const mocks = vi.hoisted(() => ({
  listBeneficiaries: vi.fn(),
  user: { id: 'admin-1', role: 'ADMIN' as string, fullName: 'Demo Admin' },
}));
vi.mock('../../../services/demo-data.service', () => ({
  demoDataService: { listBeneficiaries: mocks.listBeneficiaries },
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));

import BeneficiaryListPage from '../pages/BeneficiaryListPage';

const beneficiary = {
  id: 'b-1', userId: 'u-1', referenceId: 'BEN-1001', fullName: 'Riya Sharma', type: 'INDIVIDUAL',
  regionId: 1, regionName: 'North District', email: 'riya@example.test', phone: '+91 9800000000',
  nationalId: '****1234', ssn: '****9876', status: 'ACTIVE',
};

describe('Beneficiary pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.role = 'ADMIN';
  });

  it('shows masked beneficiary identity details and one demo badge', async () => {
    mocks.listBeneficiaries.mockResolvedValue([beneficiary]);
    renderWithProviders(<BeneficiaryListPage />);
    expect(await screen.findByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByText('****1234')).toBeInTheDocument();
    expect(screen.getByText('****9876')).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
    expect(screen.queryByText('1234')).not.toBeInTheDocument();
  });

  it('denies beneficiary users access to the beneficiary directory', async () => {
    mocks.user.role = 'BENEFICIARY';
    mocks.listBeneficiaries.mockResolvedValue([beneficiary]);
    renderWithProviders(<BeneficiaryListPage />);
    expect(await screen.findByText(/you do not have permission/i)).toBeInTheDocument();
    expect(screen.queryByText('Riya Sharma')).not.toBeInTheDocument();
  });
});
