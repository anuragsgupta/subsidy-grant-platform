import { Link, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, PencilLine } from 'lucide-react';

import { useSchemeQuery } from '../hooks/useSchemes';
import { EligibilityCriteriaList } from '../components/EligibilityCriteriaList';
import { QueryState } from '../../../components/states/QueryState';
import { EmptyState } from '../../../components/states/EmptyState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { useAuth } from '../../../contexts/AuthContext';
import type { SchemeStatus } from '../../../services/demo-data.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const STATUS_STYLES: Record<SchemeStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 ring-gray-200',
  OPEN: 'bg-green-50 text-green-700 ring-green-600/20',
  PAUSED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  CLOSED: 'bg-gray-100 text-gray-700 ring-gray-200',
};

const STATUS_LABELS: Record<SchemeStatus, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
};

function StatusBadge({ status }: { status: SchemeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detail row helper
// ---------------------------------------------------------------------------

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
      <dt className="text-sm font-medium text-[#64748B]">{label}</dt>
      <dd className="text-sm text-[#1E293B] sm:col-span-2">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function SchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const {
    data: scheme,
    isLoading,
    isError,
    error,
    refetch,
  } = useSchemeQuery(id ?? '');

  // Loading / error states
  if (isLoading || isError) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        {/* Back link skeleton placeholder */}
        <div className="mb-4">
          <Link
            to="/schemes"
            className="inline-flex items-center gap-1.5 text-sm text-[#1769AA] hover:underline"
          >
            <ArrowLeft size={14} />
            Back to Schemes
          </Link>
        </div>
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={false}
          onRetry={refetch}
          skeletonRows={6}
        >
          {null}
        </QueryState>
      </div>
    );
  }

  // Not found
  if (scheme === undefined) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-4">
          <Link
            to="/schemes"
            className="inline-flex items-center gap-1.5 text-sm text-[#1769AA] hover:underline"
          >
            <ArrowLeft size={14} />
            Back to Schemes
          </Link>
        </div>
        <div className="rounded-lg border border-[#DCE3EA] bg-white p-8">
          <EmptyState message="Scheme not found" />
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  const grantRange = `${formatCurrency(scheme.minGrantAmount)} – ${formatCurrency(scheme.maxGrantAmount)}`;
  const applicationPeriod = `${format(parseISO(scheme.startDate), 'dd MMM yyyy')} – ${format(parseISO(scheme.endDate), 'dd MMM yyyy')}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <div>
        <Link
          to="/schemes"
          className="inline-flex items-center gap-1.5 text-sm text-[#1769AA] hover:underline"
        >
          <ArrowLeft size={14} />
          Back to Schemes
        </Link>
      </div>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#1E293B]">{scheme.name}</h1>
            <DemoBadge />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-[#64748B]">{scheme.code}</span>
            <span className="text-[#DCE3EA]">·</span>
            <StatusBadge status={scheme.status} />
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-[#DCE3EA] bg-white px-4 py-2 text-sm font-medium text-[#64748B] opacity-60"
          >
            <PencilLine size={14} />
            Edit Scheme
          </button>
        )}
      </div>

      {/* ── Scheme details card ───────────────────────────────────────────── */}
      <section className="rounded-lg border border-[#DCE3EA] bg-white">
        <div className="border-b border-[#DCE3EA] px-6 py-4">
          <h2 className="text-base font-semibold text-[#1E293B]">Scheme Details</h2>
        </div>
        <dl className="divide-y divide-[#DCE3EA] px-6">
          <DetailRow label="Scheme Code" value={<code className="font-mono text-sm">{scheme.code}</code>} />
          <DetailRow label="Name" value={scheme.name} />
          <DetailRow
            label="Description"
            value={<p className="whitespace-pre-line leading-relaxed">{scheme.description}</p>}
          />
          <DetailRow label="Status" value={<StatusBadge status={scheme.status} />} />
          <DetailRow label="Grant Amount Range" value={grantRange} />
          <DetailRow label="Application Period" value={applicationPeriod} />
        </dl>
      </section>

      {/* ── Eligibility criteria card ─────────────────────────────────────── */}
      <section className="rounded-lg border border-[#DCE3EA] bg-white">
        <div className="border-b border-[#DCE3EA] px-6 py-4">
          <h2 className="text-base font-semibold text-[#1E293B]">Eligibility Criteria</h2>
          <p className="mt-0.5 text-sm text-[#64748B]">
            {scheme.eligibilityCriteria.length > 0
              ? `${scheme.eligibilityCriteria.length} criterion${scheme.eligibilityCriteria.length !== 1 ? 'a' : ''} defined`
              : 'No criteria configured'}
          </p>
        </div>
        <div className="p-6">
          <EligibilityCriteriaList criteria={scheme.eligibilityCriteria} />
        </div>
      </section>
    </div>
  );
}
