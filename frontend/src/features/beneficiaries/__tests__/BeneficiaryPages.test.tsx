import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import { ApiError } from '../../../services/api-client';

const list = vi.fn();
const create = vi.fn();
vi.mock('../services/beneficiary.service', () => ({ beneficiaryService: { list: (...args: unknown[]) => list(...args), create: (...args: unknown[]) => create(...args) } }));
import BeneficiaryListPage from '../pages/BeneficiaryListPage';
import CreateBeneficiaryPage from '../pages/CreateBeneficiaryPage';

const page = (content: unknown[]) => ({ content, currentPage: 0, pageSize: 20, totalElements: content.length, totalPages: 1, last: true });
describe('beneficiary pages', () => {
  it('shows loading and empty states', async () => {
    list.mockImplementation(() => new Promise(() => undefined));
    const { unmount } = renderWithProviders(<BeneficiaryListPage />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    unmount();
    list.mockResolvedValue(page([]));
    renderWithProviders(<BeneficiaryListPage />);
    expect(await screen.findByText('No beneficiaries have been registered yet.')).toBeInTheDocument();
  });
  it('filters beneficiaries by name', async () => {
    list.mockResolvedValue(page([{ id: 'b1', fullName: 'Asha Rao', identityReference: 'ID1', beneficiaryType: 'INDIVIDUAL', regionCode: 'R-1' }, { id: 'b2', fullName: 'Bala Das', identityReference: 'ID2', beneficiaryType: 'GROUP', regionCode: 'R-2' }]));
    renderWithProviders(<BeneficiaryListPage />);
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    await userEvent.setup().type(screen.getByLabelText(/Search name/), 'Bala');
    expect(screen.getByText('Bala Das')).toBeInTheDocument();
    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
  });
  it('submits registration and surfaces API validation errors', async () => {
    const user = userEvent.setup();
    create.mockRejectedValueOnce(new ApiError('DUPLICATE_RESOURCE', 'Identity reference is already registered', [{ field: 'identityReference', message: 'already exists' }], 400));
    renderWithProviders(<CreateBeneficiaryPage />);
    await user.type(screen.getByLabelText('Full name'), 'Test Person');
    await user.type(screen.getByLabelText('Identity reference'), 'DUPLICATE');
    await user.click(screen.getByRole('button', { name: 'Register beneficiary' }));
    expect(await screen.findByText(/Identity reference is already registered/)).toBeInTheDocument();
    expect(screen.getByText('identityReference: already exists')).toBeInTheDocument();
    create.mockResolvedValueOnce({ id: 'new-id' });
    await user.click(screen.getByRole('button', { name: 'Register beneficiary' }));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  });
});