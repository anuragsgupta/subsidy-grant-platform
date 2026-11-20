import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { QueryState } from '../../../components/states/QueryState';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDate } from '../../../lib/demo-format';
import { demoDataService } from '../../../services/demo-data.service';

export default function SchemeDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const query = useQuery({ queryKey: ['demo-scheme', id], queryFn: () => demoDataService.getScheme(id) });
  const scheme = query.data;

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title={scheme?.name ?? 'Scheme details'} description="Programme information and eligibility criteria.">
        {user?.role === 'ADMIN' && <Button variant="outline" disabled title="Coming soon">Edit — Coming soon</Button>}
      </DemoPageHeader>
      <Card className="border-gov-border">
        <CardHeader><CardTitle className="text-lg">Scheme overview</CardTitle></CardHeader>
        <CardContent>
          <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!query.isLoading && !query.isError && !scheme} onRetry={() => void query.refetch()} emptyMessage="Scheme not found.">
            {scheme && (
              <div className="space-y-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div><dt className="text-sm text-text-secondary">Scheme Code</dt><dd className="font-medium">{scheme.code}</dd></div>
                  <div><dt className="text-sm text-text-secondary">Status</dt><dd><StatusBadge status={scheme.status} /></dd></div>
                  <div><dt className="text-sm text-text-secondary">Grant Amount Range</dt><dd>{formatCurrency(scheme.minGrantAmount)} – {formatCurrency(scheme.maxGrantAmount)}</dd></div>
                  <div><dt className="text-sm text-text-secondary">Application Period</dt><dd>{formatDate(scheme.startDate)} – {formatDate(scheme.endDate)}</dd></div>
                </dl>
                <div><h2 className="font-semibold">Description</h2><p className="mt-1 text-text-secondary">{scheme.description}</p></div>
                <section>
                  <h2 className="mb-3 font-semibold">Eligibility criteria</h2>
                  <ul className="space-y-3">
                    {scheme.criteria.map((criterion, index) => (
                      <li key={`${criterion.attribute}-${index}`} className="rounded-md border p-3">
                        <p className="font-medium">{criterion.attribute}</p>
                        <p className="text-sm text-text-secondary">{criterion.operator} {String(criterion.threshold)}</p>
                        <p className="text-sm">{criterion.mandatory ? 'Mandatory' : 'Optional'}{criterion.description ? ` — ${criterion.description}` : ''}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </QueryState>
          {!query.isLoading && !query.isError && !scheme && <Link className="mt-4 inline-block text-sm text-blue-700 hover:underline" to="/schemes">Back to schemes</Link>}
        </CardContent>
      </Card>
    </div>
  );
}
