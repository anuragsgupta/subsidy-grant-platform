import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface PaginationProps {
  /** Zero-based current page. */
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (page: number) => void;
}

/** Minimal server-driven pagination control (Prev / Next + totals). */
export function Pagination({
  page,
  totalPages,
  totalElements,
  onPageChange,
}: PaginationProps) {
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;
  const safeTotal = Math.max(totalPages, 1);
  const current = Math.min(page + 1, safeTotal);

  return (
    <div className="flex items-center justify-between py-3 text-sm text-text-secondary">
      <span>{totalElements} total</span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
          <span className="sr-only">Previous page</span>
        </Button>
        <span>
          Page {current} of {safeTotal}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  );
}
