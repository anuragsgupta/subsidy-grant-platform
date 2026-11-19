import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../../../services/api-client';
import { auditService } from '../services/audit.service';
import type { ApiResponse, PagedResponse } from '../../../types/api.types';
import type { AuditLogResponse } from '../types/audit.types';

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

const log: AuditLogResponse = {
  id: 1,
  occurredAt: '2025-01-01T10:00:00Z',
  actorId: '11111111-1111-1111-1111-111111111111',
  actorRole: 'ADMIN',
  actorType: 'USER',
  action: 'UPDATE',
  entityType: 'User',
  entityId: 'u1',
  referenceNo: 'APP-1',
  oldValue: { x: 1 },
  newValue: { x: 2 },
  remark: 'r',
  correlationId: 'c',
  ipAddress: '1.2.3.4',
};

describe('audit.service', () => {
  beforeEach(() => mock.reset());
  afterEach(() => mock.reset());

  it('queryAudit calls GET /audit with params and unwraps PagedResponse', async () => {
    const paged: PagedResponse<AuditLogResponse> = {
      content: [log],
      currentPage: 0,
      pageSize: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    mock
      .onGet('/audit', {
        params: { referenceNo: 'APP-1', page: 0, size: 20 },
      })
      .reply(200, envelope(paged));
    const result = await auditService.queryAudit({ referenceNo: 'APP-1', page: 0, size: 20 });
    expect(result).toEqual(paged);
    expect(mock.history.get[0].params).toEqual({ referenceNo: 'APP-1', page: 0, size: 20 });
  });

  it('serialises date range params', async () => {
    const paged: PagedResponse<AuditLogResponse> = {
      content: [], currentPage: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true,
    };
    mock
      .onGet('/audit', {
        params: { from: '2025-01-01T00:00:00Z', to: '2025-01-31T23:59:59Z', page: 0, size: 20 },
      })
      .reply(200, envelope(paged));
    await auditService.queryAudit({
      from: '2025-01-01T00:00:00Z',
      to: '2025-01-31T23:59:59Z',
      page: 0,
      size: 20,
    });
    expect(mock.history.get[0].params).toMatchObject({
      from: '2025-01-01T00:00:00Z',
      to: '2025-01-31T23:59:59Z',
    });
  });
});
