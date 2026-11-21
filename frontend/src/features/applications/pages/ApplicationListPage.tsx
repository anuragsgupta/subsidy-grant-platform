import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useApplicationsQuery } from '../hooks/useApplications';
import { getApplicationsForRole } from '../services/application.service';
import { QueryState } from '../../../components/states/QueryState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { Pagination } from '../../../components/common/Pagination';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import type { WorkflowStage } from '../../../services/demo-data.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const WORKFLOW_STAGES: WorkflowStage[] = [
  'SUBMITTED',
  'FIELD_PENDING',
  'DISTRICT_REVIEW',
  'SECOND_REVIEW',
  'FINANCE_REVIEW',
  'BUDGET_HOLD',
  'APPROVED',
  'REJECTED',
  'CLOSED',
  'TERMINATED',
];

const STAGE_LABELS: Record<WorkflowStage, string> = {
  SUBMITTED: 'Submitted',
  FIELD_PENDING: 'Field Pending',
  DISTRICT_REVIEW: 'District Review',
  SECOND_REVIEW: 'Second Review',
  FINANCE_REVIEW: 'Finance Review',
  BUDGET_HOLD: 'Budget Hold',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
  TERMINATED: 'Terminated',
};

// Map each WorkflowStage to a Tailwind colour triple (border / bg / text)
const STAGE_COLOURS: Record<WorkflowStage, string> = {
  SUBMITTED: 'border-blue-300 bg-blue-50 text-blue-700',
  FIELD_PENDING: 'border-amber-300 bg-amber-50 text-amber-700',
  DISTRICT_REVIEW: 'border-amber-400 bg-amber-50 text-amber-800',
  SECOND_REVIEW: 'border-orange-300 bg-orange-50 text-orange-700',
  FINANCE_REVIEW: 'border-purple-300 bg-purple-50 text-purple-700',
  BUDGET_HOLD: 'border-orange-400 bg-orange-50 text-orange-800',
  APPROVED: 'border-green-300 bg-green-50 text-green-700',
  REJECTED: 'border-red-300 bg-red-50 text-red-700',
  CLOSED: 'border-gray-300 bg-gray-50 text-gray-600',
  TERMINATED: 'border-gray-400 bg-gray-100 text-gray-700',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  // dateStr is 'YYYY-MM-DD' or ISO
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorkflowStageBadge({ status }: { status: WorkflowStage }) {
  return (
    <Badge variant="outline" className={STAGE_COLOURS[status]}>
      {STAGE_LABELS[status]}
    </Badge>
  );
}

type SortField = 'submissionDate' | 'requestedAmount';
type SortDir = 'asc' | 'desc';

interface SortHeaderProps {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}

function SortHeader({ field, label, currentField, currentDir, onSort }: SortHeaderProps) {
  const active = currentField === field;
  return (
    <th
      className="cursor-pointer select-none whitespace-nowrap py-2 px-3 text-left font-medium text-text-secondary border-b border-gov-border hover:text-text-primary"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          currentDir === 'asc' ? (
            <ArrowUp size={13} aria-label="sorted ascending" />
          ) : (
            <ArrowDown size={13} aria-label="sorted descending" />
          )
        ) : (
          <ArrowUpDown size={13} className="text-text-secondary/50" aria-label="sortable" />
        )}
      </span>
    </th>
  );
}

// ---------------------------------------------------------------------------
// Table cell class helpers
// ---------------------------------------------------------------------------

const th = 'py-2 px-3 text-left font-medium text-text-secondary border-b border-gov-border';
const td = 'py-2 px-3 border-b border-gov-border/60';

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ApplicationListPage() {
  const { user } = useAuth();

  if (!user) return null;

  return <ApplicationListContent />;
}

// Separated to avoid hook-ordering issues when guard renders early
function ApplicationListContent() {
  const { user } = useAuth();

  const [stageFilter, setStageFilter] = useState<WorkflowStage | 'ALL'>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortField, setSortField] = useState<SortField>('submissionDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [dateRangeError, setDateRangeError] = useState('');

  const query = useApplicationsQuery();
  const allApps = query.data ?? [];

  // ── Filter pipeline ──────────────────────────────────────────────────────

  // 1. Role-scope
  const roleScoped = user ? getApplicationsForRole(allApps, user) : allApps;

  // 2. Stage filter
  const afterStage =
    stageFilter === 'ALL' ? roleScoped : roleScoped.filter((a) => a.status === stageFilter);

  // 3. Date range (validate from <= to)
  let afterDate = afterStage;
  if (fromDate || toDate) {
    if (fromDate && toDate && fromDate > toDate) {
      // Error is set via handler; skip range filter but do not wipe other results
      afterDate = afterStage;
    } else {
      afterDate = afterStage.filter((a) => {
        const sub = a.submissionDate.slice(0, 10); // normalise to YYYY-MM-DD
        if (fromDate && sub < fromDate) return false;
        if (toDate && sub > toDate) return false;
        return true;
      });
    }
  }

  // 4. Sort
  const sorted = [...afterDate].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'submissionDate') {
      cmp = a.submissionDate.localeCompare(b.submissionDate);
    } else {
      cmp = a.requestedAmount - b.requestedAmount;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // 5. Paginate
  const totalElements = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageSlice = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  // ── Event handlers ───────────────────────────────────────────────────────

  function handleStageChange(value: WorkflowStage | 'ALL') {
    setStageFilter(value);
    setPage(0);
  }

  function handleFromDate(value: string) {
    setFromDate(value);
    setPage(0);
    if (value && toDate && value > toDate) {
      setDateRangeError('"From" date must not be later than "To" date.');
    } else {
      setDateRangeError('');
    }
  }

  function handleToDate(value: string) {
    setToDate(value);
    setPage(0);
    if (fromDate && value && fromDate > value) {
      setDateRangeError('"From" date must not be later than "To" date.');
    } else {
      setDateRangeError('');
    }
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Applications</h1>
          <p className="mt-1 text-text-secondary">
            Browse and monitor subsidy applications across all workflow stages.
          </p>
        </div>
        <DemoBadge />
      </div>

      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-lg text-text-primary">Application List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
            {/* Stage filter */}
            <select
              value={stageFilter}
              onChange={(e) => handleStageChange(e.target.value as WorkflowStage | 'ALL')}
              className="rounded-md border border-gov-border bg-white py-2 pl-3 pr-8 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
              aria-label="Filter by workflow stage"
            >
              <option value="ALL">All Stages</option>
              {WORKFLOW_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="app-from-date"
                    className="text-sm text-text-secondary whitespace-nowrap"
                  >
                    From
                  </label>
                  <input
                    id="app-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => handleFromDate(e.target.value)}
                    className="rounded-md border border-gov-border bg-white py-2 px-3 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
                    aria-label="Submission date from"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="app-to-date"
                    className="text-sm text-text-secondary whitespace-nowrap"
                  >
                    To
                  </label>
                  <input
                    id="app-to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => handleToDate(e.target.value)}
                    className="rounded-md border border-gov-border bg-white py-2 px-3 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
                    aria-label="Submission date to"
                  />
                </div>
              </div>
              {dateRangeError && (
                <p className="text-xs text-red-600" role="alert">
                  {dateRangeError}
                </p>
              )}
            </div>
          </div>

          {/* Table */}
          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={pageSlice.length === 0}
            onRetry={() => query.refetch()}
            emptyMessage="No applications match the current filters."
            skeletonRows={8}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Reference Number</th>
                    <th className={th}>Beneficiary</th>
                    <th className={th}>Scheme</th>
                    <SortHeader
                      field="requestedAmount"
                      label="Requested Amount"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <th className={th}>Status</th>
                    <SortHeader
                      field="submissionDate"
                      label="Submission Date"
                      currentField={sortField}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map((app) => (
                    <tr key={app.id} className="hover:bg-gov-blue/5">
                      <td className={`${td} font-mono text-xs`}>
                        <Link
                          to={`/applications/${app.id}`}
                          className="text-gov-blue hover:underline"
                        >
                          {app.referenceNumber}
                        </Link>
                      </td>
                      <td className={`${td} font-medium text-text-primary`}>
                        {app.beneficiaryName}
                      </td>
                      <td className={`${td} text-text-secondary`}>{app.schemeName}</td>
                      <td className={`${td} text-right font-medium text-text-primary tabular-nums`}>
                        {formatINR(app.requestedAmount)}
                      </td>
                      <td className={td}>
                        <WorkflowStageBadge status={app.status} />
                      </td>
                      <td className={`${td} text-text-secondary tabular-nums`}>
                        {formatDate(app.submissionDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalElements={totalElements}
              onPageChange={setPage}
            />
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
