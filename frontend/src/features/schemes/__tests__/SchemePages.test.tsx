import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/test-utils';

const mocks = vi.hoisted(() => ({
  listSchemes: vi.fn(),
  getScheme: vi.fn(),
}));
vi.mock('../../../services/demo-data.service', () => ({
  demoDataService: mocks,
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'ADMIN' } }) }));

import SchemeListPage from '../pages/SchemeListPage';
import SchemeDetailPage from '../pages/SchemeDetailPage';

const scheme = {
  id: 's-1', code: 'AGRI-1', name: 'Farmer support', description: 'Support for farmers.',
  status: 'OPEN', minGrantAmount: 10000, maxGrantAmount: 50000,
  startDate: '2025-01-01', endDate: '2025-12-31',
  criteria: [{ attribute: 'annualIncome', operator: 'LTE', threshold: 500000, mandatory: true, description: 'Income limit' }],
};

describe('Scheme pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters the scheme list and displays a single demo badge', async () => {
    mocks.listSchemes.mockResolvedValue([scheme, { ...scheme, id: 's-2', code: 'EDU-1', name: 'Education', status: 'DRAFT' }]);
    renderWithProviders(<SchemeListPage />);
    expect(await screen.findByText('Farmer support')).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
    expect(screen.getByText('Education')).toBeInTheDocument();
    await userEvent.setup().type(screen.getByRole('textbox', { name: /search schemes/i }), 'farmer');
    await waitFor(() => expect(screen.queryByText('Education')).not.toBeInTheDocument(), { timeout: 1500 });
    expect(screen.getByText('Farmer support')).toBeInTheDocument();
  });

  it('renders scheme details and a back link for an unknown scheme', async () => {
    mocks.getScheme.mockResolvedValueOnce(scheme).mockResolvedValueOnce(null);
    const renderDetail = (id: string) => renderWithProviders(
      <Routes><Route path="/schemes/:id" element={<SchemeDetailPage />} /></Routes>,
      { initialEntries: [`/schemes/${id}`] },
    );
    const detail = renderDetail('s-1');
    expect(await screen.findByText('annualIncome')).toBeInTheDocument();
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
    detail.unmount();
    renderDetail('missing');
    await waitFor(() => expect(screen.getByText('Scheme not found.')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /back to schemes/i })).toHaveAttribute('href', '/schemes');
  });
});
