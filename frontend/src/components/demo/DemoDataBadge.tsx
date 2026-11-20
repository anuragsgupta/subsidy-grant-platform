import { Badge } from '../ui/badge';

export function DemoDataBadge({ className = '' }: { className?: string }) {
  return (
    <Badge
      data-testid="demo-badge"
      variant="outline"
      className={`border-amber-300 bg-amber-50 text-amber-800 ${className}`}
    >
      Demo data
    </Badge>
  );
}
