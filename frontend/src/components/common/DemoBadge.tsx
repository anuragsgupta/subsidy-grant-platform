// src/components/common/DemoBadge.tsx
export function DemoBadge() {
  return (
    <span
      data-testid="demo-badge"
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200"
    >
      Demo data
    </span>
  );
}
