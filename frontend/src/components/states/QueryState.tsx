import type { ReactNode } from 'react';
import { ApiError } from '../../services/api-client';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { PermissionDeniedState } from './PermissionDeniedState';

interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty: boolean;
  onRetry?: () => void;
  skeletonRows?: number;
  emptyMessage?: string;
  children: ReactNode;
}

/**
 * Resolves a data view into one of: loading skeleton, permission-denied,
 * "backend not available" error, empty state, or the children.
 */
export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  skeletonRows = 5,
  emptyMessage = 'No records found.',
  children,
}: QueryStateProps) {
  if (isLoading) return <LoadingSkeleton rows={skeletonRows} />;
  if (isError) {
    const apiError = error instanceof ApiError ? error : undefined;
    if (apiError?.errorCode === 'ACCESS_DENIED') return <PermissionDeniedState />;
    return <ErrorState onRetry={onRetry} />;
  }
  if (isEmpty) return <EmptyState message={emptyMessage} />;
  return <>{children}</>;
}
