import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDate } from '../../../lib/demo-format';
import { demoDataService, isApplicationVisibleToRole, type WorkflowStage } from '../../../services/demo-data.service';

const stages: WorkflowStage[] = ['SUBMITTED', 'FIELD_PENDING', 'DISTRICT_REVIEW', 'SECOND_REVIEW', 'FINANCE_REVIEW', 'BUDGET_HOLD', 'APPROVED', 'REJECTED', 'CLOSED', 'TERMINATED'];
const pageSize = 20;
type SortKey = 'submittedAt' | 'requestedAmount';

export default function ApplicationListPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<'ALL' | WorkflowStage>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('submittedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ['demo-applications-list', user?.id],
    queryFn: async () => {
      const [applications, beneficiaries, schemes, linked] = await Promise.all([
        demoDataService.listApplications(),
        demoDataService.listBeneficiaries(),
        demoDataService.listSchemes(),
        user?.role === 'BENEFICIARY' ? demoDataService.getBeneficiaryForUser(user) : Promise.resolve(undefined),
      ]);
      return { applications, beneficiaries, schemes, linked };
    },
    enabled: !!user,
  });
  const dateError = Boolean(from && to && from > to);
  const rows = useMemo(() => {
    const data = query.data;
    if (!user || !data) return [];
    return data.applications
      .filter((application) => isApplicationVisibleToRole(application, user, data.linked?.id))
      .filter((application) => stage === 'ALL' || application.workflowStage === stage)
      .filter((application) => !dateError && (!from || application.submittedAt.slice(0, 10) >= from) && (!to || application.submittedAt.slice(0, 10) <= to))
      .sort((a, b) => {
        const left = sortKey === 'submittedAt' ? Date.parse(a.submittedAt) : a.requestedAmount;
        const right = sortKey === 'submittedAt' ? Date.parse(b.submittedAt) : b.requestedAmount;
        return (left - right) * (sortDirection === 'asc' ? 1 : -1);
      });
  }, [query.data, user, stage, from, to, dateError, sortKey, sortDirection]);
  const visible = rows.slice(page * pageSize, (page + 1) * pageSize);
  const schemeName = (id: string) => query.data?.schemes.find((scheme) => scheme.id === id)?.name ?? '—';
  const beneficiaryName = (id: string) => query.data?.beneficiaries.find((beneficiary) => beneficiary.id === id)?.fullName ?? '—';
  const toggleSort = (key: SortKey) => {
    setSortDirection(sortKey === key ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc');
    setSortKey(key);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title="Applications" description="Monitor applications in your role-scoped work queue." />
      <Card className="border-gov-border"><CardContent className="pt-6">
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">Workflow stage
            <select aria-label="Filter by workflow stage" className="h-9 rounded-md border border-input bg-background px-3" value={stage} onChange={(event) => { setStage(event.target.value as 'ALL' | WorkflowStage); setPage(0); }}>
              <option value="ALL">All Stages</option>{stages.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">From
            <input aria-label="From date" type="date" className="h-9 rounded-md border border-input px-3" value={from} onChange={(event) => { setFrom(event.target.value); setPage(0); }} />
          </label>
          <label className="flex flex-col gap-1 text-sm">To
            <input aria-label="To date" type="date" className="h-9 rounded-md border border-input px-3" value={to} onChange={(event) => { setTo(event.target.value); setPage(0); }} />
          </label>
          {dateError && <p role="alert" className="text-sm text-red-700">From date must be on or before the to date.</p>}
        </div>
        <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!dateError && rows.length === 0} onRetry={() => void query.refetch()} emptyMessage="No applications match your filters." skeletonRows={5}>
          {dateError ? null : !user ? <PermissionDeniedState /> : (
            <>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-text-secondary"><tr>
                  <th className="p-3">Reference Number</th><th className="p-3">Beneficiary Name</th><th className="p-3">Scheme Name</th>
                  <th className="p-3"><button type="button" className="font-semibold" onClick={() => toggleSort('requestedAmount')}>Requested Amount {sortKey === 'requestedAmount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th>
                  <th className="p-3">Current Status</th><th className="p-3"><button type="button" className="font-semibold" onClick={() => toggleSort('submittedAt')}>Submission Date {sortKey === 'submittedAt' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</button></th>
                </tr></thead>
                <tbody>{visible.map((application) => <tr key={application.id} className="border-b last:border-0">
                  <td className="p-3"><Link className="text-blue-700 hover:underline" to={`/applications/${application.id}`}>{application.referenceNo}</Link></td>
                  <td className="p-3">{beneficiaryName(application.beneficiaryId)}</td><td className="p-3">{schemeName(application.schemeId)}</td>
                  <td className="p-3">{formatCurrency(application.requestedAmount, 2)}</td><td className="p-3"><StatusBadge status={application.status} /></td><td className="p-3">{formatDate(application.submittedAt)}</td>
                </tr>)}</tbody>
              </table></div>
              <div className="mt-4 flex items-center justify-between text-sm"><span>Page {page + 1} of {Math.max(1, Math.ceil(rows.length / pageSize))}</span>
                <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} aria-label="Previous page" onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= rows.length} aria-label="Next page" onClick={() => setPage((value) => value + 1)}>Next</Button></div>
              </div>
            </>
          )}
        </QueryState>
      </CardContent></Card>
    </div>
  );
}
