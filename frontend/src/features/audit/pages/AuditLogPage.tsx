import { useState } from 'react';
import { useAuditLogsQuery } from '../hooks/useAuditLogs';
import { AuditFilters } from '../components/AuditFilters';
import { AuditTable } from '../components/AuditTable';
import { AuditDetailDialog } from '../components/AuditDetailDialog';
import { Pagination } from '../../../components/common/Pagination';
import { QueryState } from '../../../components/states/QueryState';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import type { AuditLogResponse, AuditQueryParams } from '../types/audit.types';
import type { AuditFilterValues } from '../schemas/audit.schema';

const EMPTY_FILTERS: AuditFilterValues = {
  referenceNo: '',
  entityType: '',
  entityId: '',
  actorId: '',
  from: '',
  to: '',
};

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [selected, setSelected] = useState<AuditLogResponse | null>(null);

  const params: AuditQueryParams = {
    referenceNo: filters.referenceNo?.trim() || undefined,
    entityType: filters.entityType?.trim() || undefined,
    entityId: filters.entityId?.trim() || undefined,
    actorId: filters.actorId?.trim() || undefined,
    from: filters.from ? `${filters.from}T00:00:00Z` : undefined,
    to: filters.to ? `${filters.to}T23:59:59Z` : undefined,
    page,
    size,
  };

  const query = useAuditLogsQuery(params);
  const logs = query.data?.content ?? [];
  const totalElements = query.data?.totalElements ?? 0;
  const totalPages = query.data?.totalPages ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Audit Logs</h1>
        <p className="text-text-secondary mt-1">
          System activity record — read-only.
        </p>
      </div>

      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-lg text-text-primary">Audit entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AuditFilters
            onApply={(v) => {
              setFilters(v);
              setPage(0);
            }}
            onClear={() => {
              setFilters(EMPTY_FILTERS);
              setPage(0);
            }}
            isFetching={query.isFetching}
          />

          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={logs.length === 0}
            onRetry={() => query.refetch()}
            emptyMessage="No audit entries match the filters."
            skeletonRows={8}
          >
            <AuditTable logs={logs} onRowClick={setSelected} />
            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={setPage}
            />
          </QueryState>
        </CardContent>
      </Card>

      <AuditDetailDialog
        log={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
