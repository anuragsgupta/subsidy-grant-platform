// src/features/schemes/pages/SchemeListPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { DemoBadge } from '../../../components/common/DemoBadge';
import { QueryState } from '../../../components/states/QueryState';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { useSchemesQuery } from '../hooks/useSchemes';
import { formatCurrency } from '../../../lib/utils';
import type { SchemeStatus } from '../../../services/demo-data.service';

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

type StatusBadgeVariant = 'grey' | 'green' | 'amber';

interface StatusConfig {
  label: string;
  variant: StatusBadgeVariant;
}

const STATUS_CONFIG: Record<SchemeStatus, StatusConfig> = {
  DRAFT: { label: 'Draft', variant: 'grey' },
  OPEN: { label: 'Open', variant: 'green' },
  PAUSED: { label: 'Paused', variant: 'amber' },
  CLOSED: { label: 'Closed', variant: 'grey' },
};

const BADGE_CLASSES: Record<StatusBadgeVariant, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  grey: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
};

function StatusBadge({ status }: { status: SchemeStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[config.variant]}`}
    >
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status filter options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: SchemeStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'OPEN', label: 'Open' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchemeListPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SchemeStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  // Debounce search input by 400 ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter or debounced search changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter, debouncedSearch]);

  const { data, isLoading, isError, error, refetch } = useSchemesQuery();
  const allSchemes = data ?? [];

  // Filter pipeline
  const filtered = allSchemes.filter((s) => {
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const q = debouncedSearch.trim().toLowerCase();
    const matchesText =
      q === '' ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q);
    return matchesStatus && matchesText;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const isEmpty = !isLoading && !isError && filtered.length === 0;

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      {/* Page header */}
      <div className="bg-white border-b border-[#DCE3EA] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-[#1E293B]">Scheme Management</h1>
              <DemoBadge />
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              Browse available government subsidy schemes
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 py-6 space-y-4">
        {/* Filter bar */}
        <div className="bg-white border border-[#DCE3EA] rounded-lg px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] pointer-events-none" />
              <Input
                type="search"
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-[#DCE3EA] bg-[#F4F7FA] text-[#1E293B] placeholder:text-[#64748B] focus-visible:ring-[#1769AA]"
              />
            </div>

            {/* Status filter */}
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as SchemeStatus | 'ALL')}
              >
                <SelectTrigger className="border-[#DCE3EA] bg-[#F4F7FA] text-[#1E293B] focus:ring-[#1769AA]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Result count */}
            <p className="text-sm text-[#64748B] whitespace-nowrap sm:ml-auto">
              {filtered.length} {filtered.length === 1 ? 'scheme' : 'schemes'} found
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white border border-[#DCE3EA] rounded-lg overflow-hidden">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={isEmpty}
            onRetry={() => void refetch()}
            skeletonRows={5}
            emptyMessage="No schemes match the current filters."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#DCE3EA] bg-[#F4F7FA]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      Scheme Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      Grant Amount Range
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider whitespace-nowrap">
                      Application Period
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE3EA]">
                  {paged.map((scheme) => (
                    <tr
                      key={scheme.id}
                      className="hover:bg-[#F4F7FA] transition-colors"
                    >
                      {/* Scheme Code */}
                      <td className="px-4 py-3 font-mono text-xs text-[#64748B] whitespace-nowrap">
                        {scheme.code}
                      </td>

                      {/* Name — links to detail page */}
                      <td className="px-4 py-3">
                        <Link
                          to={`/schemes/${scheme.id}`}
                          className="font-medium text-[#1769AA] hover:text-[#12304A] hover:underline"
                        >
                          {scheme.name}
                        </Link>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={scheme.status} />
                      </td>

                      {/* Grant amount range */}
                      <td className="px-4 py-3 whitespace-nowrap text-[#1E293B]">
                        {formatCurrency(scheme.minGrantAmount)}
                        <span className="mx-1 text-[#64748B]">–</span>
                        {formatCurrency(scheme.maxGrantAmount)}
                      </td>

                      {/* Application period */}
                      <td className="px-4 py-3 whitespace-nowrap text-[#1E293B]">
                        {format(parseISO(scheme.startDate), 'dd MMM yyyy')}
                        <span className="mx-1 text-[#64748B]">–</span>
                        {format(parseISO(scheme.endDate), 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#DCE3EA] px-4 py-3">
                <p className="text-sm text-[#64748B]">
                  Page {page + 1} of {totalPages} &middot;{' '}
                  {filtered.length} {filtered.length === 1 ? 'scheme' : 'schemes'}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="border-[#DCE3EA] text-[#1E293B] hover:bg-[#F4F7FA] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="border-[#DCE3EA] text-[#1E293B] hover:bg-[#F4F7FA] disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </QueryState>
        </div>
      </div>
    </div>
  );
}
