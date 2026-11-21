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
import { useCriteriaQuery } from '../../hooks/useEligibility';
import EligibilityCriteriaPage from '../EligibilityCriteriaPage';

const baseUser = { id: 'u1', username: 'admin', fullName: 'Admin', email: 'a@b.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function renderPage(schemeId: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role: 'ADMIN' } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/eligibility/schemes/${schemeId}`]}>
        <Routes><Route path="/eligibility/schemes/:schemeId" element={<EligibilityCriteriaPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const criteria = [
  { id: 'c1', attribute: 'AGE', operator: 'GTE', threshold: '18', weight: 3, mandatory: true, description: 'Must be 18+' },
  { id: 'c2', attribute: 'ANNUAL_INCOME', operator: 'LTE', threshold: '300000', weight: 4, mandatory: true, description: 'Income limit' },
];

describe('EligibilityCriteriaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading skeleton', () => {
    vi.mocked(useCriteriaQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage('sch-001');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows empty state when no criteria', async () => {
    vi.mocked(useCriteriaQuery).mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('sch-001');
    await waitFor(() => expect(screen.getByText(/No eligibility criteria defined/i)).toBeInTheDocument());
  });

  it('renders criteria data', async () => {
    vi.mocked(useCriteriaQuery).mockReturnValue({ data: criteria, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('sch-001');
    await waitFor(() => expect(screen.getByText('Must be 18+')).toBeInTheDocument());
    expect(screen.getByText('Income limit')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useCriteriaQuery).mockReturnValue({ data: criteria, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('sch-001');
    await waitFor(() => expect(screen.getByText('Must be 18+')).toBeInTheDocument());
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });
});
