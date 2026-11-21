import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../../services/demo-data.service', () => ({
  getStats: vi.fn(() => ({
    totalApplications: 0, pendingApplications: 0,
    approvedApplications: 0, rejectedApplications: 0,
    totalRequestedAmount: 0, applicationsByStatus: [],
    applicationsByRegionId: [], recentActivity: [],
  })),
  getAllApplications: vi.fn(() => []),
  getAllSchemes: vi.fn(() => []),
  getAllBeneficiaries: vi.fn(() => []),
  getBeneficiaryByUserId: vi.fn(() => undefined),
  generateReferenceNumber: vi.fn(() => 'APP-20240101-000001'),
}));

vi.mock('../../../../features/regions/hooks/useRegions', () => ({
  useRegionsQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() })),
}));

vi.mock('../../../../features/applications/services/application.service', () => ({
  getApplicationsForRole: vi.fn((apps: unknown[]) => apps),
}));

import { useAuth } from '../../../../contexts/AuthContext';
import DashboardPage from '../DashboardPage';

const baseUser = {
  id: 'test-user-id', username: 'tester', fullName: 'Test User',
  email: 't@t.com', phone: null, active: true,
  regionIds: [1], createdAt: '', updatedAt: '',
};

function mockRole(role: string) {
  vi.mocked(useAuth).mockReturnValue({
    user: { ...baseUser, role } as any,
    isAuthenticated: true, isInitializing: false,
    login: vi.fn(), logout: vi.fn(),
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter><DashboardPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ADMIN role renders without crashing and shows demo-badge', () => {
    mockRole('ADMIN');
    renderPage();
    expect(screen.getAllByTestId('demo-badge').length).toBeGreaterThanOrEqual(1);
  });

  it('BENEFICIARY role renders without crashing and shows demo-badge', () => {
    mockRole('BENEFICIARY');
    vi.mocked(useAuth).mockReturnValue({
      user: { ...baseUser, role: 'BENEFICIARY' } as any,
      isAuthenticated: true, isInitializing: false,
      login: vi.fn(), logout: vi.fn(),
    });
    renderPage();
    expect(screen.getAllByTestId('demo-badge').length).toBeGreaterThanOrEqual(1);
  });

  it('FIELD_OFFICER role renders without crashing and shows demo-badge', () => {
    mockRole('FIELD_OFFICER');
    renderPage();
    expect(screen.getAllByTestId('demo-badge').length).toBeGreaterThanOrEqual(1);
  });

  it('DISTRICT_OFFICER role renders without crashing and shows demo-badge', () => {
    mockRole('DISTRICT_OFFICER');
    renderPage();
    expect(screen.getAllByTestId('demo-badge').length).toBeGreaterThanOrEqual(1);
  });

  it('FINANCE_APPROVER role renders without crashing and shows demo-badge', () => {
    mockRole('FINANCE_APPROVER');
    renderPage();
    expect(screen.getAllByTestId('demo-badge').length).toBeGreaterThanOrEqual(1);
  });

  it('null user renders nothing', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null, isAuthenticated: false, isInitializing: true,
      login: vi.fn(), logout: vi.fn(),
    });
    const { container } = renderPage();
    expect(container.querySelectorAll('[data-testid="demo-badge"]').length).toBe(0);
  });

  it('unknown role renders permission denied text', () => {
    mockRole('UNKNOWN_ROLE');
    renderPage();
    const bodyText = document.body.textContent?.toLowerCase() ?? '';
    expect(bodyText).toMatch(/access|denied|permission/);
  });
});
