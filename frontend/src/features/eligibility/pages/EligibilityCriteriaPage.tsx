import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCriteriaQuery } from '../hooks/useEligibility';
import { QueryState } from '../../../components/states/QueryState';
import { DemoBadge } from '../../../components/common/DemoBadge';

export default function EligibilityCriteriaPage() {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { data: criteria, isLoading, isError, error, refetch } = useCriteriaQuery(schemeId ?? '');

  return (
    <div className="space-y-6 p-6">
      <Link to="/eligibility" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-gov-blue">
        <ArrowLeft size={14} /> Back to Assessments
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">Eligibility Criteria</h1>
        <DemoBadge />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(criteria ?? []).length === 0}
        onRetry={() => refetch()}
        emptyMessage="No eligibility criteria defined for this scheme."
        skeletonRows={5}
      >
        <div className="rounded-lg border border-gov-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gov-border bg-[#F4F7FA]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Attribute</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Operator</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Threshold</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Weight</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Mandatory</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gov-border/60">
              {(criteria ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-gov-blue/5">
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{c.attribute}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{c.operator}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{c.threshold}</td>
                  <td className="px-4 py-3 text-text-primary">{c.weight}</td>
                  <td className="px-4 py-3">
                    {c.mandatory ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">Mandatory</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">Optional</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
    </div>
  );
}
