// src/features/beneficiaries/pages/BeneficiaryProfilePage.tsx

import { User, Building2, Briefcase } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useBeneficiaryByUserIdQuery } from '../hooks/useBeneficiaries';
import type { BeneficiaryType, BeneficiaryStatus } from '../../../services/demo-data.service';
import { QueryState } from '../../../components/states/QueryState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { PageContainer } from '../../../components/layout/PageContainer';
import { Badge } from '../../../components/ui/badge';
import { Skeleton } from '../../../components/ui/skeleton';

// ---------------------------------------------------------------------------
// Status / type helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<BeneficiaryStatus, { label: string; className: string }> = {
  ACTIVE:   { label: 'Active',   className: 'border-green-200 bg-green-50 text-green-700' },
  INACTIVE: { label: 'Inactive', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  PENDING:  { label: 'Pending',  className: 'border-amber-200 bg-amber-50 text-amber-700' },
};

const TYPE_ICONS: Record<BeneficiaryType, React.ReactNode> = {
  INDIVIDUAL:   <User       size={14} className="inline -mt-0.5 mr-1" />,
  ORGANIZATION: <Building2 size={14} className="inline -mt-0.5 mr-1" />,
  BUSINESS:     <Briefcase size={14} className="inline -mt-0.5 mr-1" />,
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
// Field row
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
// Profile card skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Card skeleton */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="px-5 py-1 space-y-0">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-4 py-3 border-b border-border last:border-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40 col-span-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Not-found state
// ---------------------------------------------------------------------------

function ProfileNotFound() {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm p-8 text-center space-y-3">
      <User size={40} className="mx-auto text-text-secondary opacity-40" />
      <p className="text-sm font-medium text-text-primary">Profile not found</p>
      <p className="text-xs text-text-secondary max-w-xs mx-auto">
        No beneficiary profile is linked to your account. Please contact your district officer
        or system administrator to register as a beneficiary.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BeneficiaryProfilePage() {
  const { user } = useAuth();

  const {
    data: beneficiary,
    isLoading,
    isError,
    error,
    refetch,
  } = useBeneficiaryByUserIdQuery(user?.id ?? '');

  return (
    <PageContainer>
      {/* ── Page header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-semibold text-text-primary">My Profile</h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Your registered beneficiary details.
        </p>
      </div>

      {/* ── Loading ── */}
      {isLoading && <ProfileSkeleton />}

      {/* ── Error ── */}
      {!isLoading && isError && (
        <QueryState
          isLoading={false}
          isError={isError}
          error={error}
          isEmpty={false}
          onRetry={() => void refetch()}
        >
          {null}
        </QueryState>
      )}

      {/* ── Not found ── */}
      {!isLoading && !isError && beneficiary === undefined && <ProfileNotFound />}

      {/* ── Loaded ── */}
      {!isLoading && !isError && beneficiary !== undefined && (
        <div className="space-y-1">
          {/* Sub-header with name + status */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-base font-semibold text-text-primary">{beneficiary.fullName}</p>
              <p className="mt-0.5 text-xs font-mono text-text-secondary">
                {beneficiary.referenceId}
              </p>
            </div>
            <StatusBadge status={beneficiary.status} />
          </div>

          {/* Profile card */}
          <section
            aria-labelledby="profile-card-heading"
            className="rounded-lg border border-border bg-card shadow-sm"
          >
            <div className="px-5 py-4 border-b border-border">
              <h2 id="profile-card-heading" className="text-sm font-semibold text-text-primary">
                Beneficiary Details
              </h2>
            </div>

            <dl className="px-5 py-1">
              <FieldRow
                label="Reference ID"
                value={
                  <span className="font-mono text-xs">{beneficiary.referenceId}</span>
                }
              />
              <FieldRow label="Full Name" value={beneficiary.fullName} />
              <FieldRow
                label="Beneficiary Type"
                value={
                  <span className="inline-flex items-center text-sm">
                    {TYPE_ICONS[beneficiary.type]}
                    {beneficiary.type.charAt(0) + beneficiary.type.slice(1).toLowerCase()}
                  </span>
                }
              />
              <FieldRow label="Region" value={beneficiary.regionName} />
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
              <FieldRow label="Phone" value={beneficiary.phone} />
              <FieldRow
                label="Status"
                value={<StatusBadge status={beneficiary.status} />}
              />
              <FieldRow
                label="National ID"
                value={
                  <span className="font-mono tracking-widest text-xs">
                    {beneficiary.nationalId}
                  </span>
                }
              />
              <FieldRow
                label="SSN"
                value={
                  <span className="font-mono tracking-widest text-xs">
                    {beneficiary.ssn}
                  </span>
                }
              />
            </dl>
          </section>
        </div>
      )}
    </PageContainer>
  );
}
