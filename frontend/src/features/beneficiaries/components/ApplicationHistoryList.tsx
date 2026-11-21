// src/features/beneficiaries/components/ApplicationHistoryList.tsx

import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/states/EmptyState';
import type { DemoApplication, WorkflowStage } from '../../../services/demo-data.service';

// ---------------------------------------------------------------------------
// Status styling — mirrors the design-system colour palette
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<
  WorkflowStage,
  { label: string; className: string }
> = {
  SUBMITTED:       { label: 'Submitted',       className: 'border-blue-200 bg-blue-50 text-blue-700' },
  FIELD_PENDING:   { label: 'Field Pending',   className: 'border-amber-200 bg-amber-50 text-amber-700' },
  DISTRICT_REVIEW: { label: 'District Review', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  SECOND_REVIEW:   { label: 'Second Review',   className: 'border-amber-200 bg-amber-50 text-amber-700' },
  FINANCE_REVIEW:  { label: 'Finance Review',  className: 'border-teal-200 bg-teal-50 text-teal-700' },
  BUDGET_HOLD:     { label: 'Budget Hold',     className: 'border-amber-200 bg-amber-50 text-amber-700' },
  APPROVED:        { label: 'Approved',        className: 'border-green-200 bg-green-50 text-green-700' },
  REJECTED:        { label: 'Rejected',        className: 'border-red-200 bg-red-50 text-red-700' },
  CLOSED:          { label: 'Closed',          className: 'border-slate-200 bg-slate-50 text-slate-600' },
  TERMINATED:      { label: 'Terminated',      className: 'border-slate-200 bg-slate-50 text-slate-600' },
};

// ---------------------------------------------------------------------------
// Sub-component: WorkflowStage badge
// ---------------------------------------------------------------------------

function WorkflowStageBadge({ status }: { status: WorkflowStage }) {
  const { label, className } = STATUS_STYLES[status] ?? {
    label: status,
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApplicationHistoryListProps {
  applications: DemoApplication[];
}

// ---------------------------------------------------------------------------
// Table styles (DRY constants)
// ---------------------------------------------------------------------------

const th =
  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-secondary whitespace-nowrap';
const td = 'px-4 py-3 text-sm text-text-primary';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ApplicationHistoryList({ applications }: ApplicationHistoryListProps) {
  if (applications.length === 0) {
    return <EmptyState message="No applications found." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border bg-card">
        <thead className="bg-[#F4F7FA]">
          <tr>
            <th className={th}>Reference Number</th>
            <th className={th}>Scheme Name</th>
            <th className={th}>Status</th>
            <th className={th}>Submission Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {applications.map((app) => (
            <tr
              key={app.id}
              className="transition-colors hover:bg-[#F4F7FA]/60"
            >
              <td className={td}>
                <Link
                  to={`/applications/${app.id}`}
                  className="font-mono text-xs font-medium text-gov-blue hover:underline"
                >
                  {app.referenceNumber}
                </Link>
              </td>
              <td className={td}>{app.schemeName}</td>
              <td className={td}>
                <WorkflowStageBadge status={app.status} />
              </td>
              <td className={`${td} text-text-secondary`}>{app.submissionDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
