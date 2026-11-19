import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { formatDate } from '../../../lib/utils';
import type { AuditLogResponse } from '../types/audit.types';

function prettyJson(v: unknown): string {
  return v == null ? '—' : JSON.stringify(v, null, 2);
}

const labelCls = 'text-sm font-medium text-text-secondary';

interface AuditDetailDialogProps {
  log: AuditLogResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Read-only details view with old/new values rendered as JSON. */
export function AuditDetailDialog({ log, open, onOpenChange }: AuditDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {log ? `${log.action} on ${log.entityType}` : 'Audit entry'}
          </DialogTitle>
          <DialogDescription>Detailed audit record (read-only).</DialogDescription>
        </DialogHeader>

        {log && (
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Occurred at</span>
              <span className="text-sm">
                {formatDate(log.occurredAt, 'dd MMM yyyy HH:mm:ss')}
              </span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Actor</span>
              <span className="text-sm">
                {log.actorRole ?? '—'} ({log.actorId ?? '—'})
              </span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Actor type</span>
              <span className="text-sm">{log.actorType}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Action</span>
              <span className="text-sm">{log.action}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Entity</span>
              <span className="text-sm">
                {log.entityType} #{log.entityId}
              </span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Reference no.</span>
              <span className="text-sm">{log.referenceNo ?? '—'}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Remark</span>
              <span className="text-sm">{log.remark ?? '—'}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>Correlation id</span>
              <span className="text-sm font-mono text-xs">{log.correlationId ?? '—'}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2 py-1">
              <span className={labelCls}>IP address</span>
              <span className="text-sm">{log.ipAddress ?? '—'}</span>
            </div>

            <div className="pt-2">
              <span className={labelCls}>Old value</span>
              <pre className="mt-1 bg-page-bg border border-gov-border rounded-md p-2 text-xs overflow-x-auto">
                {prettyJson(log.oldValue)}
              </pre>
            </div>
            <div className="pt-2">
              <span className={labelCls}>New value</span>
              <pre className="mt-1 bg-page-bg border border-gov-border rounded-md p-2 text-xs overflow-x-auto">
                {prettyJson(log.newValue)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
