import { formatDate } from '../../../lib/utils';
import type { AuditLogResponse } from '../types/audit.types';

const th = 'py-2 px-3 text-left font-medium text-text-secondary border-b border-gov-border';
const td = 'py-2 px-3 border-b border-gov-border/60';

interface AuditTableProps {
  logs: AuditLogResponse[];
  onRowClick: (log: AuditLogResponse) => void;
}

/** Read-only audit table. Sort is server-fixed; rows are clickable for details. */
export function AuditTable({ logs, onRowClick }: AuditTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={th}>Occurred at</th>
          <th className={th}>Actor</th>
          <th className={th}>Type</th>
          <th className={th}>Action</th>
          <th className={th}>Entity</th>
          <th className={th}>Reference</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr
            key={log.id}
            className="cursor-pointer hover:bg-gov-blue/5"
            onClick={() => onRowClick(log)}
          >
            <td className={td}>{formatDate(log.occurredAt, 'dd MMM yyyy HH:mm')}</td>
            <td className={td}>
              <span className="text-text-primary">{log.actorRole ?? '—'}</span>
              <span className="block text-xs text-text-secondary">
                {log.actorId ?? '—'}
              </span>
            </td>
            <td className={td}>{log.actorType}</td>
            <td className={td}>{log.action}</td>
            <td className={td}>
              {log.entityType}{' '}
              <span className="text-text-secondary">#{log.entityId}</span>
            </td>
            <td className={td}>{log.referenceNo ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
