import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/test-utils';
import { ApiError } from '../../../services/api-client';
import type { AuditLogResponse } from '../types/audit.types';

const mockQueryAudit = vi.fn();
vi.mock('../services/audit.service', () => ({
  auditService: { queryAudit: (...a: unknown[]) => mockQueryAudit(...a) },
}));

import AuditLogPage from '../pages/AuditLogPage';

const log: AuditLogResponse = {
  id: 1,
  occurredAt: '2025-01-01T10:00:00Z',
  actorId: '11111111-1111-1111-1111-111111111111',
  actorRole: 'ADMIN',
  actorType: 'USER',
  action: 'UPDATE',
  entityType: 'User',
  entityId: 'u1',
  referenceNo: 'APP-1',
  oldValue: { x: 1 },
  newValue: { x: 2 },
  remark: 'r',
  correlationId: 'c',
  ipAddress: '1.2.3.4',
};

function paged(content: AuditLogResponse[], total = content.length, currentPage = 0) {
  return {
    content,
    currentPage,
    pageSize: 20,
    totalElements: total,
    totalPages: Math.max(1, Math.ceil(total / 20)),
    last: currentPage >= Math.ceil(total / 20) - 1,
  };
}

/** Last params object passed to mockQueryAudit. */
function lastAuditParams(): unknown {
  const calls = mockQueryAudit.mock.calls;
  return calls[calls.length - 1]?.[0];
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the audit rows', async () => {
    mockQueryAudit.mockResolvedValue(paged([log]));
    renderWithProviders(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText('UPDATE')).toBeInTheDocument());
    expect(screen.getByText('APP-1')).toBeInTheDocument();
  });

  it('applies filters and queries with the reference number', async () => {
    mockQueryAudit.mockResolvedValue(paged([]));
    const user = userEvent.setup();
    renderWithProviders(<AuditLogPage />);
    await waitFor(() => expect(mockQueryAudit).toHaveBeenCalled());

    await user.type(screen.getByLabelText(/reference no/i), 'APP-123');
    await user.click(screen.getByRole('button', { name: /apply/i }));

    await waitFor(() => {
      expect(lastAuditParams()).toMatchObject({ referenceNo: 'APP-123', page: 0 });
    });
  });

  it('opens the details dialog with JSON on row click', async () => {
    mockQueryAudit.mockResolvedValue(paged([log]));
    const user = userEvent.setup();
    renderWithProviders(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText('UPDATE')).toBeInTheDocument());

    await user.click(screen.getByText('UPDATE'));
    await waitFor(() => expect(screen.getByText(/update on user/i)).toBeInTheDocument());
    await waitFor(() => {
      const pres = document.querySelectorAll('pre');
      expect(Array.from(pres).some((p) => p.textContent?.includes('"x": 2'))).toBe(true);
    });
  });

  it('renders the empty state', async () => {
    mockQueryAudit.mockResolvedValue(paged([]));
    renderWithProviders(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText(/no audit entries/i)).toBeInTheDocument());
  });

  it('renders the error state on network failure', async () => {
    mockQueryAudit.mockRejectedValue(new Error('network'));
    renderWithProviders(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText(/backend not available/i)).toBeInTheDocument());
  });

  it('renders the permission-denied state on ACCESS_DENIED', async () => {
    mockQueryAudit.mockRejectedValue(new ApiError('ACCESS_DENIED', 'denied', undefined, 403));
    renderWithProviders(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });

  it('advances pagination', async () => {
    mockQueryAudit.mockResolvedValue(paged([log], 30, 1));
    const user = userEvent.setup();
    renderWithProviders(<AuditLogPage />);
    await waitFor(() => expect(screen.getByText('UPDATE')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() => expect(lastAuditParams()).toMatchObject({ page: 1 }));
  });
});
