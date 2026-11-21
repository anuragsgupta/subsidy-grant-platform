import type { DemoEligibilityCriterion } from '../../../services/demo-data.service';

interface EligibilityCriteriaListProps {
  criteria: DemoEligibilityCriterion[];
}

const OPERATOR_LABELS: Record<DemoEligibilityCriterion['operator'], string> = {
  EQ: 'EQ',
  GTE: 'GTE',
  LTE: 'LTE',
  IN: 'IN',
};

export function EligibilityCriteriaList({ criteria }: EligibilityCriteriaListProps) {
  if (criteria.length === 0) {
    return (
      <p className="text-sm text-[#64748B] py-4 text-center">
        No eligibility criteria defined.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {criteria.map((criterion, index) => (
        <li
          key={index}
          className="flex flex-col gap-1 rounded border border-[#DCE3EA] bg-white px-4 py-3"
        >
          {/* Primary row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#1E293B]">{criterion.attribute}</span>

            <code className="rounded bg-[#F4F7FA] px-1.5 py-0.5 font-mono text-xs text-[#1769AA]">
              {OPERATOR_LABELS[criterion.operator]}
            </code>

            <code className="rounded bg-[#F4F7FA] px-1.5 py-0.5 font-mono text-xs text-[#245B83]">
              {criterion.threshold}
            </code>

            <span className="mx-1 text-[#DCE3EA]">·</span>

            {criterion.mandatory ? (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                Mandatory
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#F4F7FA] px-2 py-0.5 text-xs font-medium text-[#64748B] ring-1 ring-inset ring-[#DCE3EA]">
                Optional
              </span>
            )}
          </div>

          {/* Description */}
          {criterion.description && (
            <p className="text-sm text-[#64748B]">{criterion.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
