import { Inbox, Search, RotateCcw, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { useAuth } from '../../../contexts/AuthContext';
import { getStats, getAllApplications } from '../../../services/demo-data.service';
import { getApplicationsForRole } from '../../applications/services/application.service';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { StatCard } from './StatCard';
import { ApplicationStatusChart } from './ApplicationStatusChart';
import { RegionalDistributionChart } from './RegionalDistributionChart';
import { RecentActivityList } from './RecentActivityList';
import { PendingWorkQueue } from './PendingWorkQueue';

export function DistrictOfficerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = getStats();
  const allApps = getAllApplications();
  const roleApps = getApplicationsForRole(allApps, user);

  const districtReviewCount = roleApps.filter((a) => a.status === 'DISTRICT_REVIEW').length;
  const secondReviewCount = roleApps.filter((a) => a.status === 'SECOND_REVIEW').length;
  const approvedCount = roleApps.filter((a) => a.status === 'APPROVED').length;

  // Status chart for district queue
  const statusCountMap = new Map<string, number>();
  for (const app of roleApps) {
    statusCountMap.set(app.status, (statusCountMap.get(app.status) ?? 0) + 1);
  }
  const myStatusData = Array.from(statusCountMap.entries()).map(([status, count]) => ({
    status: status as Parameters<typeof ApplicationStatusChart>[0]['data'][number]['status'],
    count,
  }));

  const columns = [
    { key: 'referenceNumber', header: 'Ref #' },
    { key: 'beneficiaryName', header: 'Beneficiary' },
    { key: 'status', header: 'Stage' },
    { key: 'submissionDate', header: 'Submitted' },
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
          title="District Queue"
          value={roleApps.length}
          icon={Inbox}
          variant="default"
        />
        <StatCard
          title="District Review"
          value={districtReviewCount}
          icon={Search}
          variant="warning"
        />
        <StatCard
          title="Second Review"
          value={secondReviewCount}
          icon={RotateCcw}
          variant="warning"
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gov-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-text-primary">
              District Queue by Status
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
            District Review Queue
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
