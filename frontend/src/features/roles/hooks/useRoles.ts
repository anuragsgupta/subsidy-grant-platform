import { useQuery } from '@tanstack/react-query';
import { roleService } from '../services/role.service';

/** Query keys for the roles feature. */
export const roleKeys = {
  all: ['roles'] as const,
  list: ['roles', 'list'] as const,
  detail: (id: number) => ['roles', 'detail', id] as const,
};

const ROLES_STALE_TIME = 5 * 60_000; // 5 minutes — roles are seeded/immutable

/** Cached list of all roles (reference data for role pickers). */
export function useRolesQuery() {
  return useQuery({
    queryKey: roleKeys.list,
    queryFn: () => roleService.listRoles(),
    staleTime: ROLES_STALE_TIME,
  });
}
