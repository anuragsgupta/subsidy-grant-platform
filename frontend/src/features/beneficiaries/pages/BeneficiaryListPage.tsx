import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { QueryState } from '../../../components/states/QueryState';
import { beneficiaryService } from '../services/beneficiary.service';

export default function BeneficiaryListPage() {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['beneficiaries'], queryFn: () => beneficiaryService.list() });
  const rows = useMemo(() => (query.data?.content ?? []).filter((item) =>
    `${item.fullName} ${item.identityReference} ${item.regionCode ?? ''}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Registry</p><h1 className="mt-1 text-3xl font-semibold">Beneficiaries</h1><p className="mt-2 text-sm text-slate-600">Search profiles and maintain grant applicant records.</p></div>
      <Button asChild><Link to="/admin/beneficiaries/new">Register beneficiary</Link></Button>
    </header>
    <div className="max-w-md"><label htmlFor="beneficiary-search" className="mb-1 block text-sm font-medium">Search name, identity reference, or region</label><Input id="beneficiary-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search beneficiaries" /></div>
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={rows.length === 0} onRetry={() => void query.refetch()} emptyMessage={search ? 'No matching beneficiaries.' : 'No beneficiaries have been registered yet.'}>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Name</th><th className="p-4">Identity reference</th><th className="p-4">Type</th><th className="p-4">Region</th><th className="p-4"> </th></tr></thead><tbody className="divide-y">{rows.map((person) => <tr key={person.id} className="hover:bg-slate-50"><td className="p-4 font-medium">{person.fullName}</td><td className="p-4">{person.identityReference}</td><td className="p-4">{person.beneficiaryType}</td><td className="p-4">{person.regionCode || '—'}</td><td className="p-4 text-right"><Button asChild variant="outline" size="sm"><Link to={`/admin/beneficiaries/${person.id}`}>View / edit</Link></Button></td></tr>)}</tbody></table></div></div>
    </QueryState>
  </main>;
}
