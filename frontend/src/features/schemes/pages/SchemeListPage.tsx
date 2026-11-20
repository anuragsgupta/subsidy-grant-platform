import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { QueryState } from '../../../components/states/QueryState';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDate } from '../../../lib/demo-format';
import { demoDataService, type SchemeStatus } from '../../../services/demo-data.service';

const pageSize = 20;

export default function SchemeListPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | SchemeStatus>('ALL');
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ['demo-schemes'], queryFn: demoDataService.listSchemes });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const schemes = useMemo(() => (query.data ?? []).filter((scheme) => {
    const matchesText = `${scheme.name} ${scheme.code}`.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesText && (status === 'ALL' || scheme.status === status);
  }), [query.data, debouncedSearch, status]);
  const visible = schemes.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title="Subsidy schemes" description="Browse programmes and grant eligibility details." />
      <Card className="border-gov-border">
        <CardContent className="pt-6">
          <div className="mb-5 flex flex-wrap gap-3">
            <Input
              aria-label="Search schemes"
              placeholder="Search by name or scheme code"
              className="max-w-sm"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              Status
              <select
                aria-label="Filter schemes by status"
                className="h-9 rounded-md border border-input bg-background px-3 text-text-primary"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as 'ALL' | SchemeStatus);
                  setPage(0);
                }}
              >
                <option value="ALL">All</option>
                <option value="DRAFT">DRAFT</option>
                <option value="OPEN">OPEN</option>
                <option value="PAUSED">PAUSED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </label>
          </div>
          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={schemes.length === 0}
            onRetry={() => void query.refetch()}
            emptyMessage="No schemes match your filters."
            skeletonRows={5}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-text-secondary">
                  <tr>
                    <th className="p-3">Scheme Code</th><th className="p-3">Name</th>
                    <th className="p-3">Status</th><th className="p-3">Grant Amount Range</th>
                    <th className="p-3">Application Period</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((scheme) => (
                    <tr key={scheme.id} className="border-b last:border-0">
                      <td className="p-3 font-medium"><Link className="text-blue-700 hover:underline" to={`/schemes/${scheme.id}`}>{scheme.code}</Link></td>
                      <td className="p-3"><Link className="hover:underline" to={`/schemes/${scheme.id}`}>{scheme.name}</Link></td>
                      <td className="p-3"><StatusBadge status={scheme.status} /></td>
                      <td className="p-3">{formatCurrency(scheme.minGrantAmount)} – {formatCurrency(scheme.maxGrantAmount)}</td>
                      <td className="p-3">{formatDate(scheme.startDate)} – {formatDate(scheme.endDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span>Page {page + 1} of {Math.max(1, Math.ceil(schemes.length / pageSize))}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                <Button variant="outline" size="sm" aria-label="Next page" disabled={(page + 1) * pageSize >= schemes.length} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </div>
            </div>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
