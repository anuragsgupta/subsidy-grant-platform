import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/test-utils';

const getApplication = vi.fn();
const setStatus = vi.fn();
const queryAudit = vi.fn();
const useAuth = vi.fn();
vi.mock('../services/application.service', () => ({ applicationService: { get: (...args: unknown[]) => getApplication(...args), setStatus: (...args: unknown[]) => setStatus(...args) } }));
vi.mock('../../audit/services/audit.service', () => ({ auditService: { queryAudit: (...args: unknown[]) => queryAudit(...args) } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => useAuth() }));
import VerificationDetailPage from '../pages/VerificationDetailPage';

const item = { id: 'a1', referenceNo: 'GSDTS-1', beneficiaryId: 'b1', beneficiaryFullName: 'Nila Test', schemeId: 's1', schemeName: 'Education grant', schemeCode: 'EDU', requestedAmount: 1200, status: 'UNDER_REVIEW', submittedAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
function renderPage() {
  return renderWithProviders(<Routes><Route path="/verification/:id" element={<VerificationDetailPage />} /></Routes>, { initialEntries: ['/verification/a1'] });
}
describe('VerificationDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('approves at the field level, refreshes data, and leaves escalation disabled', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { role: 'FIELD_OFFICER' } });
    getApplication.mockResolvedValue(item);
    setStatus.mockResolvedValue({ ...item, status: 'FIELD_VERIFIED' });
    queryAudit.mockResolvedValue({ content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true });
    renderPage();
    const approve = await screen.findByRole('button', { name: 'Approve' });
    expect(approve).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeDisabled();
    await user.click(approve);
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith('a1', 'FIELD_VERIFIED'));
    expect(await screen.findByRole('status')).toHaveTextContent(/updated to FIELD_VERIFIED/);
  });
  it('disables invalid approve/clarification actions and permits rejection where valid', async () => {
    useAuth.mockReturnValue({ user: { role: 'ADMIN' } });
    getApplication.mockResolvedValue({ ...item, status: 'COMPLETED' });
    queryAudit.mockResolvedValue({ content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Request clarification' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(setStatus).not.toHaveBeenCalled();
  });
  it('supports request clarification at field review and rejects invalid actions', async () => {
    const user = userEvent.setup();
    useAuth.mockReturnValue({ user: { role: 'FIELD_OFFICER' } });
    getApplication.mockResolvedValue(item);
    setStatus.mockResolvedValue({ ...item, status: 'CLARIFICATION_REQUIRED' });
    queryAudit.mockResolvedValue({ content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Request clarification' }));
    await waitFor(() => expect(setStatus).toHaveBeenCalledWith('a1', 'CLARIFICATION_REQUIRED'));
  });
});