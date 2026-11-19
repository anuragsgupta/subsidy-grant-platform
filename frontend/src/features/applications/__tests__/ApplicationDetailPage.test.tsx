import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../../test/test-utils';

const getApplication = vi.fn();
const queryAudit = vi.fn();
vi.mock('../services/application.service', () => ({ applicationService: { get: (...args: unknown[]) => getApplication(...args) } }));
vi.mock('../../audit/services/audit.service', () => ({ auditService: { queryAudit: (...args: unknown[]) => queryAudit(...args) } }));
import ApplicationDetailPage from '../pages/ApplicationDetailPage';

const record = { id: 'app-1', referenceNo: 'GSDTS-1', beneficiaryId: 'ben-1', beneficiaryFullName: 'Ravi Applicant', schemeId: 'scheme-1', schemeName: 'Farm grant', schemeCode: 'FARM', requestedAmount: 25000, status: 'SUBMITTED', submittedAt: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
describe('ApplicationDetailPage', () => {
  it('renders application status and explicit pending score state', async () => {
    getApplication.mockResolvedValue(record);
    queryAudit.mockResolvedValue({ content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true });
    renderWithProviders(<Routes><Route path="/applications/:id" element={<ApplicationDetailPage />} /></Routes>, { initialEntries: ['/applications/app-1'] });
    expect(await screen.findByText(/Applicant:\s*Ravi Applicant/)).toBeInTheDocument();
    expect(screen.getByText('Not returned by API')).toBeInTheDocument();
    expect(screen.getByText(/Decision: Pending/)).toBeInTheDocument();
    expect(await screen.findByText(/No audit events/)).toBeInTheDocument();
  });
  it('renders a returned eligibility score and factors', async () => {
    getApplication.mockResolvedValue({ ...record, eligibilityScore: 82, eligibilityDecision: 'ELIGIBLE', eligibilityExplanation: ['Income criterion met'] });
    queryAudit.mockResolvedValue({ content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true });
    renderWithProviders(<Routes><Route path="/applications/:id" element={<ApplicationDetailPage />} /></Routes>, { initialEntries: ['/applications/app-1'] });
    expect(await screen.findByText('82/100')).toBeInTheDocument();
    expect(screen.getByText('Decision: ELIGIBLE')).toBeInTheDocument();
    expect(screen.getByText('Income criterion met')).toBeInTheDocument();
  });
});