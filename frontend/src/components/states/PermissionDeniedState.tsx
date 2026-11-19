import { ShieldAlert } from 'lucide-react';

/** Rendered when a query/mutation returns ACCESS_DENIED (403). */
export function PermissionDeniedState() {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 text-center"
      role="alert"
    >
      <ShieldAlert className="text-status-amber" size={40} aria-hidden="true" />
      <p className="mt-3 text-sm font-medium text-text-primary">Access denied</p>
      <p className="mt-1 text-sm text-text-secondary">
        You do not have permission to view this section.
      </p>
    </div>
  );
}
