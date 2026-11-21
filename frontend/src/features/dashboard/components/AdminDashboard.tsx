import { FileText, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
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

const TERMINAL_STATUSES = ['APPROVED', 'REJECTED', 'CLOSED', 'TERMINATED'] as const;
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function AdminDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const stats = getStats();
  const allApps = getAllApplications();
  const roleApps = getApplicationsForRole(allApps, user);

  const pendingQueue = roleApps.filter(
    (a) => !TERMINAL_STATUSES.includes(a.status as TerminalStatus),
  );

  const columns = [
    { key: 'referenceNumber', header: 'Ref #' },
    { key: 'beneficiaryName', header: 'Beneficiary' },
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
          title="Total Applications"
          value={stats.totalApplications}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Pending"
          value={stats.pendingApplications}
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Approved"
          value={stats.approvedApplications}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Rejected"
          value={stats.rejectedApplications}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Total requested amount – full-width highlight */}
      <Card className="border-gov-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Total Requested Amount
          </CardTitle>
          <div className="rounded-lg p-2 bg-teal-50 text-teal-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-text-primary">
            {formatINR(stats.totalRequestedAmount)}
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-gov-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-text-primary">
              Applications by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApplicationStatusChart data={stats.applicationsByStatus} />
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

      {/* Pending work queue */}
      <Card className="border-gov-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-text-primary">
            All Pending Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PendingWorkQueue
            columns={columns}
            rows={pendingQueue as unknown as Record<string, unknown>[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
