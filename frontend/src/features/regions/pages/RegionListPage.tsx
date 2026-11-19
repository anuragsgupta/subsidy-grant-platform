import { useState } from 'react';
import { useRegionsQuery } from '../hooks/useRegions';
import { RegionTree } from '../components/RegionTree';
import { QueryState } from '../../../components/states/QueryState';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { RegionType } from '../types/region.types';

type RegionFilter = 'ALL' | RegionType;

export default function RegionListPage() {
  const [filter, setFilter] = useState<RegionFilter>('ALL');
  const params = filter === 'ALL' ? undefined : { type: filter };
  const query = useRegionsQuery(params);
  const regions = query.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Regions</h1>
        <p className="text-text-secondary mt-1">
          Browse administrative regions and their hierarchy.
        </p>
      </div>

      <Card className="border-gov-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg text-text-primary">Region hierarchy</CardTitle>
          <div className="w-44">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as RegionFilter)}
              aria-label="Filter by region type"
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="STATE">State</SelectItem>
                <SelectItem value="DISTRICT">District</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={regions.length === 0}
            onRetry={() => query.refetch()}
            emptyMessage="No regions found."
            skeletonRows={6}
          >
            <RegionTree regions={regions} flat={filter === 'DISTRICT'} />
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}
