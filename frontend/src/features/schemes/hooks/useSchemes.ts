import { useQuery } from '@tanstack/react-query';
import { schemeService } from '../services/scheme.service';

export const schemeKeys = {
  list: ['schemes', 'list'] as const,
  detail: (id: string) => ['schemes', 'detail', id] as const,
};

export function useSchemesQuery() {
  return useQuery({
    queryKey: schemeKeys.list,
    queryFn: schemeService.getAll,
    staleTime: Infinity,
  });
}

export function useSchemeQuery(id: string) {
  return useQuery({
    queryKey: schemeKeys.detail(id),
    queryFn: () => schemeService.getById(id),
    staleTime: Infinity,
  });
}
