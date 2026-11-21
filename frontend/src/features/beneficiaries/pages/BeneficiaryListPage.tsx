import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useBeneficiariesQuery } from '../hooks/useBeneficiaries';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { Pagination } from '../../../components/common/Pagination';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import type { BeneficiaryStatus, BeneficiaryType } from '../../../services/demo-data.service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: BeneficiaryStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PENDING', label: 'Pending' },
];

const TYPE_LABELS: Record<BeneficiaryType, string> = {
  INDIVIDUAL: 'Individual',
  ORGANIZATION: 'Organization',
  BUSINESS: 'Business',
};

// ---------------------------------------------------------------------------
// Table cell class helpers
// ---------------------------------------------------------------------------

const th = 'py-2 px-3 text-left font-medium text-text-secondary border-b border-gov-border';
const td = 'py-2 px-3 border-b border-gov-border/60';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function BeneficiaryStatusBadge({ status }: { status: BeneficiaryStatus }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge
          variant="outline"
          className="border-status-green/30 bg-status-green/10 text-status-green"
        >
          Active
        </Badge>
      );
    case 'INACTIVE':
      return (
        <Badge
          variant="outline"
          className="border-status-grey/30 bg-status-grey/10 text-status-grey"
        >
          Inactive
        </Badge>
      );
    case 'PENDING':
      return (
        <Badge
          variant="outline"
          className="border-status-amber/30 bg-status-amber/10 text-status-amber"
        >
          Pending
        </Badge>
      );
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function BeneficiaryListPage() {
  const { user } = useAuth();

  // Permission guard: beneficiaries cannot view the management list
  if (user?.role === 'BENEFICIARY') {
    return <PermissionDeniedState />;
  }

  return <BeneficiaryListContent />;
}

// Separated to avoid hook-order issues when the guard renders early
function BeneficiaryListContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BeneficiaryStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  const query = useBeneficiariesQuery();
  const allBeneficiaries = query.data ?? [];

  // ── Filter pipeline ──────────────────────────────────────────────────────

  const filtered = allBeneficiaries
    .filter((b) => (statusFilter === 'ALL' ? true : b.status === statusFilter))
    .filter(() => {
      if (!search.trim()) return true;
      return true; // applied below with normalised value
    });

  const lowerSearch = search.trim().toLowerCase();

  const afterSearch = lowerSearch
    ? filtered.filter(
        (b) =>
          b.fullName.toLowerCase().includes(lowerSearch) ||
          b.referenceId.toLowerCase().includes(lowerSearch),
      )
    : filtered;

  // ── Client-side pagination ───────────────────────────────────────────────

  const totalElements = afterSearch.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageSlice = afterSearch.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleStatusChange(value: BeneficiaryStatus | 'ALL') {
    setStatusFilter(value);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Beneficiary Management</h1>
          <p className="mt-1 text-text-secondary">
            View and manage registered beneficiaries across all regions.
          </p>
        </div>
        <DemoBadge />
      </div>

      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-lg text-text-primary">Beneficiaries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search by name or reference ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-gov-border bg-white py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
                aria-label="Search beneficiaries"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as BeneficiaryStatus | 'ALL')}
              className="rounded-md border border-gov-border bg-white py-2 pl-3 pr-8 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={pageSlice.length === 0}
            onRetry={() => query.refetch()}
            emptyMessage="No beneficiaries match the current filters."
            skeletonRows={8}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={th}>Reference ID</th>
                    <th className={th}>Full Name</th>
                    <th className={th}>Type</th>
                    <th className={th}>Region</th>
                    <th className={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.map((b) => (
                    <tr key={b.id} className="hover:bg-gov-blue/5">
                      <td className={`${td} font-mono text-xs text-text-secondary`}>
                        {b.referenceId}
                      </td>
                      <td className={`${td} font-medium text-text-primary`}>
                        <Link
                          to={`/admin/beneficiaries/${b.id}`}
                          className="text-gov-blue hover:underline"
                        >
                          {b.fullName}
                        </Link>
                      </td>
                      <td className={td}>{TYPE_LABELS[b.type]}</td>
                      <td className={td}>{b.regionName}</td>
                      <td className={td}>
                        <BeneficiaryStatusBadge status={b.status} />
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
