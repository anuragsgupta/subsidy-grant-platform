import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useAssessmentsQuery } from '../hooks/useEligibility';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { AssessmentDecisionBadge } from '../components/AssessmentDecisionBadge';
import type { AssessmentDecision } from '../../../services/workflow-demo-data.service';

const PAGE_SIZE = 20;

const DECISION_OPTIONS: Array<{ value: AssessmentDecision | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Decisions' },
  { value: 'ELIGIBLE', label: 'Eligible' },
  { value: 'INELIGIBLE', label: 'Ineligible' },
  { value: 'REQUIRES_MANUAL_REVIEW', label: 'Manual Review' },
  { value: 'INCOMPLETE_INFORMATION', label: 'Incomplete' },
];

export default function EligibilityListPage() {
  const { user } = useAuth();
  const [decisionFilter, setDecisionFilter] = useState<AssessmentDecision | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  if (user?.role !== 'ADMIN' && user?.role !== 'DISTRICT_OFFICER') {
    return <PermissionDeniedState />;
  }

  const query = useAssessmentsQuery();
  const all = query.data ?? [];

  const filtered = decisionFilter === 'ALL' ? all : all.filter((a) => a.decision === decisionFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  function handleFilterChange(value: AssessmentDecision | 'ALL') {
    setDecisionFilter(value);
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Eligibility Assessments</h1>
          <p className="mt-1 text-text-secondary">View eligibility assessment results across all applications.</p>
        </div>
        <DemoBadge />
      </div>

      <div className="bg-white border border-gov-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <select
            value={decisionFilter}
            onChange={(e) => handleFilterChange(e.target.value as AssessmentDecision | 'ALL')}
            className="rounded-md border border-gov-border bg-white py-2 pl-3 pr-8 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            aria-label="Filter by decision"
          >
            {DECISION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-sm text-text-secondary">{filtered.length} assessment(s) found</p>
        </div>

        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={paged.length === 0}
          onRetry={() => query.refetch()}
          emptyMessage="No assessments match the current filter."
          skeletonRows={8}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gov-border bg-[#F4F7FA]">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Application Ref</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Scheme</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Beneficiary</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Decision</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Assessed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border/60">
                {paged.map((a) => (
                  <tr key={a.id} className="hover:bg-gov-blue/5">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link to={`/eligibility/applications/${a.applicationId}`} className="text-gov-blue hover:underline">{a.applicationRef}</Link>
                    </td>
                    <td className="px-3 py-2 text-text-primary">{a.schemeName}</td>
                    <td className="px-3 py-2 text-text-primary">{a.beneficiaryName}</td>
                    <td className="px-3 py-2"><AssessmentDecisionBadge decision={a.decision} /></td>
                    <td className="px-3 py-2 text-text-secondary tabular-nums">{a.assessedAt.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <p className="text-sm text-text-secondary">Page {safePage + 1} of {totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="rounded-md border border-gov-border px-3 py-1 text-sm disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="rounded-md border border-gov-border px-3 py-1 text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
}
