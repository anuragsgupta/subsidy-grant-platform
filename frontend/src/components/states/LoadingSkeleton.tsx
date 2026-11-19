import { Skeleton } from '../ui/skeleton';

interface LoadingSkeletonProps {
  rows?: number;
  cols?: number;
}

/** Table-shaped loading placeholder. */
export function LoadingSkeleton({ rows = 5, cols = 5 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-9 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
