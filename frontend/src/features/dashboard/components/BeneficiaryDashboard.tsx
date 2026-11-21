import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { useAuth } from '../../../contexts/AuthContext';
import { getStats, getAllApplications } from '../../../services/demo-data.service';
import { getApplicationsForRole } from '../../applications/services/application.service';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { StatCard } from './StatCard';
import { ApplicationStatusChart } from './ApplicationStatusChart';
import { RecentActivityList } from './RecentActivityList';
import { PendingWorkQueue } from './PendingWorkQueue';

const TERMINAL_STATUSES = ['APPROVED', 'REJECTED', 'CLOSED', 'TERMINATED'] as const;
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export function BeneficiaryDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = getStats();
  const allApps = getAllApplications();
  const roleApps = getApplicationsForRole(allApps, user);

  const activeApps = roleApps.filter(
    (a) => !TERMINAL_STATUSES.includes(a.status as TerminalStatus),
  );
  const approvedCount = roleApps.filter((a) => a.status === 'APPROVED').length;
  const rejectedCount = roleApps.filter((a) => a.status === 'REJECTED').length;

  // Status chart filtered to this beneficiary's applications
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
    { key: 'schemeName', header: 'Scheme' },
    { key: 'submissionDate', header: 'Submitted' },
    { key: 'status', header: 'Status' },
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
          title="My Applications"
          value={roleApps.length}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Active"
          value={activeApps.length}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Approved"
          value={approvedCount}
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

      {/* Charts row — only status chart; regional chart omitted for beneficiary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gov-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-text-primary">
              My Applications by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationStatusChart data={myStatusData} />
          </CardContent>
        </Card>

        {/* Spacer — no regional chart for beneficiary role */}
        <div />
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

      {/* Pending work queue */}
      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-text-primary">
            My Active Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PendingWorkQueue
            columns={columns}
            rows={activeApps as unknown as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
