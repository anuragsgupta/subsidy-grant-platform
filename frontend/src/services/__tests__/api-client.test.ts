// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient, TOKEN_KEY, EXPIRES_KEY, saveTokens, clearTokens, getAccessToken, isTokenExpired, _resetRedirectingForTest } from '../api-client';
import type { ApiResponse } from '../../types/api.types';

// Create a mock adapter on the real axios instance
const mock = new MockAdapter(apiClient);

function setValidToken() {
  localStorage.setItem(TOKEN_KEY, 'test-token');
  localStorage.setItem(EXPIRES_KEY, new Date(Date.now() + 3600_000).toISOString());
}

function setExpiredToken() {
  localStorage.setItem(TOKEN_KEY, 'expired-token');
  localStorage.setItem(EXPIRES_KEY, new Date(Date.now() - 1000).toISOString());
}

function successEnvelope<T>(data: T): ApiResponse<T> {
  return { success: true, message: 'OK', errorCode: null, data, fieldErrors: null, timestamp: new Date().toISOString(), correlationId: null };
}

function errorEnvelope(errorCode: string, message: string): ApiResponse<null> {
  return { success: false, message, errorCode, data: null, fieldErrors: null, timestamp: new Date().toISOString(), correlationId: null };
}

describe('token storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saveTokens writes to localStorage', () => {
    saveTokens({ accessToken: 'abc', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00Z' });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('abc');
    expect(localStorage.getItem(EXPIRES_KEY)).toBe('2099-01-01T00:00:00Z');
  });

  it('clearTokens removes from localStorage', () => {
    saveTokens({ accessToken: 'abc', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00Z' });
    clearTokens();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(EXPIRES_KEY)).toBeNull();
  });

  it('getAccessToken returns token when valid', () => {
    setValidToken();
    expect(getAccessToken()).toBe('test-token');
  });

  it('getAccessToken returns null and clears when expired', () => {
    setExpiredToken();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('isTokenExpired returns true when no token', () => {
    expect(isTokenExpired()).toBe(true);
  });

  it('isTokenExpired returns false for valid token', () => {
    setValidToken();
    expect(isTokenExpired()).toBe(false);
  });
});

describe('api-client interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    mock.reset();
    vi.restoreAllMocks();
    _resetRedirectingForTest();
  });

  afterEach(() => {
    mock.reset();
  });

  it('attaches Bearer token when present', async () => {
    setValidToken();
    mock.onGet('/test').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer test-token');
      return [200, successEnvelope({ ok: true })];
    });

    await apiClient.get('/test');
  });

  it('does not attach Authorization when no token', async () => {
    mock.onGet('/test').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, successEnvelope({ ok: true })];
    });

    await apiClient.get('/test');
  });

  it('triggers redirect to /login on 401', async () => {
    setValidToken();
    const replaceSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: replaceSpy },
      writable: true,
    });

    mock.onGet('/protected').reply(401, errorEnvelope('UNAUTHENTICATED', 'Authentication required'));

    await expect(apiClient.get('/protected')).rejects.toBeDefined();
    await vi.waitFor(() => {
      expect(replaceSpy).toHaveBeenCalledWith('/login');
    });
  });

  it('does not double-redirect on multiple 401s', async () => {
    setValidToken();
    const replaceSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: replaceSpy },
      writable: true,
    });

    mock.onGet('/a').reply(401, errorEnvelope('UNAUTHENTICATED', 'Auth required'));
    mock.onGet('/b').reply(401, errorEnvelope('UNAUTHENTICATED', 'Auth required'));

    await Promise.allSettled([apiClient.get('/a'), apiClient.get('/b')]);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
  });

  it('unwraps ApiResponse data on success', async () => {
    mock.onGet('/data').reply(200, successEnvelope({ name: 'test' }));
    const response = await apiClient.get('/data');
    expect(response.data).toEqual({ name: 'test' });
  });

  it('throws ApiError with errorCode on non-401 error', async () => {
    mock.onPost('/register').reply(409, errorEnvelope('DUPLICATE_RESOURCE', 'Username already exists'));
    await expect(apiClient.post('/register', {})).rejects.toMatchObject({
      errorCode: 'DUPLICATE_RESOURCE',
      message: 'Username already exists',
    });
  });
});
