import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useVerificationTasksQuery } from '../hooks/useVerification';
import { getTasksForRole } from '../services/verification.service';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { Badge } from '../../../components/ui/badge';
import type { WorkflowStage } from '../../../services/workflow-demo-data.service';

const PAGE_SIZE = 20;

const WORKFLOW_STAGES: WorkflowStage[] = [
  'SUBMITTED', 'FIELD_PENDING', 'DISTRICT_REVIEW', 'SECOND_REVIEW',
  'FINANCE_REVIEW', 'BUDGET_HOLD', 'APPROVED', 'REJECTED', 'CLOSED', 'TERMINATED',
];

const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', FIELD_PENDING: 'Field Pending', DISTRICT_REVIEW: 'District Review',
  SECOND_REVIEW: 'Second Review', FINANCE_REVIEW: 'Finance Review', BUDGET_HOLD: 'Budget Hold',
  APPROVED: 'Approved', REJECTED: 'Rejected', CLOSED: 'Closed', TERMINATED: 'Terminated',
};

const STAGE_COLOURS: Record<string, string> = {
  SUBMITTED: 'border-blue-300 bg-blue-50 text-blue-700',
  FIELD_PENDING: 'border-amber-300 bg-amber-50 text-amber-700',
  DISTRICT_REVIEW: 'border-amber-400 bg-amber-50 text-amber-800',
  SECOND_REVIEW: 'border-orange-300 bg-orange-50 text-orange-700',
  FINANCE_REVIEW: 'border-purple-300 bg-purple-50 text-purple-700',
  BUDGET_HOLD: 'border-orange-400 bg-orange-50 text-orange-800',
  APPROVED: 'border-green-300 bg-green-50 text-green-700',
  REJECTED: 'border-red-300 bg-red-50 text-red-700',
  CLOSED: 'border-gray-300 bg-gray-50 text-gray-600',
  TERMINATED: 'border-gray-400 bg-gray-100 text-gray-700',
};

function StageBadge({ stage }: { stage: WorkflowStage }) {
  return <Badge variant="outline" className={STAGE_COLOURS[stage] ?? ''}>{STAGE_LABELS[stage] ?? stage}</Badge>;
}

export default function VerificationQueuePage() {
  const { user } = useAuth();
  const [stageFilter, setStageFilter] = useState<WorkflowStage | 'ALL'>('ALL');
  const [page, setPage] = useState(0);

  if (user?.role !== 'ADMIN' && user?.role !== 'FIELD_OFFICER' && user?.role !== 'DISTRICT_OFFICER') {
    return <PermissionDeniedState />;
  }

  const query = useVerificationTasksQuery();
  const allTasks = query.data ?? [];

  const roleScoped = user ? getTasksForRole(allTasks, user) : allTasks;
  const filtered = stageFilter === 'ALL' ? roleScoped : roleScoped.filter((t) => t.currentStage === stageFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Verification Tasks</h1>
          <p className="mt-1 text-text-secondary">Work through assigned verification tasks in order.</p>
        </div>
        <DemoBadge />
      </div>

      <div className="bg-white border border-gov-border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value as WorkflowStage | 'ALL'); setPage(0); }}
            className="rounded-md border border-gov-border bg-white py-2 pl-3 pr-8 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
            aria-label="Filter by stage"
          >
            <option value="ALL">All Stages</option>
            {WORKFLOW_STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
          <p className="text-sm text-text-secondary">{filtered.length} task(s) found</p>
        </div>

        <QueryState
          isLoading={query.isLoading}
          isError={query.isError}
          error={query.error}
          isEmpty={paged.length === 0}
          onRetry={() => query.refetch()}
          emptyMessage="No verification tasks match the current filter."
          skeletonRows={8}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gov-border bg-[#F4F7FA]">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Application Ref</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Beneficiary</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Scheme</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Stage</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border/60">
                {paged.map((t) => (
                  <tr key={t.id} className="hover:bg-gov-blue/5">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link to={`/verification/${t.id}`} className="text-gov-blue hover:underline">{t.applicationRef}</Link>
                    </td>
                    <td className="px-3 py-2 text-text-primary">{t.beneficiaryName}</td>
                    <td className="px-3 py-2 text-text-secondary">{t.schemeName}</td>
                    <td className="px-3 py-2"><StageBadge stage={t.currentStage} /></td>
                    <td className="px-3 py-2 text-text-secondary tabular-nums">{t.submissionDate}</td>
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
