import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { QueryState } from '../../../components/states/QueryState';
import { schemeService } from '../services/scheme.service';

export default function SchemeListPage() {
  const query = useQuery({ queryKey: ['schemes'], queryFn: () => schemeService.list() });
  const schemes = query.data?.content ?? [];
  return <main className="mx-auto w-full max-w-6xl space-y-6 p-6"><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Programme catalogue</p><h1 className="mt-1 text-3xl font-semibold">Grant schemes</h1><p className="mt-2 text-sm text-slate-600">Review scheme availability, grant ranges, and published rules.</p></header>
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={schemes.length === 0} onRetry={() => void query.refetch()} emptyMessage="No schemes are available.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{schemes.map((scheme) => <article key={scheme.id} className="flex flex-col rounded-xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-wider text-slate-500">{scheme.code}</p><h2 className="mt-1 text-lg font-semibold">{scheme.name}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scheme.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{scheme.status}</span></div><p className="mt-4 text-sm text-slate-600">{scheme.description || 'No description provided.'}</p><div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm"><div><p className="text-xs text-slate-500">Minimum grant</p><p className="font-semibold">₹{scheme.minGrantAmount.toLocaleString()}</p></div><div><p className="text-xs text-slate-500">Maximum grant</p><p className="font-semibold">₹{scheme.maxGrantAmount.toLocaleString()}</p></div></div><Button asChild variant="outline" className="mt-5"><Link to={`/schemes/${scheme.id}`}>View scheme details</Link></Button></article>)}</div>
    </QueryState>
  </main>;
}
