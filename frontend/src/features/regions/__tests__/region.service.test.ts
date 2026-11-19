import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api-client';
import { regionService } from '../services/region.service';
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

describe('region.service', () => {
  beforeEach(() => mock.reset());
  afterEach(() => mock.reset());

  it('listRegions calls GET /regions with no params when omitted', async () => {
    const regions = [{ id: 1, code: 'KA', name: 'Karnataka', type: 'STATE', parentId: null }];
    mock.onGet('/regions').reply(200, envelope(regions));
    const result = await regionService.listRegions();
    expect(result).toEqual(regions);
    expect(mock.history.get[0].params).toBeUndefined();
  });

  it('listRegions passes type filter as a query param', async () => {
    const regions = [{ id: 1, code: 'KA', name: 'Karnataka', type: 'STATE', parentId: null }];
    mock.onGet('/regions', { params: { type: 'STATE' } }).reply(200, envelope(regions));
    const result = await regionService.listRegions({ type: 'STATE' });
    expect(result).toEqual(regions);
    expect(mock.history.get[0].params).toEqual({ type: 'STATE' });
  });

  it('getRegion calls GET /regions/{id}', async () => {
    const region = { id: 7, code: 'KA-BLR', name: 'Bengaluru', type: 'DISTRICT', parentId: 1 };
    mock.onGet('/regions/7').reply(200, envelope(region));
    const result = await regionService.getRegion(7);
    expect(result).toEqual(region);
  });
});
