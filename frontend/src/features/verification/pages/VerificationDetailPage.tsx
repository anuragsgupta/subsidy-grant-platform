import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useVerificationTaskQuery } from '../hooks/useVerification';
import { QueryState } from '../../../components/states/QueryState';
import { EmptyState } from '../../../components/states/EmptyState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { FieldVerificationForm } from '../components/FieldVerificationForm';
import { DistrictReviewPanel } from '../components/DistrictReviewPanel';
import { WorkflowHistoryTimeline } from '../components/WorkflowHistoryTimeline';

export default function VerificationDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuth();
  const { data: task, isLoading, isError, error, refetch } = useVerificationTaskQuery(taskId ?? '');

  if (isLoading || isError) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/verification" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
          <ArrowLeft size={14} /> Back to Tasks
        </Link>
        <QueryState isLoading={isLoading} isError={isError} error={error} isEmpty={false} onRetry={() => refetch()} skeletonRows={6}>
          {null}
        </QueryState>
      </div>
    );
  }

  if (task === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/verification" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
          <ArrowLeft size={14} /> Back to Tasks
        </Link>
        <EmptyState message="Verification task not found." />
      </div>
    );
  }

  // Permission check: field officer must be assigned to this task
  if (user?.role === 'FIELD_OFFICER' && task.assignedOfficerId !== user.id) {
    return (
      <div className="p-6 space-y-4">
        <Link to="/verification" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
          <ArrowLeft size={14} /> Back to Tasks
        </Link>
        <PermissionDeniedState />
      </div>
    );
  }

  const showFieldForm = task.currentStage === 'FIELD_PENDING' && user?.role === 'FIELD_OFFICER';
  const showDistrictPanel = task.currentStage === 'DISTRICT_REVIEW' && (user?.role === 'DISTRICT_OFFICER' || user?.role === 'ADMIN');
  const readOnlyMessage = task.currentStage !== 'FIELD_PENDING' && task.currentStage !== 'DISTRICT_REVIEW'
    ? `This task is in the ${task.currentStage.replace(/_/g, ' ')} stage and cannot be acted upon.`
    : null;

  return (
    <div className="space-y-6 p-6">
      <Link to="/verification" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
        <ArrowLeft size={14} /> Back to Tasks
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary font-mono">{task.applicationRef}</h1>
            <DemoBadge />
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">{task.beneficiaryName} - {task.schemeName}</p>
        </div>
      </div>

      {/* Application details */}
      <section className="rounded-lg border border-gov-border bg-white">
        <div className="px-5 py-4 border-b border-gov-border">
          <h2 className="text-sm font-semibold text-text-primary">Application Details</h2>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-medium text-text-secondary">Beneficiary</p>
              <p className="text-sm text-text-primary">{task.beneficiaryName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Scheme</p>
              <p className="text-sm text-text-primary">{task.schemeName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Requested Amount</p>
              <p className="text-sm text-text-primary font-semibold">Rs {task.requestedAmount.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Current Stage</p>
              <p className="text-sm text-text-primary">{task.currentStage.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Submission Date</p>
              <p className="text-sm text-text-primary tabular-nums">{task.submissionDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Region</p>
              <p className="text-sm text-text-primary">{task.regionName ?? '—'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Field verification form or district review panel or read-only message */}
      {showFieldForm && (
        <section className="rounded-lg border border-gov-border bg-white">
          <div className="px-5 py-4 border-b border-gov-border">
            <h2 className="text-sm font-semibold text-text-primary">Field Verification Form</h2>
            <p className="mt-0.5 text-xs text-text-secondary">Complete the form below to submit your field verification report.</p>
          </div>
          <div className="px-5 py-5">
            <FieldVerificationForm taskId={task.id} onSubmitted={() => refetch()} />
          </div>
        </section>
      )}

      {showDistrictPanel && (
        <DistrictReviewPanel task={task} onActionComplete={() => refetch()} />
      )}

      {readOnlyMessage && (
        <div className="rounded-lg border border-gov-border bg-white p-5">
          <p className="text-sm text-text-secondary">{readOnlyMessage}</p>
        </div>
      )}

      {/* Workflow history */}
      <section className="rounded-lg border border-gov-border bg-white">
        <div className="px-5 py-4 border-b border-gov-border">
          <h2 className="text-sm font-semibold text-text-primary">Workflow History</h2>
        </div>
        <div className="px-5 py-5">
          <WorkflowHistoryTimeline events={task.history} currentStage={task.currentStage} />
        </div>
      </section>
    </div>
  );
}
