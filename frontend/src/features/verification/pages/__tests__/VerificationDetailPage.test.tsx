import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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
import { useVerificationTaskQuery } from '../../hooks/useVerification';
import VerificationDetailPage from '../VerificationDetailPage';

const baseUser = { id: 'test-user-id', username: 'tester', fullName: 'Test User', email: 't@t.com', phone: null, active: true, regionIds: [1], createdAt: '', updatedAt: '' };

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({ user: { ...baseUser, role } as any, isAuthenticated: true, isInitializing: false, login: vi.fn(), logout: vi.fn() });
}

function renderPage(taskId: string, role = 'ADMIN') {
  mockRole(role);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/verification/${taskId}`]}>
        <Routes><Route path="/verification/:taskId" element={<VerificationDetailPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const task = {
  id: 'vt-001', applicationId: 'app-001', applicationRef: 'APP-20250115-000001', beneficiaryName: 'Ramesh Kumar',
  schemeName: 'Rural Housing', requestedAmount: 200000, currentStage: 'FIELD_PENDING' as const,
  assignedOfficerId: 'test-user-id', assignedOfficerName: 'Test Officer', regionId: 1, regionName: 'North District',
  submissionDate: '2025-01-15',
  history: [
    { stage: 'SUBMITTED' as const, transitionDate: '2025-01-15T10:30:00Z', remark: 'Submitted', actorName: 'Ramesh' },
    { stage: 'FIELD_PENDING' as const, transitionDate: '2025-01-15T14:00:00Z', remark: 'Assigned', actorName: 'System' },
  ],
};

const districtTask = {
  ...task,
  id: 'vt-003', currentStage: 'DISTRICT_REVIEW' as const,
  fieldFinding: 'NONE' as const, fieldRemarks: 'All verified', fieldEvidence: 'DOC-001',
  fieldRecommendation: 'APPROVE' as const, fieldOfficerName: 'Raj Kumar', fieldVerifiedAt: '2025-01-12T15:00:00Z',
  history: [
    { stage: 'SUBMITTED' as const, transitionDate: '2025-01-10T08:00:00Z', remark: 'Submitted', actorName: 'Sunita' },
    { stage: 'FIELD_PENDING' as const, transitionDate: '2025-01-10T10:00:00Z', remark: 'Assigned', actorName: 'System' },
    { stage: 'DISTRICT_REVIEW' as const, transitionDate: '2025-01-12T15:00:00Z', remark: 'Field done', actorName: 'Raj Kumar' },
  ],
};

describe('VerificationDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading skeleton', () => {
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: vi.fn() } as any);
    const { container } = renderPage('vt-001');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('shows not found when task is undefined', async () => {
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('vt-999');
    await waitFor(() => expect(screen.getByText(/Verification task not found/i)).toBeInTheDocument());
  });

  it('renders task details when loaded', async () => {
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: task, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('vt-001', 'FIELD_OFFICER');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
  });

  it('shows field verification form for FIELD_OFFICER on FIELD_PENDING task', async () => {
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: task, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('vt-001', 'FIELD_OFFICER');
    await waitFor(() => expect(screen.getByText(/Field Verification Form/i)).toBeInTheDocument());
  });

  it('shows district review panel for DISTRICT_OFFICER on DISTRICT_REVIEW task', async () => {
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: districtTask, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('vt-003', 'DISTRICT_OFFICER');
    await waitFor(() => expect(screen.getByText(/District Review Actions/i)).toBeInTheDocument());
  });

  it('shows workflow history timeline', async () => {
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: task, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('vt-001', 'FIELD_OFFICER');
    await waitFor(() => expect(screen.getByText(/Workflow History/i)).toBeInTheDocument());
  });

  it('shows exactly one demo badge', async () => {
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: task, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('vt-001', 'FIELD_OFFICER');
    await waitFor(() => expect(screen.getAllByText('APP-20250115-000001').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByTestId('demo-badge')).toHaveLength(1);
  });

  it('shows permission denied for FIELD_OFFICER not assigned to task', async () => {
    const unassignedTask = { ...task, assignedOfficerId: 'other-officer' };
    vi.mocked(useVerificationTaskQuery).mockReturnValue({ data: unassignedTask, isLoading: false, isError: false, error: null, refetch: vi.fn() } as any);
    renderPage('vt-001', 'FIELD_OFFICER');
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });
});
