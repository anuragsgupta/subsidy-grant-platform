import type { WorkflowCriterionResult } from '../../../services/workflow-demo-data.service';

interface CriterionResultTableProps {
  results: WorkflowCriterionResult[];
}

export function CriterionResultTable({ results }: CriterionResultTableProps) {
  if (results.length === 0) {
    return <p className="text-sm text-text-secondary">No criterion results available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gov-border bg-[#F4F7FA]">
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Description</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Attribute</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Op</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Threshold</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Mandatory</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Result</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gov-border/60">
          {results.map((r) => (
            <tr key={r.criterionId} className="hover:bg-gov-blue/5">
              <td className="px-3 py-2 text-text-primary">{r.description}</td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">{r.attribute}</td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">{r.operator}</td>
              <td className="px-3 py-2 font-mono text-xs text-text-secondary">{r.threshold}</td>
              <td className="px-3 py-2">
                {r.mandatory ? (
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">Mandatory</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Optional</span>
                )}
              </td>
              <td className="px-3 py-2">
                {r.passed ? (
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">Passed</span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">Failed</span>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-text-primary">{r.beneficiaryValue || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
