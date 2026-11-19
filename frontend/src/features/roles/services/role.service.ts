import { apiClient } from '../../../services/api-client';
import type { RoleResponse } from '../types/role.types';

/**
 * Wraps the read-only role endpoints in RoleController.
 * No business logic — only HTTP calls and envelope unwrapping.
 */

/** GET /api/v1/roles — any authenticated user. */
async function listRoles(): Promise<RoleResponse[]> {
  const response = await apiClient.get<RoleResponse[]>('/roles');
  return response.data;
}

/** GET /api/v1/roles/{id} */
async function getRole(id: number): Promise<RoleResponse> {
  const response = await apiClient.get<RoleResponse>(`/roles/${id}`);
  return response.data;
}

/** GET /api/v1/roles/name/{name} */
async function getRoleByName(name: string): Promise<RoleResponse> {
  const response = await apiClient.get<RoleResponse>(`/roles/name/${name}`);
  return response.data;
}

export const roleService = { listRoles, getRole, getRoleByName };
