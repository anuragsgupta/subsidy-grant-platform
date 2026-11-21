import React from 'react';
import { EmptyState } from '../../../components/states/EmptyState';

interface ColumnDef<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface PendingWorkQueueProps {
  title?: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
}

export function PendingWorkQueue({ title, columns, rows }: PendingWorkQueueProps) {
  return (
    <div>
      {title && (
        <h2 className="mb-3 text-base font-semibold text-text-primary">{title}</h2>
      )}

      {rows.length === 0 ? (
        <EmptyState message="No items in queue" />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead>
              <tr className="bg-[#12304A]">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FA]'}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="whitespace-nowrap px-4 py-3 text-text-primary"
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
