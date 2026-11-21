// src/features/applications/pages/ApplicationDetailPage.tsx

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useApplicationQuery } from '../hooks/useApplications';
import { getBeneficiaryByUserId } from '../../../services/demo-data.service';
import type { WorkflowStage } from '../../../services/demo-data.service';
import { useAuth } from '../../../contexts/AuthContext';
import { QueryState } from '../../../components/states/QueryState';
import { EmptyState } from '../../../components/states/EmptyState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { ApplicationWorkflowActions } from '../components/ApplicationWorkflowActions';
import { Badge } from '../../../components/ui/badge';

// ---------------------------------------------------------------------------
// Status styling — same colour map as the rest of Phase 4
// ---------------------------------------------------------------------------

const STAGE_STYLES: Record<WorkflowStage, { label: string; className: string }> = {
  SUBMITTED:      { label: 'Submitted',       className: 'border-blue-200   bg-blue-50   text-blue-700'   },
  FIELD_PENDING:  { label: 'Field Pending',   className: 'border-amber-200  bg-amber-50  text-amber-700'  },
  DISTRICT_REVIEW:{ label: 'District Review', className: 'border-amber-200  bg-amber-50  text-amber-700'  },
  SECOND_REVIEW:  { label: 'Second Review',   className: 'border-purple-200 bg-purple-50 text-purple-700' },
  FINANCE_REVIEW: { label: 'Finance Review',  className: 'border-blue-200   bg-blue-50   text-blue-700'   },
  BUDGET_HOLD:    { label: 'Budget Hold',     className: 'border-orange-200 bg-orange-50 text-orange-700' },
  APPROVED:       { label: 'Approved',        className: 'border-green-200  bg-green-50  text-green-700'  },
  REJECTED:       { label: 'Rejected',        className: 'border-red-200    bg-red-50    text-red-700'    },
  CLOSED:         { label: 'Closed',          className: 'border-slate-200  bg-slate-50  text-slate-600'  },
  TERMINATED:     { label: 'Terminated',      className: 'border-red-200    bg-red-50    text-red-700'    },
};

function StageBadge({ stage }: { stage: WorkflowStage }) {
  const { label, className } = STAGE_STYLES[stage] ?? {
    label: stage,
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Field row helper
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
// Currency formatter
// ---------------------------------------------------------------------------

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const {
    data: app,
    isLoading,
    isError,
    error,
    refetch,
  } = useApplicationQuery(id ?? '');

  // ── Loading / API error shell ─────────────────────────────────────────
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
  if (app === undefined) {
    return (
      <div className="p-6 space-y-4">
        <EmptyState message="Application not found." />
        <div className="flex justify-center">
          <Link
            to="/applications"
            className="inline-flex items-center gap-1.5 text-sm text-gov-blue hover:underline"
          >
            <ArrowLeft size={14} />
            Back to Applications
          </Link>
        </div>
      </div>
    );
  }

  // ── BENEFICIARY ownership guard ───────────────────────────────────────
  if (user?.role === 'BENEFICIARY') {
    const linkedBeneficiary = user.id
      ? getBeneficiaryByUserId(user.id)
      : undefined;

    const isOwner =
      linkedBeneficiary !== undefined &&
      app.beneficiaryId === linkedBeneficiary.id;

    if (!isOwner) {
      return (
        <div className="p-6">
          <PermissionDeniedState />
        </div>
      );
    }
  }

  // ── Derived display values ────────────────────────────────────────────
  const formattedDate = format(parseISO(app.submissionDate), 'dd MMM yyyy');
  const formattedAmount = inrFormatter.format(app.requestedAmount);
  const stageLabel = STAGE_STYLES[app.status]?.label ?? app.status;

  // ── Loaded ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* ── Back link ── */}
      <Link
        to="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Applications
      </Link>

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-text-primary font-mono">
              {app.referenceNumber}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">
            {app.beneficiaryName} · {app.schemeName}
          </p>
        </div>
        <StageBadge stage={app.status} />
      </div>

      {/* ── Application details card ── */}
      <section
        aria-labelledby="details-heading"
        className="rounded-lg border border-border bg-card shadow-sm"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 id="details-heading" className="text-sm font-semibold text-text-primary">
            Application Details
          </h2>
        </div>

        <dl className="px-5 py-1">
          <FieldRow
            label="Reference Number"
            value={
              <span className="font-mono text-xs tracking-wide">
                {app.referenceNumber}
              </span>
            }
          />
          <FieldRow label="Beneficiary" value={app.beneficiaryName} />
          <FieldRow label="Scheme"      value={app.schemeName} />
          <FieldRow
            label="Requested Amount"
            value={
              <span className="font-semibold text-[#12304A]">{formattedAmount}</span>
            }
          />
          <FieldRow
            label="Submission Date"
            value={formattedDate}
          />
          <FieldRow
            label="Current Status"
            value={<StageBadge stage={app.status} />}
          />
          <FieldRow
            label="Workflow Stage"
            value={
              <span className="text-sm text-text-primary">{stageLabel}</span>
            }
          />
        </dl>
      </section>

      {/* ── Timeline card ── */}
      <section
        aria-labelledby="timeline-heading"
        className="rounded-lg border border-border bg-card shadow-sm"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 id="timeline-heading" className="text-sm font-semibold text-text-primary">
            Application Timeline
          </h2>
        </div>

        <div className="px-5 py-5">
          <ApplicationTimeline events={app.timeline} />
        </div>
      </section>

      {/* ── Workflow actions card ── */}
      <section
        aria-labelledby="actions-heading"
        className="rounded-lg border border-border bg-card shadow-sm"
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 id="actions-heading" className="text-sm font-semibold text-text-primary">
            Workflow Actions
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Actions become available once the backend workflow module is implemented.
          </p>
        </div>

        <div className="px-5 py-5">
          <ApplicationWorkflowActions />
        </div>
      </section>
    </div>
  );
}
