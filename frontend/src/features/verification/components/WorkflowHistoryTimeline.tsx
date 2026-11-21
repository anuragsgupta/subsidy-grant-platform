import { format, parseISO } from 'date-fns';
import type { WorkflowHistoryEvent, WorkflowStage } from '../../../services/workflow-demo-data.service';

interface WorkflowHistoryTimelineProps {
  events: WorkflowHistoryEvent[];
  currentStage?: WorkflowStage;
}

const STAGE_LABELS: Record<string, string> = {
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

export function WorkflowHistoryTimeline({ events, currentStage }: WorkflowHistoryTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-text-secondary">No workflow history available.</p>;
  }

  const sorted = [...events].sort((a, b) => a.transitionDate.localeCompare(b.transitionDate));

  return (
    <div className="space-y-0">
      {sorted.map((event, idx) => {
        const isCurrent = event.stage === currentStage;
        const isLast = idx === sorted.length - 1;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full border-2 ${isCurrent ? 'border-gov-blue bg-gov-blue' : 'border-text-secondary/40 bg-white'}`} />
              {!isLast && <div className="w-px flex-1 bg-gov-border" />}
            </div>
            <div className={`flex-1 pb-4 ${isLast ? 'pb-0' : ''}`}>
              <p className={`text-sm font-semibold ${isCurrent ? 'text-gov-blue' : 'text-text-primary'}`}>
                {STAGE_LABELS[event.stage] ?? event.stage}
              </p>
              <p className="text-xs text-text-secondary tabular-nums">
                {format(parseISO(event.transitionDate), 'dd MMM yyyy HH:mm')}
              </p>
              {event.actorName && (
                <p className="text-xs text-text-secondary/80">by {event.actorName}</p>
              )}
              <p className="text-sm text-text-secondary mt-0.5">
                {event.remark || '—'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
