import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user.service';
import type {
  UserListParams,
  ChangeRoleRequest,
  ChangeRegionsRequest,
} from '../types/user.types';

/** Query keys for the users feature. */
export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => ['users', 'list', params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
  roles: (id: string) => ['users', 'roles', id] as const,
};

/** Paginated, filtered user list. Keeps previous page data while loading. */
export function useUsersQuery(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.listUsers(params),
    placeholderData: (prev) => prev,
  });
}

export function useUserQuery(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getUser(id),
    enabled: !!id,
  });
}

export function useUserRolesQuery(id: string) {
  return useQuery({
    queryKey: userKeys.roles(id),
    queryFn: () => userService.getUserRoles(id),
    enabled: !!id,
  });
}

export function useSetUserStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      userService.setStatus(id, { active }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}

export function useChangeUserRoleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, roleId }: { id: string } & ChangeRoleRequest) =>
      userService.changeRole(id, { roleId }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}

export function useChangeUserRegionsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, regionIds }: { id: string } & ChangeRegionsRequest) =>
      userService.changeRegions(id, { regionIds }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: ['users', 'list'] });
    },
  });
}
