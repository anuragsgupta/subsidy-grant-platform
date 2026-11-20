import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { maskIdentity } from '../../../lib/demo-format';
import { demoDataService, type BeneficiaryStatus } from '../../../services/demo-data.service';
import { useAuth } from '../../../contexts/AuthContext';

const pageSize = 20;
const allowedRoles = ['ADMIN', 'DISTRICT_OFFICER', 'FINANCE_APPROVER', 'FIELD_OFFICER'];

export default function BeneficiaryListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | BeneficiaryStatus>('ALL');
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ['demo-beneficiaries'], queryFn: demoDataService.listBeneficiaries });
  const filtered = useMemo(() => (query.data ?? []).filter((item) =>
    `${item.fullName} ${item.referenceId}`.toLowerCase().includes(search.toLowerCase())
    && (status === 'ALL' || item.status === status)), [query.data, search, status]);
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title="Beneficiaries" description="Find registered beneficiary profiles." />
      <Card className="border-gov-border"><CardContent className="pt-6">
        {!user || !allowedRoles.includes(user.role) ? <PermissionDeniedState /> : (
          <>
            <div className="mb-5 flex flex-wrap gap-3">
              <Input aria-label="Search beneficiaries" placeholder="Search name or reference ID" className="max-w-sm" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
              <label className="flex items-center gap-2 text-sm text-text-secondary">Status
                <select aria-label="Filter beneficiaries by status" className="h-9 rounded-md border border-input bg-background px-3 text-text-primary" value={status} onChange={(event) => { setStatus(event.target.value as 'ALL' | BeneficiaryStatus); setPage(0); }}>
                  <option value="ALL">All</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="PENDING">PENDING</option>
                </select>
              </label>
            </div>
            <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={filtered.length === 0} onRetry={() => void query.refetch()} emptyMessage="No beneficiaries match your filters." skeletonRows={5}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase text-text-secondary"><tr>
                    <th className="p-3">Reference ID</th><th className="p-3">Full Name</th><th className="p-3">Beneficiary Type</th>
                    <th className="p-3">Region</th><th className="p-3">National ID</th><th className="p-3">SSN</th><th className="p-3">Status</th>
                  </tr></thead>
                  <tbody>{visible.map((beneficiary) => <tr key={beneficiary.id} className="border-b last:border-0">
                    <td className="p-3"><Link className="text-blue-700 hover:underline" to={`/admin/beneficiaries/${beneficiary.id}`}>{beneficiary.referenceId}</Link></td>
                    <td className="p-3">{beneficiary.fullName}</td><td className="p-3">{beneficiary.type}</td><td className="p-3">{beneficiary.regionName}</td>
                    <td className="p-3">{maskIdentity(beneficiary.nationalId)}</td><td className="p-3">{maskIdentity(beneficiary.ssn)}</td><td className="p-3"><StatusBadge status={beneficiary.status} /></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / pageSize))}</span>
                <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} aria-label="Previous page" onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= filtered.length} aria-label="Next page" onClick={() => setPage((value) => value + 1)}>Next</Button></div>
              </div>
            </QueryState>
          </>
        )}
      </CardContent></Card>
    </div>
  );
}
