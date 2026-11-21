import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

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
import { useAssessmentsQuery } from '../../hooks/useEligibility';
import EligibilityListPage from '../EligibilityListPage';

const baseUser = { id: 'u1', username: 'admin', fullName: 'Admin', email: 'a@b.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><EligibilityListPage /></MemoryRouter></QueryClientProvider>);
}

const assessments = [
  { id: 'a1', applicationId: 'app-001', applicationRef: 'APP-001', schemeId: 's1', schemeName: 'Scheme A', beneficiaryName: 'Ramesh', decision: 'ELIGIBLE' as const, score: 85, autoRejected: false, riskTier: 'LOW' as const, assessedAt: '2025-01-16T09:00:00Z', criterionResults: [], failedMandatoryDescriptions: [], missingAttributes: [] },
  { id: 'a2', applicationId: 'app-003', applicationRef: 'APP-003', schemeId: 's1', schemeName: 'Scheme A', beneficiaryName: 'Sunita', decision: 'INELIGIBLE' as const, score: 40, autoRejected: true, riskTier: 'HIGH' as const, assessedAt: '2025-01-11T14:00:00Z', criterionResults: [], failedMandatoryDescriptions: ['Income too high'], missingAttributes: [] },
];

describe('EligibilityListPage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole('ADMIN'); });

  it('shows loading skeleton', () => {
    vi.mocked(useAssessmentsQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows empty state when no assessments', async () => {
    vi.mocked(useAssessmentsQuery).mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText(/No assessments match/i)).toBeInTheDocument());
  });

  it('renders assessment data', async () => {
    vi.mocked(useAssessmentsQuery).mockReturnValue({ data: assessments, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('APP-001')).toBeInTheDocument());
    expect(screen.getByText('APP-003')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useAssessmentsQuery).mockReturnValue({ data: assessments, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('APP-001')).toBeInTheDocument());
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });

  it('shows permission denied for BENEFICIARY', () => {
    mockRole('BENEFICIARY');
    renderPage();
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
