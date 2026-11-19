import { ServerCrash } from 'lucide-react';
import { Button } from '../ui/button';

interface ErrorStateProps {
  onRetry?: () => void;
}

/** "Backend not available" state (network error / INTERNAL_ERROR). */
export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      role="alert"
    >
      <ServerCrash className="text-status-red" size={40} aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-text-primary">Backend not available</p>
      <p className="mt-1 text-sm text-text-secondary">Unable to reach the server.</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
