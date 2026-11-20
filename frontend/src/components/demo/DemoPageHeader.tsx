import type { ReactNode } from 'react';
import { DemoDataBadge } from './DemoDataBadge';

export function DemoPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        {description && <p className="mt-1 text-text-secondary">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <DemoDataBadge />
      </div>
    </div>
  );
}
