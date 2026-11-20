import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { ErrorState } from '../../../components/states/ErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { formatCurrency, formatDate, formatDateTime } from '../../../lib/demo-format';
import { demoDataService } from '../../../services/demo-data.service';
import { useRegionsQuery } from '../../regions/hooks/useRegions';
import type { DemoApplication, WorkflowStage } from '../../../services/demo-data.service';

const terminalStages: WorkflowStage[] = ['APPROVED', 'REJECTED', 'CLOSED', 'TERMINATED'];
const pendingStages: WorkflowStage[] = ['SUBMITTED', 'FIELD_PENDING', 'DISTRICT_REVIEW', 'SECOND_REVIEW', 'FINANCE_REVIEW', 'BUDGET_HOLD'];
const chartColors = ['#1d4ed8', '#0891b2', '#7c3aed', '#d97706', '#059669', '#dc2626', '#64748b', '#a855f7', '#ea580c', '#475569'];
const noApplications: DemoApplication[] = [];

export default function DashboardPage() {
  const { user } = useAuth();
  const dataQuery = useQuery({
    queryKey: ['demo-dashboard', user?.id],
    queryFn: async () => {
      const [applications, beneficiaries, schemes, linked] = await Promise.all([
        demoDataService.listApplications(),
        demoDataService.listBeneficiaries(),
        demoDataService.listSchemes(),
        user?.role === 'BENEFICIARY' ? demoDataService.getBeneficiaryForUser(user) : Promise.resolve(undefined),
      ]);
      return { applications, beneficiaries, schemes, linked };
    },
    enabled: !!user,
  });
  const activityQuery = useQuery({ queryKey: ['demo-dashboard-activity'], queryFn: demoDataService.getActivity, enabled: !!user });
  const regionsQuery = useRegionsQuery();
  const data = dataQuery.data;
  const applications = data?.applications ?? noApplications;
  const stats = [
    { label: 'Total applications', value: applications.length.toLocaleString('en-IN') },
    { label: 'Pending applications', value: applications.filter((item) => pendingStages.includes(item.workflowStage)).length.toLocaleString('en-IN') },
    { label: 'Approved applications', value: applications.filter((item) => item.workflowStage === 'APPROVED').length.toLocaleString('en-IN') },
    { label: 'Rejected applications', value: applications.filter((item) => item.workflowStage === 'REJECTED').length.toLocaleString('en-IN') },
    { label: 'Total requested subsidy', value: formatCurrency(applications.reduce((sum, item) => sum + item.requestedAmount, 0)) },
  ];
  const statusData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const application of applications) counts.set(application.workflowStage, (counts.get(application.workflowStage) ?? 0) + 1);
    return [...counts].map(([status, count]) => ({ status: status.split('_').join(' '), count }));
  }, [applications]);
  const regionData = (regionsQuery.data ?? []).map((region) => ({
    name: region.name,
    count: applications.filter((application) => application.regionId === region.id).length,
  }));
  const role = user?.role;
  const queue = applications.filter((application) => {
    if (!user || !data) return false;
    switch (role) {
      case 'ADMIN': return pendingStages.includes(application.workflowStage);
      case 'BENEFICIARY': return application.beneficiaryId === data.linked?.id && !terminalStages.includes(application.workflowStage);
      case 'FIELD_OFFICER': return application.workflowStage === 'FIELD_PENDING' && application.assignedOfficerId === 'demo-field-officer';
      case 'DISTRICT_OFFICER': return application.workflowStage === 'DISTRICT_REVIEW' && user.regionIds.includes(application.regionId);
      case 'FINANCE_APPROVER': return ['FINANCE_REVIEW', 'BUDGET_HOLD'].includes(application.workflowStage);
      default: return false;
    }
  });
  const beneficiaryName = (id: string) => data?.beneficiaries.find((item) => item.id === id)?.fullName ?? '—';
  const schemeName = (id: string) => data?.schemes.find((item) => item.id === id)?.name ?? '—';
  const recognizedRole = ['ADMIN', 'BENEFICIARY', 'FIELD_OFFICER', 'DISTRICT_OFFICER', 'FINANCE_APPROVER'].includes(role ?? '');
  const pendingTitle: Record<string, string> = {
    ADMIN: 'All pending applications',
    BENEFICIARY: 'My applications',
    FIELD_OFFICER: 'Assigned field visits',
    DISTRICT_OFFICER: 'District review queue',
    FINANCE_APPROVER: 'Finance review queue',
  };

  return (
    <div className="flex flex-col gap-6">
      <DemoPageHeader title={`Welcome${user?.fullName ? `, ${user.fullName}` : ''}`} description="Your role-specific subsidy and grant overview." />
      <section aria-label="Application statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => <Card key={stat.label} className="border-gov-border">
          <CardContent className="p-5">
            <p className="text-sm text-text-secondary">{stat.label}</p>
            <div className="mt-2 text-2xl font-semibold text-text-primary">{dataQuery.isLoading ? <Skeleton className="h-8 w-28" /> : stat.value}</div>
            <span className="mt-2 inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">Demo data</span>
          </CardContent>
        </Card>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-gov-border">
          <CardHeader><CardTitle className="text-lg">Applications by status</CardTitle><span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">Demo data</span></CardHeader>
          <CardContent className="h-72">
            {dataQuery.isLoading ? <Skeleton className="h-full w-full" /> : dataQuery.isError ? <ErrorState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={88} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((item, index) => <Cell key={item.status} fill={chartColors[index % chartColors.length]} />)}
                  <LabelList dataKey="count" />
                </Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-gov-border">
          <CardHeader><CardTitle className="text-lg">Regional distribution</CardTitle><span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">Demo application counts · live region names</span></CardHeader>
          <CardContent className="h-72">
            {regionsQuery.isLoading ? <Skeleton className="h-full w-full" /> : regionsQuery.isError ? <div className="pt-8"><ErrorState /></div> : regionData.length === 0 ? <p className="py-12 text-center text-sm text-text-secondary">No regions available to display.</p> : dataQuery.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} margin={{ top: 16, right: 12, bottom: 12, left: 0 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#1d4ed8" name="Applications"><LabelList dataKey="count" position="top" /></Bar></BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-gov-border">
          <CardHeader><CardTitle className="text-lg">{pendingTitle[role ?? ''] ?? 'Pending work queue'}</CardTitle></CardHeader>
          <CardContent>
            {!recognizedRole ? <PermissionDeniedState /> : dataQuery.isLoading ? <Skeleton className="h-40 w-full" /> : dataQuery.isError ? <ErrorState /> : queue.length === 0 ? <p className="py-8 text-center text-sm text-text-secondary">No pending applications.</p> : (
              <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                <thead className="border-b text-xs uppercase text-text-secondary"><tr><th className="p-2">Application</th><th className="p-2">Beneficiary</th><th className="p-2">{role === 'FIELD_OFFICER' ? 'Assigned date' : role === 'DISTRICT_OFFICER' ? 'Field officer' : role === 'FINANCE_APPROVER' ? 'Scheme / amount' : 'Scheme'}</th><th className="p-2">{role === 'ADMIN' ? 'Submission date' : 'Workflow stage'}</th><th className="p-2">Status</th></tr></thead>
                <tbody>{queue.map((application) => <tr key={application.id} className="border-b last:border-0">
                  <td className="p-2"><Link className="text-blue-700 hover:underline" to={`/applications/${application.id}`}>{application.referenceNo}</Link><span className="block text-xs text-text-secondary">{formatDate(application.submittedAt)}</span></td>
                  <td className="p-2">{beneficiaryName(application.beneficiaryId)}</td>
                  <td className="p-2">{role === 'FINANCE_APPROVER' ? <>{schemeName(application.schemeId)}<span className="block text-xs">{formatCurrency(application.requestedAmount)}</span></> : role === 'FIELD_OFFICER' ? formatDate(application.assignedAt ?? application.submittedAt) : role === 'DISTRICT_OFFICER' ? (application.assignedOfficerName ?? 'District review') : schemeName(application.schemeId)}</td>
                  <td className="p-2">{role === 'ADMIN' ? formatDate(application.submittedAt) : application.workflowStage.split('_').join(' ')}</td>
                  <td className="p-2"><StatusBadge status={application.workflowStage} /></td>
                </tr>)}</tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
        <Card className="border-gov-border">
          <CardHeader><CardTitle className="text-lg">Recent activity</CardTitle></CardHeader>
          <CardContent>
            {activityQuery.isLoading ? <Skeleton className="h-64 w-full" /> : activityQuery.isError ? <ErrorState /> : (
              <ol className="divide-y">
                {(activityQuery.data ?? []).slice(0, 10).map((activity) => <li key={`${activity.applicationId}-${activity.timestamp}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span><Link className="font-medium text-blue-700 hover:underline" to={`/applications/${activity.applicationId}`}>{activity.referenceNo}</Link><span className="ml-2 text-text-secondary">{activity.eventType}</span></span>
                  <time className="text-xs text-text-secondary">{formatDateTime(activity.timestamp)}</time>
                </li>)}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
