import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import { ApiError } from '../../../services/api-client';

const mockGetAll = vi.fn();
const mockUpdate = vi.fn();
vi.mock('../services/setting.service', () => ({
  settingService: {
    getAllSettings: (...a: unknown[]) => mockGetAll(...a),
    updateSetting: (...a: unknown[]) => mockUpdate(...a),
  },
}));

import SettingsPage from '../pages/SettingsPage';

const intSetting = {
  key: 'auth.maxFailedLogins',
  value: '5',
  valueType: 'INT' as const,
  description: 'Max failed logins before lock',
  updatedBy: null,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists settings', async () => {
    mockGetAll.mockResolvedValue([intSetting]);
    renderWithProviders(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('auth.maxFailedLogins')).toBeInTheDocument());
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('opens edit dialog and validates INT value', async () => {
    const user = userEvent.setup();
    mockGetAll.mockResolvedValue([intSetting]);
    renderWithProviders(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('auth.maxFailedLogins')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const input = await screen.findByLabelText(/value/i);
    await user.clear(input);
    await user.type(input, 'notanumber');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/must be a whole number/i)).toBeInTheDocument());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates the setting on success', async () => {
    const user = userEvent.setup();
    mockGetAll.mockResolvedValue([intSetting]);
    mockUpdate.mockResolvedValue({ ...intSetting, value: '7' });
    renderWithProviders(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('auth.maxFailedLogins')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const input = await screen.findByLabelText(/value/i);
    await user.clear(input);
    await user.type(input, '7');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('auth.maxFailedLogins', { value: '7' }),
    );
  });

  it('shows "Setting not found" on a 404 from the update', async () => {
    const user = userEvent.setup();
    mockGetAll.mockResolvedValue([intSetting]);
    mockUpdate.mockRejectedValue(
      new ApiError('RESOURCE_NOT_FOUND', 'Setting not found', undefined, 404),
    );
    renderWithProviders(<SettingsPage />);
    await waitFor(() => expect(screen.getByText('auth.maxFailedLogins')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const input = await screen.findByLabelText(/value/i);
    await user.clear(input);
    await user.type(input, '7');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(screen.getByText(/setting not found/i)).toBeInTheDocument());
  });

  it('renders the empty state', async () => {
    mockGetAll.mockResolvedValue([]);
    renderWithProviders(<SettingsPage />);
    await waitFor(() => expect(screen.getByText(/no settings configured/i)).toBeInTheDocument());
  });
});
