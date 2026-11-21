// src/features/beneficiaries/pages/BeneficiaryDetailPage.tsx

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, Building2, Briefcase } from 'lucide-react';
import { useBeneficiaryQuery } from '../hooks/useBeneficiaries';
import { getAllApplications } from '../../../services/demo-data.service';
import type { BeneficiaryType, BeneficiaryStatus } from '../../../services/demo-data.service';
import { maskField } from '../../../utils/mask';
import { QueryState } from '../../../components/states/QueryState';
import { EmptyState } from '../../../components/states/EmptyState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { ApplicationHistoryList } from '../components/ApplicationHistoryList';
import { Badge } from '../../../components/ui/badge';

// ---------------------------------------------------------------------------
// Status styling helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<BeneficiaryStatus, { label: string; className: string }> = {
  ACTIVE:   { label: 'Active',   className: 'border-green-200 bg-green-50 text-green-700' },
  INACTIVE: { label: 'Inactive', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  PENDING:  { label: 'Pending',  className: 'border-amber-200 bg-amber-50 text-amber-700' },
};

const TYPE_ICONS: Record<BeneficiaryType, React.ReactNode> = {
  INDIVIDUAL:   <User        size={14} className="inline -mt-0.5 mr-1" />,
  ORGANIZATION: <Building2  size={14} className="inline -mt-0.5 mr-1" />,
  BUSINESS:     <Briefcase  size={14} className="inline -mt-0.5 mr-1" />,
};

function StatusBadge({ status }: { status: BeneficiaryStatus }) {
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
// Profile field row
// ---------------------------------------------------------------------------

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b border-border last:border-0">
      <dt className="text-sm font-medium text-text-secondary">{label}</dt>
      <dd className="col-span-2 text-sm text-text-primary">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BeneficiaryDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: beneficiary,
    isLoading,
    isError,
    error,
    refetch,
  } = useBeneficiaryQuery(id ?? '');

  // Derive related applications only when data is available
  const relatedApplications = beneficiary
    ? getAllApplications().filter((a) => a.beneficiaryId === beneficiary.id)
    : [];

  // ── Loading / error shell ──────────────────────────────────────────────
  if (isLoading || isError) {
    return (
      <div className="p-6">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={false}
          onRetry={() => void refetch()}
          skeletonRows={6}
        >
          {null}
        </QueryState>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────
  if (beneficiary === undefined) {
    return (
      <div className="p-6 space-y-4">
        <EmptyState message="Beneficiary not found." />
        <div className="flex justify-center">
          <Link
            to="/admin/beneficiaries"
            className="inline-flex items-center gap-1.5 text-sm text-gov-blue hover:underline"
          >
            <ArrowLeft size={14} />
            Back to Beneficiaries
          </Link>
        </div>
      </div>
    );
  }

  // ── Loaded ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* ── Back link ── */}
      <Link
        to="/admin/beneficiaries"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Beneficiaries
      </Link>

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-text-primary">{beneficiary.fullName}</h1>
            <DemoBadge />
          </div>
          <p className="mt-0.5 text-sm text-text-secondary font-mono">
            {beneficiary.referenceId}
          </p>
        </div>
        <StatusBadge status={beneficiary.status} />
      </div>

      {/* ── Profile card ── */}
      <section
        aria-labelledby="profile-heading"
        className="rounded-lg border border-border bg-card shadow-sm"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 id="profile-heading" className="text-sm font-semibold text-text-primary">
            Profile
          </h2>
        </div>

        <dl className="px-5 py-1">
          <FieldRow label="Reference ID"  value={<span className="font-mono text-xs">{beneficiary.referenceId}</span>} />
          <FieldRow label="Full Name"     value={beneficiary.fullName} />
          <FieldRow
            label="Type"
            value={
              <span className="inline-flex items-center capitalize text-sm">
                {TYPE_ICONS[beneficiary.type]}
                {beneficiary.type.charAt(0) + beneficiary.type.slice(1).toLowerCase()}
              </span>
            }
          />
          <FieldRow label="Region"        value={beneficiary.regionName} />
          <FieldRow
            label="Email"
            value={
              <a
                href={`mailto:${beneficiary.email}`}
                className="text-gov-blue hover:underline"
              >
                {beneficiary.email}
              </a>
            }
          />
          <FieldRow label="Phone"         value={beneficiary.phone} />
          <FieldRow
            label="Status"
            value={<StatusBadge status={beneficiary.status} />}
          />
          <FieldRow
            label="National ID"
            value={
              <span className="font-mono tracking-widest text-xs">
                {maskField(beneficiary.nationalId)}
              </span>
            }
          />
          <FieldRow
            label="SSN"
            value={
              <span className="font-mono tracking-widest text-xs">
                {maskField(beneficiary.ssn)}
              </span>
            }
          />
        </dl>
      </section>

      {/* ── Application history card ── */}
      <section
        aria-labelledby="history-heading"
        className="rounded-lg border border-border bg-card shadow-sm"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 id="history-heading" className="text-sm font-semibold text-text-primary">
            Application History
          </h2>
          <span className="text-xs text-text-secondary">
            {relatedApplications.length} application
            {relatedApplications.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-4">
          <ApplicationHistoryList applications={relatedApplications} />
        </div>
      </section>
    </div>
  );
}
