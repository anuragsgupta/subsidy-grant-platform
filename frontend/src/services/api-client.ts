import axios from 'axios';
import type { TokenResponse } from '../types/auth';
import type { ApiResponse } from '../types/api.types';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
export const TOKEN_KEY = 'gsdts_access_token';
export const EXPIRES_KEY = 'gsdts_token_expires_at';

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------

export function saveTokens(resp: TokenResponse): void {
  localStorage.setItem(TOKEN_KEY, resp.accessToken);
  localStorage.setItem(EXPIRES_KEY, resp.expiresAt);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

export function isTokenExpired(): boolean {
  const expiresAt = localStorage.getItem(EXPIRES_KEY);
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now();
}

/** Returns the stored token, or null if absent or expired. */
export function getAccessToken(): string | null {
  if (isTokenExpired()) {
    clearTokens();
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// ApiError — carries structured backend error info
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  readonly errorCode: string;
  readonly fieldErrors?: Array<{ field: string; message: string }>;
  readonly httpStatus?: number;

  constructor(
    errorCode: string,
    message: string,
    fieldErrors?: Array<{ field: string; message: string }>,
    httpStatus?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.errorCode = errorCode;
    this.fieldErrors = fieldErrors;
    this.httpStatus = httpStatus;
  }
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor
// Guard against infinite redirect loops when multiple requests return 401 at once.
// ---------------------------------------------------------------------------

let _redirecting = false;

/** Resets the redirect guard — for testing only. */
export function _resetRedirectingForTest(): void {
  _redirecting = false;
}

apiClient.interceptors.response.use(
  // Success: unwrap the ApiResponse<T>.data envelope
  (response) => {
    const body = response.data as ApiResponse<unknown>;
    if (body && typeof body === 'object' && 'data' in body) {
      return { ...response, data: body.data };
    }
    return response;
  },

  // Error: normalize to ApiError and handle 401
  (error) => {
    const status: number | undefined = error.response?.status;
    const body = error.response?.data as ApiResponse<unknown> | undefined;

    if (status === 401 && !_redirecting) {
      _redirecting = true;
      clearTokens();
      window.location.replace('/login');
      return Promise.reject(error);
    }

    const errorCode = body?.errorCode ?? 'UNKNOWN_ERROR';
    const message = body?.message ?? error.message ?? 'An unexpected error occurred';
    const fieldErrors = body?.fieldErrors ?? undefined;

    throw new ApiError(
      errorCode,
      message,
      fieldErrors as Array<{ field: string; message: string }> | undefined,
      status,
    );
  },
);
