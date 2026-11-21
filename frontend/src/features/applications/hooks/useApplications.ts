import { useQuery } from '@tanstack/react-query';
import { applicationService } from '../services/application.service';

export const applicationKeys = {
  list: ['applications', 'list'] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
};

export function useApplicationsQuery() {
  return useQuery({
    queryKey: applicationKeys.list,
    queryFn: applicationService.getAll,
    staleTime: Infinity,
  });
}

export function useApplicationQuery(id: string) {
  return useQuery({
    queryKey: applicationKeys.detail(id),
    queryFn: () => applicationService.getById(id),
    staleTime: Infinity,
  });
}
