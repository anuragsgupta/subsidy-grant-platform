import { apiClient } from '../../../services/api-client';
import type { PagedResponse } from '../../../types/api.types';
import type { UserResponse } from '../../../types/auth';
import type { RoleResponse } from '../../roles/types/role.types';
import type {
  UserSummaryResponse,
  UserListParams,
  UserStatusRequest,
  ChangeRoleRequest,
  ChangeRegionsRequest,
} from '../types/user.types';

/**
 * Wraps the UserController endpoints surfaced in this phase.
 * Optional params are omitted when undefined so the backend applies no filter.
 */

/** GET /api/v1/users — ADMIN only. */
async function listUsers(
  params: UserListParams,
): Promise<PagedResponse<UserSummaryResponse>> {
  const response = await apiClient.get<PagedResponse<UserSummaryResponse>>('/users', {
    params,
  });
  return response.data;
}

/** GET /api/v1/users/{id} — ADMIN only. */
async function getUser(id: string): Promise<UserResponse> {
  const response = await apiClient.get<UserResponse>(`/users/${id}`);
  return response.data;
}

/** GET /api/v1/users/{id}/roles — ADMIN only. */
async function getUserRoles(id: string): Promise<RoleResponse[]> {
  const response = await apiClient.get<RoleResponse[]>(`/users/${id}/roles`);
  return response.data;
}

/** PATCH /api/v1/users/{id}/status — returns 200 with no body. */
async function setStatus(id: string, data: UserStatusRequest): Promise<void> {
  await apiClient.patch(`/users/${id}/status`, data);
}

/** PUT /api/v1/users/{id}/role */
async function changeRole(id: string, data: ChangeRoleRequest): Promise<UserResponse> {
  const response = await apiClient.put<UserResponse>(`/users/${id}/role`, data);
  return response.data;
}

/** PUT /api/v1/users/{id}/regions */
async function changeRegions(id: string, data: ChangeRegionsRequest): Promise<UserResponse> {
  const response = await apiClient.put<UserResponse>(`/users/${id}/regions`, data);
  return response.data;
}

export const userService = {
  listUsers,
  getUser,
  getUserRoles,
  setStatus,
  changeRole,
  changeRegions,
};
