import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from 'recharts';
import { useRegionsQuery } from '../../../features/regions/hooks/useRegions';
import { LoadingSkeleton } from '../../../components/states/LoadingSkeleton';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';

interface RegionalDistributionChartProps {
  regionData: { regionId: number; count: number }[];
}

export function RegionalDistributionChart({ regionData }: RegionalDistributionChartProps) {
  const { data: regions, isLoading, isError, refetch } = useRegionsQuery();

  if (isLoading) {
    return <LoadingSkeleton rows={1} />;
  }

  if (isError) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  if (!regions || regions.length === 0) {
    return <EmptyState message="No regions configured" />;
  }

  const chartData = regionData.map((d) => ({
    name: regions.find((r) => r.id === d.regionId)?.name ?? String(d.regionId),
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#1769AA" />
      </BarChart>
    </ResponsiveContainer>
  );
}
