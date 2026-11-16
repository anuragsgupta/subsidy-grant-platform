// Mirrors TokenResponse.java exactly
export interface TokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string; // ISO-8601 instant
}

// Five roles that exist in the backend
export type UserRole =
  | 'ADMIN'
  | 'BENEFICIARY'
  | 'FIELD_OFFICER'
  | 'DISTRICT_OFFICER'
  | 'FINANCE_APPROVER';

// Mirrors UserResponse.java exactly
export interface UserResponse {
  id: string; // UUID
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  active: boolean;
  role: UserRole;
  regionIds: number[];
  createdAt: string; // ISO-8601 instant
  updatedAt: string;
}

// Form value shapes (separate from DTOs)
export interface LoginFormValues {
  username: string;
  password: string;
}

export interface RegisterFormValues {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
}

// Human-readable labels for each role
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  BENEFICIARY: 'Beneficiary',
  FIELD_OFFICER: 'Field Officer',
  DISTRICT_OFFICER: 'District Officer',
  FINANCE_APPROVER: 'Finance Approver',
};

// Default landing route for each role after login
export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  BENEFICIARY: '/portal/dashboard',
  FIELD_OFFICER: '/field/dashboard',
  DISTRICT_OFFICER: '/district/dashboard',
  FINANCE_APPROVER: '/finance/dashboard',
};
