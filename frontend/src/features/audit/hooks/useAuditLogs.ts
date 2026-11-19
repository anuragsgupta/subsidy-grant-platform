import { useQuery } from '@tanstack/react-query';
import { auditService } from '../services/audit.service';
import type { AuditQueryParams } from '../types/audit.types';

/** Query keys for the audit feature. */
export const auditKeys = {
  all: ['audit'] as const,
  list: (params: AuditQueryParams) => ['audit', 'list', params] as const,
};

/** Paginated, filtered audit log query. Keeps previous page data while loading. */
export function useAuditLogsQuery(params: AuditQueryParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditService.queryAudit(params),
    placeholderData: (prev) => prev,
  });
}
