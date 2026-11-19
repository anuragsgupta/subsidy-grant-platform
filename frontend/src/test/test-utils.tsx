import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/** Fresh QueryClient with retries disabled, for isolated page tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface RenderOptions {
  initialEntries?: string[];
}

/** Renders a node inside a fresh QueryClientProvider and MemoryRouter. */
export function renderWithProviders(
  ui: React.ReactElement,
  { initialEntries = ['/'] }: RenderOptions = {},
) {
  const queryClient = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}
