import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api-client';
import { userService } from '../services/user.service';
import type { ApiResponse, PagedResponse } from '../../../types/api.types';
import type { UserSummaryResponse } from '../types/user.types';

const mock = new MockAdapter(apiClient);

function envelope<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    message: 'OK',
    errorCode: null,
    data,
    fieldErrors: null,
    timestamp: new Date().toISOString(),
    correlationId: null,
  };
}

const summary: UserSummaryResponse = {
  id: 'u1',
  username: 'alice',
  fullName: 'Alice Rao',
  email: 'alice@x.com',
  active: true,
  role: 'ADMIN',
};

describe('user.service', () => {
  beforeEach(() => mock.reset());
  afterEach(() => mock.reset());

  it('listUsers calls GET /users with params and unwraps PagedResponse', async () => {
    const paged: PagedResponse<UserSummaryResponse> = {
      content: [summary],
      currentPage: 0,
      pageSize: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    mock.onGet('/users', { params: { role: 'ADMIN', page: 0, size: 20 } }).reply(200, envelope(paged));
    const result = await userService.listUsers({ role: 'ADMIN', page: 0, size: 20 });
    expect(result).toEqual(paged);
    expect(mock.history.get[0].params).toEqual({ role: 'ADMIN', page: 0, size: 20 });
  });

  it('listUsers omits undefined params', async () => {
    const paged: PagedResponse<UserSummaryResponse> = {
      content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true,
    };
    mock.onGet('/users').reply(200, envelope(paged));
    await userService.listUsers({});
    expect(mock.history.get[0].params).toEqual({});
  });

  it('getUser calls GET /users/{id}', async () => {
    const user = { id: 'u1', username: 'alice', fullName: 'Alice', email: 'a@x.com', phone: null, active: true, role: 'ADMIN', regionIds: [], createdAt: '', updatedAt: '' };
    mock.onGet('/users/u1').reply(200, envelope(user));
    const result = await userService.getUser('u1');
    expect(result.id).toBe('u1');
  });

  it('getUserRoles calls GET /users/{id}/roles', async () => {
    const roles = [{ id: 5, name: 'ADMIN', description: null, createdAt: '' }];
    mock.onGet('/users/u1/roles').reply(200, envelope(roles));
    const result = await userService.getUserRoles('u1');
    expect(result).toEqual(roles);
  });

  it('setStatus calls PATCH /users/{id}/status with body', async () => {
    mock.onPatch('/users/u1/status').reply(200, envelope(null));
    await userService.setStatus('u1', { active: false });
    expect(mock.history.patch[0].data).toBe(JSON.stringify({ active: false }));
  });

  it('changeRole calls PUT /users/{id}/role', async () => {
    const user = { id: 'u1', username: 'a', fullName: 'A', email: 'a@x.com', phone: null, active: true, role: 'FIELD_OFFICER', regionIds: [], createdAt: '', updatedAt: '' };
    mock.onPut('/users/u1/role').reply(200, envelope(user));
    const result = await userService.changeRole('u1', { roleId: 2 });
    expect(result.role).toBe('FIELD_OFFICER');
    expect(mock.history.put[0].data).toBe(JSON.stringify({ roleId: 2 }));
  });

  it('changeRegions calls PUT /users/{id}/regions', async () => {
    mock.onPut('/users/u1/regions').reply(200, envelope({ id: 'u1', username: 'a', fullName: 'A', email: 'a@x.com', phone: null, active: true, role: 'ADMIN', regionIds: [1, 2], createdAt: '', updatedAt: '' }));
    const result = await userService.changeRegions('u1', { regionIds: [1, 2] });
    expect(result.regionIds).toEqual([1, 2]);
    expect(mock.history.put[0].data).toBe(JSON.stringify({ regionIds: [1, 2] }));
  });
});
