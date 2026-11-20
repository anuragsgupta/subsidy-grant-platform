import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { formatCurrency, formatDate } from '../../../lib/demo-format';
import { demoDataService } from '../../../services/demo-data.service';

export default function ApplicationDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['demo-application-detail', id],
    queryFn: async () => {
      const [application, beneficiaries, schemes, linked] = await Promise.all([
        demoDataService.getApplication(id),
        demoDataService.listBeneficiaries(),
        demoDataService.listSchemes(),
        user?.role === 'BENEFICIARY' ? demoDataService.getBeneficiaryForUser(user) : Promise.resolve(undefined),
      ]);
      return { application, beneficiaries, schemes, linked };
    },
    enabled: !!user,
  });
  const { application } = query.data ?? {};
  const beneficiary = query.data?.beneficiaries.find((item) => item.id === application?.beneficiaryId);
  const scheme = query.data?.schemes.find((item) => item.id === application?.schemeId);
  const forbidden = user?.role === 'BENEFICIARY' && application && application.beneficiaryId !== query.data?.linked?.id;

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title="Application details" description="Application status and workflow history." />
      {!user ? <PermissionDeniedState /> : forbidden ? <PermissionDeniedState /> : (
        <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!query.isLoading && !query.isError && !application} onRetry={() => void query.refetch()} emptyMessage="Application not found." skeletonRows={8}>
          {application && <Card className="border-gov-border">
            <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-lg">{application.referenceNo}</CardTitle><div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled title="Coming soon">Approve</Button><Button variant="outline" disabled title="Coming soon">Reject</Button><Button variant="outline" disabled title="Coming soon">Request Clarification</Button>
            </div></div></CardHeader>
            <CardContent className="space-y-7">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><dt className="text-sm text-text-secondary">Reference Number</dt><dd>{application.referenceNo}</dd></div>
                <div><dt className="text-sm text-text-secondary">Beneficiary</dt><dd>{beneficiary?.fullName ?? '—'}</dd></div>
                <div><dt className="text-sm text-text-secondary">Scheme</dt><dd>{scheme?.name ?? '—'}</dd></div>
                <div><dt className="text-sm text-text-secondary">Requested Amount</dt><dd>{formatCurrency(application.requestedAmount, 2)}</dd></div>
                <div><dt className="text-sm text-text-secondary">Current Status</dt><dd><StatusBadge status={application.status} /></dd></div>
                <div><dt className="text-sm text-text-secondary">Submission Date</dt><dd>{formatDate(application.submittedAt)}</dd></div>
                <div><dt className="text-sm text-text-secondary">Workflow Stage</dt><dd>{application.workflowStage.split('_').join(' ')}</dd></div>
              </dl>
              <section><h2 className="mb-4 font-semibold">Application timeline</h2>
                <ol className="space-y-4 border-l-2 border-blue-100 pl-5">
                  {[...application.transitions].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).map((transition, index) => (
                    <li key={`${transition.stage}-${transition.date}-${index}`} className="relative">
                      <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full bg-blue-600" />
                      <p className="font-medium">{transition.stage.split('_').join(' ')}</p>
                      <p className="text-sm text-text-secondary">{new Date(transition.date).toISOString().slice(0, 16).replace('T', ' ')}</p>
                      <p className="mt-1 text-sm">{transition.remark?.trim() || '—'}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </CardContent>
          </Card>}
        </QueryState>
      )}
      {!query.isLoading && !query.isError && !application && <Link className="text-sm text-blue-700 hover:underline" to="/applications">Back to applications</Link>}
    </div>
  );
}
