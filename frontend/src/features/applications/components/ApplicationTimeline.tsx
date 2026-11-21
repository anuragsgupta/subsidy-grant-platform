import { format, parseISO } from 'date-fns';
import type { DemoApplicationEvent } from '../../../services/demo-data.service';

interface ApplicationTimelineProps {
  events: DemoApplicationEvent[];
}

function formatStageLabel(stage: string): string {
  return stage.replace(/_/g, ' ');
}

export function ApplicationTimeline({ events }: ApplicationTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-[#64748B]">
        No timeline events
      </div>
    );
  }

  const sorted = [...events].sort((a, b) =>
    a.transitionDate.localeCompare(b.transitionDate),
  );

  return (
    <ol className="relative space-y-0">
      {sorted.map((event, index) => {
        const isLast = index === sorted.length - 1;
        const formattedDate = format(parseISO(event.transitionDate), 'dd MMM yyyy HH:mm');
        const remark =
          event.remark && event.remark.trim().length > 0 ? event.remark.trim() : '—';

        return (
          <li key={`${event.stage}-${event.transitionDate}`} className="relative flex gap-4">
            {/* Connector column */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 border-[#1769AA] bg-white" />
              {/* Vertical line below dot (hidden on last item) */}
              {!isLast && (
                <span className="mt-1 w-px flex-1 bg-[#DCE3EA]" style={{ minHeight: '2rem' }} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#12304A]">
                {formatStageLabel(event.stage)}
              </p>
              <p className="mt-0.5 text-xs text-[#64748B]">{formattedDate}</p>
              <p className="mt-1 text-sm text-[#1E293B]">{remark}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
