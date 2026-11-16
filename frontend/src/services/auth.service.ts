import { apiClient } from './api-client';
import type { TokenResponse, UserResponse, LoginFormValues, RegisterFormValues } from '../types/auth';

/**
 * Wraps the three auth endpoints that exist in AuthController.
 * No business logic — only HTTP calls and envelope unwrapping.
 */

/** POST /api/v1/auth/login */
async function login(data: LoginFormValues): Promise<TokenResponse> {
  // The response interceptor unwraps ApiResponse<T>.data, so .data is TokenResponse
  const response = await apiClient.post<TokenResponse>('/auth/login', data);
  return response.data;
}

/** POST /api/v1/auth/register */
async function register(data: RegisterFormValues): Promise<UserResponse> {
  const response = await apiClient.post<UserResponse>('/auth/register', data);
  return response.data;
}

/** GET /api/v1/auth/me — requires a valid Bearer token */
export async function getMe(): Promise<UserResponse> {
  const response = await apiClient.get<UserResponse>('/auth/me');
  return response.data;
}

export const authService = { login, register, getMe };
