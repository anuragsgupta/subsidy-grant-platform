import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api-client';
import { roleService } from '../services/role.service';
import type { ApiResponse } from '../../../types/api.types';

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

describe('role.service', () => {
  beforeEach(() => {
    mock.reset();
  });

  afterEach(() => {
    mock.reset();
  });

  it('listRoles calls GET /roles and unwraps data', async () => {
    const roles = [
      { id: 1, name: 'ADMIN', description: 'Admin', createdAt: '2025-01-01T00:00:00Z' },
      { id: 2, name: 'BENEFICIARY', description: null, createdAt: '2025-01-01T00:00:00Z' },
    ];
    mock.onGet('/roles').reply(200, envelope(roles));
    const result = await roleService.listRoles();
    expect(result).toEqual(roles);
    expect(mock.history.get.length).toBe(1);
  });

  it('getRole calls GET /roles/{id}', async () => {
    const role = { id: 5, name: 'FIELD_OFFICER', description: 'FO', createdAt: '2025-01-01T00:00:00Z' };
    mock.onGet('/roles/5').reply(200, envelope(role));
    const result = await roleService.getRole(5);
    expect(result).toEqual(role);
  });

  it('getRoleByName calls GET /roles/name/{name}', async () => {
    const role = { id: 5, name: 'FIELD_OFFICER', description: 'FO', createdAt: '2025-01-01T00:00:00Z' };
    mock.onGet('/roles/name/FIELD_OFFICER').reply(200, envelope(role));
    const result = await roleService.getRoleByName('FIELD_OFFICER');
    expect(result).toEqual(role);
  });
});
