import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test/test-utils';
import { ApiError } from '../../../services/api-client';

const mockListRegions = vi.fn();
vi.mock('../services/region.service', () => ({
  regionService: { listRegions: (...args: unknown[]) => mockListRegions(...args) },
}));

import RegionListPage from '../pages/RegionListPage';

const hierarchy = [
  { id: 1, code: 'KA', name: 'Karnataka', type: 'STATE', parentId: null },
  { id: 2, code: 'KA-BLR', name: 'Bengaluru', type: 'DISTRICT', parentId: 1 },
];

describe('RegionListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the region hierarchy with states and indented districts', async () => {
    mockListRegions.mockResolvedValue(hierarchy);
    renderWithProviders(<RegionListPage />);
    await waitFor(() => expect(screen.getByText('Karnataka')).toBeInTheDocument());
    expect(screen.getByText(/Bengaluru/)).toBeInTheDocument();
  });

  it('renders the empty state when there are no regions', async () => {
    mockListRegions.mockResolvedValue([]);
    renderWithProviders(<RegionListPage />);
    await waitFor(() => expect(screen.getByText(/no regions found/i)).toBeInTheDocument());
  });

  it('renders the error state on network failure', async () => {
    mockListRegions.mockRejectedValue(new Error('network'));
    renderWithProviders(<RegionListPage />);
    await waitFor(() => expect(screen.getByText(/backend not available/i)).toBeInTheDocument());
  });

  it('renders the permission-denied state on ACCESS_DENIED', async () => {
    mockListRegions.mockRejectedValue(
      new ApiError('ACCESS_DENIED', 'denied', undefined, 403),
    );
    renderWithProviders(<RegionListPage />);
    await waitFor(() => expect(screen.getByText(/access denied/i)).toBeInTheDocument());
  });
});
