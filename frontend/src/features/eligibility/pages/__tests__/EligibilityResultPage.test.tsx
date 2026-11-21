import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/eligibility/hooks/useEligibility', () => ({
  useAssessmentsQuery: vi.fn(),
  useAssessmentQuery: vi.fn(),
  useCriteriaQuery: vi.fn(),
}));

vi.mock('../../../../services/workflow-demo-data.service', () => ({
  getAllAssessments: vi.fn(() => []),
  getAssessmentByApplicationId: vi.fn(() => undefined),
  getCriteriaBySchemeId: vi.fn(() => []),
  getAllVerificationTasks: vi.fn(() => []),
  getVerificationTaskById: vi.fn(() => undefined),
  updateFieldVerification: vi.fn(),
  updateDistrictReview: vi.fn(),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import { useAssessmentQuery } from '../../hooks/useEligibility';
import EligibilityResultPage from '../EligibilityResultPage';

const baseUser = { id: 'u1', username: 'admin', fullName: 'Admin', email: 'a@b.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function renderPage(applicationId: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role: 'ADMIN' } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/eligibility/applications/${applicationId}`]}>
        <Routes><Route path="/eligibility/applications/:applicationId" element={<EligibilityResultPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const assessment = {
  id: 'a1', applicationId: 'app-001', applicationRef: 'APP-20250115-000001', schemeId: 's1', schemeName: 'Rural Housing',
  beneficiaryName: 'Ramesh Kumar', decision: 'INELIGIBLE' as const, score: 40, autoRejected: true, riskTier: 'HIGH' as const,
  assessedAt: '2025-01-11T14:00:00Z',
  criterionResults: [
    { criterionId: 'c1', description: 'Age check', attribute: 'AGE', operator: 'GTE', threshold: '18', mandatory: true, passed: true, pointsAwarded: 3, beneficiaryValue: '34' },
    { criterionId: 'c2', description: 'Income check', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '300000', mandatory: true, passed: false, pointsAwarded: 0, beneficiaryValue: '450000' },
  ],
  failedMandatoryDescriptions: ['Income exceeds limit'],
  missingAttributes: [],
};

describe('EligibilityResultPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading skeleton', () => {
    vi.mocked(useAssessmentQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage('app-001');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows not found when assessment is undefined', async () => {
    vi.mocked(useAssessmentQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('app-999');
    await waitFor(() => expect(screen.getByText(/Assessment not found/i)).toBeInTheDocument());
  });

  it('renders assessment data with decision badge', async () => {
    vi.mocked(useAssessmentQuery).mockReturnValue({ data: assessment, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('app-001');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
  });

  it('shows failure reasons for INELIGIBLE decision', async () => {
    vi.mocked(useAssessmentQuery).mockReturnValue({ data: assessment, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('app-001');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText('Income exceeds limit')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useAssessmentQuery).mockReturnValue({ data: assessment, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('app-001');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
