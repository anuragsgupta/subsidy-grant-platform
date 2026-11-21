import { format, parseISO } from 'date-fns';
import type { DemoActivityEvent } from '../../../services/demo-data.service';

interface RecentActivityListProps {
  events: DemoActivityEvent[];
}

export function RecentActivityList({ events }: RecentActivityListProps) {
  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[#64748B]">No recent activity</p>
    );
  }

  return (
    <ul className="divide-y divide-[#DCE3EA]">
      {events.map((event, index) => (
        <li key={`${event.applicationRef}-${event.eventType}-${index}`} className="flex items-center justify-between py-3 px-1">
          <div className="flex items-center gap-3 min-w-0">
            {/* Status dot */}
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#1769AA]" aria-hidden="true" />

            {/* Reference + event type */}
            <div className="min-w-0">
              <span className="text-sm font-medium text-[#1E293B] truncate">
                {event.applicationRef}
              </span>
              <span className="mx-2 text-[#DCE3EA]" aria-hidden="true">·</span>
              <span className="text-sm text-[#64748B]">
                {event.eventType.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <time
            dateTime={event.timestamp}
            className="ml-4 flex-shrink-0 text-xs text-[#64748B] tabular-nums"
          >
            {format(parseISO(event.timestamp), 'yyyy-MM-dd HH:mm')}
          </time>
        </li>
      ))}
    </ul>
  );
}
