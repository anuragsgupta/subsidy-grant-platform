import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api-client';
import { settingService } from '../services/setting.service';
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

describe('setting.service', () => {
  beforeEach(() => mock.reset());
  afterEach(() => mock.reset());

  it('getAllSettings calls GET /settings and unwraps data', async () => {
    const settings = [
      {
        key: 'auth.maxFailedLogins',
        value: '5',
        valueType: 'INT',
        description: 'd',
        updatedBy: null,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ];
    mock.onGet('/settings').reply(200, envelope(settings));
    const result = await settingService.getAllSettings();
    expect(result).toEqual(settings);
  });

  it('updateSetting calls PUT /settings/{key} with body and unwraps data', async () => {
    const updated = {
      key: 'auth.lockMinutes',
      value: '20',
      valueType: 'INT',
      description: null,
      updatedBy: 'u1',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    };
    mock.onPut('/settings/auth.lockMinutes').reply(200, envelope(updated));
    const result = await settingService.updateSetting('auth.lockMinutes', { value: '20' });
    expect(result).toEqual(updated);
    expect(mock.history.put[0].data).toBe(JSON.stringify({ value: '20' }));
  });
});
