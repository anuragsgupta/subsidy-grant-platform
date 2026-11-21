import React from 'react';
import { Banknote, Clock, PauseCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { useAuth } from '../../../contexts/AuthContext';
import { getStats, getAllApplications, type DemoApplication } from '../../../services/demo-data.service';
import { getApplicationsForRole } from '../../applications/services/application.service';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { StatCard } from './StatCard';
import { ApplicationStatusChart } from './ApplicationStatusChart';
import { RegionalDistributionChart } from './RegionalDistributionChart';
import { RecentActivityList } from './RecentActivityList';
import { PendingWorkQueue } from './PendingWorkQueue';

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function FinanceApproverDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = getStats();
  const allApps = getAllApplications();
  const roleApps = getApplicationsForRole(allApps, user);

  const financeReviewCount = roleApps.filter((a) => a.status === 'FINANCE_REVIEW').length;
  const budgetHoldCount = roleApps.filter((a) => a.status === 'BUDGET_HOLD').length;
  const totalRequestedForRole = roleApps.reduce((sum, a) => sum + a.requestedAmount, 0);

  // Status chart for finance queue
  const statusCountMap = new Map<string, number>();
  for (const app of roleApps) {
    statusCountMap.set(app.status, (statusCountMap.get(app.status) ?? 0) + 1);
  }
  const myStatusData = Array.from(statusCountMap.entries()).map(([status, count]) => ({
    status: status as Parameters<typeof ApplicationStatusChart>[0]['data'][number]['status'],
    count,
  }));

  const renderAmount = (row: Record<string, unknown>): React.ReactNode => {
    const amount = (row as unknown as DemoApplication).requestedAmount;
    return (
      <span className="font-medium tabular-nums text-text-primary">
        {formatINR(amount)}
      </span>
    );
  };

  const columns = [
    { key: 'referenceNumber', header: 'Ref #' },
    { key: 'beneficiaryName', header: 'Beneficiary' },
    { key: 'schemeName', header: 'Scheme' },
    { key: 'requestedAmount', header: 'Amount', render: renderAmount },
    { key: 'status', header: 'Stage' },
  ];

  return (
    <div className="space-y-6">
      {/* Demo badge */}
      <div>
        <DemoBadge />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Finance Queue"
          value={roleApps.length}
          icon={Banknote}
          variant="default"
        />
        <StatCard
          title="Finance Review"
          value={financeReviewCount}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Budget Hold"
          value={budgetHoldCount}
          icon={PauseCircle}
          variant="warning"
        />
        <StatCard
          title="Total Requested"
          value={formatINR(totalRequestedForRole)}
          icon={DollarSign}
          variant="success"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gov-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-text-primary">
              Finance Queue by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationStatusChart data={myStatusData} />
          </CardContent>
        </Card>

        <Card className="border-gov-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-text-primary">
              Regional Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RegionalDistributionChart regionData={stats.applicationsByRegionId} />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-text-primary">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-6 pb-4">
          <RecentActivityList events={stats.recentActivity} />
        </CardContent>
      </Card>

      {/* Work queue */}
      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-text-primary">
            Finance Approval Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PendingWorkQueue
            columns={columns}
            rows={roleApps as unknown as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
