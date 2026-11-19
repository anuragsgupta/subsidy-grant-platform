import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
}

/** "No records" placeholder. */
export function EmptyState({ message = 'No records found.' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox className="text-text-secondary/50" size={40} aria-hidden="true" />
      <p className="mt-3 text-sm text-text-secondary">{message}</p>
    </div>
  );
}
