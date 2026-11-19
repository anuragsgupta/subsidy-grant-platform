import { apiClient } from '../../../services/api-client';
import type { PagedResponse } from '../../../types/api.types';
import type { AuditLogResponse, AuditQueryParams } from '../types/audit.types';

/** GET /api/v1/audit — ADMIN only. Optional params omitted when undefined. */
async function queryAudit(
  params: AuditQueryParams,
): Promise<PagedResponse<AuditLogResponse>> {
  const response = await apiClient.get<PagedResponse<AuditLogResponse>>('/audit', {
    params,
  });
  return response.data;
}

export const auditService = { queryAudit };
