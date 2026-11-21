import { useQuery } from '@tanstack/react-query';
import { verificationService } from '../services/verification.service';

export const verificationKeys = {
  tasks: ['verification', 'tasks'] as const,
  detail: (id: string) => ['verification', 'detail', id] as const,
};

export function useVerificationTasksQuery() {
  return useQuery({
    queryKey: verificationKeys.tasks,
    queryFn: verificationService.getAll,
    staleTime: Infinity,
  });
}

export function useVerificationTaskQuery(id: string) {
  return useQuery({
    queryKey: verificationKeys.detail(id),
    queryFn: () => verificationService.getById(id),
    staleTime: Infinity,
  });
}
