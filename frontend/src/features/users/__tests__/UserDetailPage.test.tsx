import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../../test/test-utils';
import { ApiError } from '../../../services/api-client';

const mockGetUser = vi.fn();
const mockGetUserRoles = vi.fn();
const mockSetStatus = vi.fn();
const mockChangeRole = vi.fn();
const mockChangeRegions = vi.fn();
const mockListRegions = vi.fn();
const mockListRoles = vi.fn();

vi.mock('../services/user.service', () => ({
  userService: {
    getUser: (...a: unknown[]) => mockGetUser(...a),
    getUserRoles: (...a: unknown[]) => mockGetUserRoles(...a),
    setStatus: (...a: unknown[]) => mockSetStatus(...a),
    changeRole: (...a: unknown[]) => mockChangeRole(...a),
    changeRegions: (...a: unknown[]) => mockChangeRegions(...a),
    listUsers: vi.fn(),
  },
}));
vi.mock('../../regions/services/region.service', () => ({
  regionService: { listRegions: (...a: unknown[]) => mockListRegions(...a), getRegion: vi.fn() },
}));
vi.mock('../../roles/services/role.service', () => ({
  roleService: { listRoles: (...a: unknown[]) => mockListRoles(...a) },
}));

import UserDetailPage from '../pages/UserDetailPage';

const user = {
  id: 'u1',
  username: 'alice',
  fullName: 'Alice Rao',
  email: 'alice@x.com',
  phone: '9876543210',
  active: true,
  role: 'ADMIN',
  regionIds: [1],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};
const regions = [{ id: 1, code: 'KA', name: 'Karnataka', type: 'STATE', parentId: null }];
const roles = [{ id: 5, name: 'ADMIN', description: 'Administrator', createdAt: '2025-01-01T00:00:00Z' }];

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/users/:id" element={<UserDetailPage />} />
    </Routes>,
    { initialEntries: ['/admin/users/u1'] },
  );
}

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserRoles.mockResolvedValue(roles);
    mockListRegions.mockResolvedValue(regions);
    mockListRoles.mockResolvedValue(roles);
  });

  it('loads the user and resolves region names', async () => {
    mockGetUser.mockResolvedValue(user);
    renderDetail();
    await waitFor(() => expect(screen.getByText('Alice Rao')).toBeInTheDocument());
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('Karnataka')).toBeInTheDocument();
  });

  it('opens the status-change confirmation and calls setStatus on confirm', async () => {
    const userEv = userEvent.setup();
    mockGetUser.mockResolvedValue({ ...user, active: false });
    mockSetStatus.mockResolvedValue(undefined);
    renderDetail();
    await waitFor(() => expect(screen.getByText('Alice Rao')).toBeInTheDocument());

    // One "Activate" button before the dialog opens (the page status button)
    await userEv.click(screen.getByRole('button', { name: /^activate$/i }));
    await waitFor(() => expect(screen.getByText(/are you sure you want to activate/i)).toBeInTheDocument());
    // Radix hides the rest of the page from the a11y tree while the modal is
    // open, so the only "Activate" button now is the dialog's confirm button.
    await userEv.click(screen.getByRole('button', { name: /^activate$/i }));

    await waitFor(() => expect(mockSetStatus).toHaveBeenCalledWith('u1', { active: true }));
  });

  it('opens the change-role dialog and submits the pre-selected role', async () => {
    const userEv = userEvent.setup();
    mockGetUser.mockResolvedValue(user);
    mockChangeRole.mockResolvedValue({ ...user, role: 'FIELD_OFFICER' });
    renderDetail();
    await waitFor(() => expect(screen.getByText('Alice Rao')).toBeInTheDocument());

    await userEv.click(screen.getByRole('button', { name: /change role/i }));
    await waitFor(() => expect(screen.getByText(/select a new role/i)).toBeInTheDocument());
    await userEv.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockChangeRole).toHaveBeenCalledWith('u1', { roleId: 5 }));
  });

  it('opens the manage-regions dialog and submits the bound regions', async () => {
    const userEv = userEvent.setup();
    mockGetUser.mockResolvedValue(user);
    mockChangeRegions.mockResolvedValue({ ...user, regionIds: [1] });
    renderDetail();
    await waitFor(() => expect(screen.getByText('Alice Rao')).toBeInTheDocument());

    await userEv.click(screen.getByRole('button', { name: /manage regions/i }));
    await waitFor(() => expect(screen.getByText(/select the regions/i)).toBeInTheDocument());
    await userEv.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockChangeRegions).toHaveBeenCalledWith('u1', { regionIds: [1] }));
  });

  it('renders the "User not found" state on a 404', async () => {
    mockGetUser.mockRejectedValue(
      new ApiError('RESOURCE_NOT_FOUND', 'User not found', undefined, 404),
    );
    renderDetail();
    await waitFor(() => expect(screen.getByText(/user not found/i)).toBeInTheDocument());
  });
});
