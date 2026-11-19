import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import { ApiError } from '../../../services/api-client';

const mockListUsers = vi.fn();
const mockListRoles = vi.fn();
vi.mock('../services/user.service', () => ({
  userService: { listUsers: (...a: unknown[]) => mockListUsers(...a) },
}));
vi.mock('../../roles/services/role.service', () => ({
  roleService: { listRoles: (...a: unknown[]) => mockListRoles(...a) },
}));

import UserListPage from '../pages/UserListPage';

/** Last args object passed to mockListUsers. */
function lastUserParams(): unknown {
  const calls = mockListUsers.mock.calls;
  return calls[calls.length - 1]?.[0];
}

const paged = (
  content: Record<string, unknown>[],
  total = content.length,
  currentPage = 0,
) => ({
  content,
  currentPage,
  pageSize: 20,
  totalElements: total,
  totalPages: Math.max(1, Math.ceil(total / 20)),
  last: currentPage >= Math.ceil(total / 20) - 1,
});

const users = [
  { id: 'u1', username: 'alice', fullName: 'Alice Rao', email: 'alice@x.com', active: true, role: 'ADMIN' },
  { id: 'u2', username: 'bob', fullName: 'Bob Singh', email: 'bob@x.com', active: false, role: 'BENEFICIARY' },
];

describe('UserListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListRoles.mockResolvedValue([]);
  });

  it('renders the user rows with status badges', async () => {
    mockListUsers.mockResolvedValue(paged(users));
    renderWithProviders(<UserListPage />);
    await waitFor(() => expect(screen.getByText('Alice Rao')).toBeInTheDocument());
    expect(screen.getByText('Bob Singh')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders the empty state when there are no users', async () => {
    mockListUsers.mockResolvedValue(paged([]));
    renderWithProviders(<UserListPage />);
    await waitFor(() => expect(screen.getByText(/no users match/i)).toBeInTheDocument());
  });

  it('renders the error state on network failure', async () => {
    mockListUsers.mockRejectedValue(new Error('network'));
    renderWithProviders(<UserListPage />);
    await waitFor(() => expect(screen.getByText(/backend not available/i)).toBeInTheDocument());
  });

  it('renders the permission-denied state on ACCESS_DENIED', async () => {
    mockListUsers.mockRejectedValue(new ApiError('ACCESS_DENIED', 'denied', undefined, 403));
    renderWithProviders(<UserListPage />);
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });

  it('debounces search and resets page to 0', async () => {
    mockListUsers.mockResolvedValue(paged(users));
    const user = userEvent.setup();
    renderWithProviders(<UserListPage />);
    await waitFor(() => expect(screen.getByText('Alice Rao')).toBeInTheDocument());

    await user.type(screen.getByLabelText(/search users/i), 'Jo');
    await waitFor(
      () => {
        expect(lastUserParams()).toMatchObject({ q: 'Jo', page: 0 });
      },
      { timeout: 1500 },
    );
  });

  it('advances pagination and resets to page 0 on search', async () => {
    const two = [
      { id: 'u0', username: 'u0', fullName: 'User 0', email: 'u0@x.com', active: true, role: 'ADMIN' },
      { id: 'u1', username: 'u1', fullName: 'User 1', email: 'u1@x.com', active: true, role: 'ADMIN' },
    ];
    mockListUsers.mockResolvedValue(paged(two, 30, 1));
    const user = userEvent.setup();
    renderWithProviders(<UserListPage />);
    await waitFor(() => expect(screen.getByText('User 0')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => {
      expect(lastUserParams()).toMatchObject({ page: 1 });
    });

    await user.type(screen.getByLabelText(/search users/i), 'x');
    await waitFor(
      () => {
        expect(lastUserParams()).toMatchObject({ page: 0, q: 'x' });
      },
      { timeout: 1500 },
    );
  });
});
