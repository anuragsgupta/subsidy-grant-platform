import type { AssessmentDecision } from '../../../services/workflow-demo-data.service';

const DECISION_STYLES: Record<AssessmentDecision, { label: string; className: string }> = {
  ELIGIBLE: { label: 'Eligible', className: 'border-green-200 bg-green-50 text-green-700' },
  INELIGIBLE: { label: 'Ineligible', className: 'border-red-200 bg-red-50 text-red-700' },
  REQUIRES_MANUAL_REVIEW: { label: 'Manual Review', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  INCOMPLETE_INFORMATION: { label: 'Incomplete', className: 'border-blue-200 bg-blue-50 text-blue-700' },
};

export function AssessmentDecisionBadge({ decision }: { decision: AssessmentDecision }) {
  const { label, className } = DECISION_STYLES[decision] ?? {
    label: decision,
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {label}
    </span>
  );
}
