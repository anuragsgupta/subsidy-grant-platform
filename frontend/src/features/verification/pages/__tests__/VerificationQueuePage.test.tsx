import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../../../features/verification/hooks/useVerification', () => ({
  useVerificationTasksQuery: vi.fn(),
  useVerificationTaskQuery: vi.fn(),
}));

vi.mock('../../../../features/verification/services/verification.service', () => ({
  verificationService: { getAll: vi.fn(), getById: vi.fn(), submitFieldVerification: vi.fn(), submitDistrictReview: vi.fn() },
  getTasksForRole: vi.fn((tasks: unknown[]) => tasks),
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
import { useVerificationTasksQuery } from '../../hooks/useVerification';
import VerificationQueuePage from '../VerificationQueuePage';

const baseUser = { id: 'test-user-id', username: 'tester', fullName: 'Test User', email: 't@t.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}><MemoryRouter><VerificationQueuePage /></MemoryRouter></QueryClientProvider>);
}

const tasks = [
  { id: 'vt-001', applicationId: 'app-001', applicationRef: 'APP-001', beneficiaryName: 'Ramesh', schemeName: 'Scheme A', requestedAmount: 200000, currentStage: 'FIELD_PENDING' as const, assignedOfficerId: 'test-user-id', regionId: 1, submissionDate: '2025-01-15', history: [] },
  { id: 'vt-003', applicationId: 'app-003', applicationRef: 'APP-003', beneficiaryName: 'Sunita', schemeName: 'Scheme B', requestedAmount: 300000, currentStage: 'DISTRICT_REVIEW' as const, regionId: 1, submissionDate: '2025-01-10', history: [] },
];

describe('VerificationQueuePage', () => {
  beforeEach(() => { vi.clearAllMocks(); mockRole('ADMIN'); });

  it('shows loading skeleton', () => {
    vi.mocked(useVerificationTasksQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows empty state when no tasks', async () => {
    vi.mocked(useVerificationTasksQuery).mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText(/No verification tasks match/i)).toBeInTheDocument());
  });

  it('renders task data', async () => {
    vi.mocked(useVerificationTasksQuery).mockReturnValue({ data: tasks, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage();
    await waitFor(() => expect(screen.getByText('APP-001')).toBeInTheDocument());
    expect(screen.getByText('APP-003')).toBeInTheDocument();
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useVerificationTasksQuery).mockReturnValue({ data: tasks, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
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
