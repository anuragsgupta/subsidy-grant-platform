import { ClipboardList, Clock, CheckCircle, XCircle } from 'lucide-react';
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

export function FieldOfficerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = getStats();
  const allApps = getAllApplications();
  const roleApps = getApplicationsForRole(allApps, user);

  const fieldPendingCount = roleApps.filter((a) => a.status === 'FIELD_PENDING').length;
  const completedCount = roleApps.filter((a) =>
    ['DISTRICT_REVIEW', 'SECOND_REVIEW', 'FINANCE_REVIEW', 'BUDGET_HOLD', 'APPROVED', 'REJECTED', 'CLOSED'].includes(a.status),
  ).length;
  const rejectedCount = roleApps.filter((a) => a.status === 'REJECTED').length;

  // Status chart for officer's assigned apps
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
    { key: 'submissionDate', header: 'Assigned Date' },
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
          title="Assigned to Me"
          value={roleApps.length}
          icon={ClipboardList}
          variant="default"
        />
        <StatCard
          title="Field Pending"
          value={fieldPendingCount}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Forwarded"
          value={completedCount}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gov-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-text-primary">
              My Assignments by Status
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
            My Field Assignments
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
