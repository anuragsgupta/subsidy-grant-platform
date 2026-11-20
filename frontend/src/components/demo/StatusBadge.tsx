import { Badge } from '../ui/badge';

const colors: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-800',
  ACTIVE: 'bg-green-100 text-green-800',
  APPROVED: 'bg-green-100 text-green-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  PAUSED: 'bg-amber-100 text-amber-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FIELD_PENDING: 'bg-amber-100 text-amber-800',
  DISTRICT_REVIEW: 'bg-blue-100 text-blue-800',
  SECOND_REVIEW: 'bg-blue-100 text-blue-800',
  FINANCE_REVIEW: 'bg-purple-100 text-purple-800',
  BUDGET_HOLD: 'bg-orange-100 text-orange-800',
  REJECTED: 'bg-red-100 text-red-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  CLOSED: 'bg-slate-100 text-slate-700',
  TERMINATED: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={colors[status] ?? 'bg-blue-50 text-blue-800'}>
      {status.split('_').join(' ')}
    </Badge>
  );
}
