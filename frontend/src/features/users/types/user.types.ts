import type { UserRole } from '../../../types/auth';

/** Mirrors UserSummaryResponse.java — list-item record. */
export interface UserSummaryResponse {
  id: string; // UUID
  username: string;
  fullName: string;
  email: string;
  active: boolean;
  role: UserRole | null;
}

// The full UserResponse record is reused from src/types/auth.ts (same backend
// record returned by /auth/me and /users/{id}).

/** Mirrors UserStatusRequest.java (PATCH /users/{id}/status). */
export interface UserStatusRequest {
  active: boolean;
}

/** Mirrors ChangeRoleRequest.java (PUT /users/{id}/role). */
export interface ChangeRoleRequest {
  roleId: number;
}

/** Mirrors ChangeRegionsRequest.java (PUT /users/{id}/regions). */
export interface ChangeRegionsRequest {
  regionIds: number[];
}

/** Query params for GET /users (U2). */
export interface UserListParams {
  role?: string;
  regionId?: number;
  active?: boolean;
  q?: string;
  page?: number;
  size?: number;
}
