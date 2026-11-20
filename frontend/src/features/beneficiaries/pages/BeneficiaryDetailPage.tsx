import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { formatDate, maskIdentity } from '../../../lib/demo-format';
import { demoDataService } from '../../../services/demo-data.service';
import { useAuth } from '../../../contexts/AuthContext';

const allowedRoles = ['ADMIN', 'DISTRICT_OFFICER', 'FINANCE_APPROVER', 'FIELD_OFFICER'];

export default function BeneficiaryDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['demo-beneficiary-detail', id],
    queryFn: async () => {
      const [beneficiary, applications, schemes] = await Promise.all([
        demoDataService.getBeneficiary(id),
        demoDataService.listApplications(),
        demoDataService.listSchemes(),
      ]);
      return { beneficiary, applications, schemes };
    },
  });
  const data = query.data;
  const beneficiary = data?.beneficiary;
  const applications = data?.applications.filter((application) => application.beneficiaryId === id) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title={beneficiary?.fullName ?? 'Beneficiary details'} description="Beneficiary profile and application history." />
      <Card className="border-gov-border"><CardHeader><CardTitle className="text-lg">Beneficiary profile</CardTitle></CardHeader><CardContent>
        {!user || !allowedRoles.includes(user.role) ? <PermissionDeniedState /> : (
          <>
            <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!query.isLoading && !query.isError && !beneficiary} onRetry={() => void query.refetch()} emptyMessage="Beneficiary not found.">
              {beneficiary && <div className="space-y-6">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div><dt className="text-sm text-text-secondary">Reference ID</dt><dd>{beneficiary.referenceId}</dd></div>
                  <div><dt className="text-sm text-text-secondary">Full Name</dt><dd>{beneficiary.fullName}</dd></div>
                  <div><dt className="text-sm text-text-secondary">Beneficiary Type</dt><dd>{beneficiary.type}</dd></div>
                  <div><dt className="text-sm text-text-secondary">Region</dt><dd>{beneficiary.regionName}</dd></div>
                  <div><dt className="text-sm text-text-secondary">Contact Information</dt><dd>{beneficiary.email}<br />{beneficiary.phone}</dd></div>
                  <div><dt className="text-sm text-text-secondary">Status</dt><dd><StatusBadge status={beneficiary.status} /></dd></div>
                  <div><dt className="text-sm text-text-secondary">National ID</dt><dd>{maskIdentity(beneficiary.nationalId)}</dd></div>
                  <div><dt className="text-sm text-text-secondary">SSN</dt><dd>{maskIdentity(beneficiary.ssn)}</dd></div>
                </dl>
                <section>
                  <h2 className="mb-3 font-semibold">Application history</h2>
                  {applications.length === 0 ? <p className="py-6 text-center text-sm text-text-secondary">No applications found</p> : (
                    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                      <thead className="border-b text-xs uppercase text-text-secondary"><tr><th className="p-3">Reference Number</th><th className="p-3">Scheme Name</th><th className="p-3">Current Status</th><th className="p-3">Submission Date</th></tr></thead>
                      <tbody>{applications.map((application) => <tr key={application.id} className="border-b last:border-0">
                        <td className="p-3"><Link className="text-blue-700 hover:underline" to={`/applications/${application.id}`}>{application.referenceNo}</Link></td>
                        <td className="p-3">{data?.schemes.find((scheme) => scheme.id === application.schemeId)?.name}</td>
                        <td className="p-3"><StatusBadge status={application.status} /></td><td className="p-3">{formatDate(application.submittedAt)}</td>
                      </tr>)}</tbody>
                    </table></div>
                  )}
                </section>
              </div>}
            </QueryState>
            {!query.isLoading && !query.isError && !beneficiary && <Link className="mt-4 inline-block text-sm text-blue-700 hover:underline" to="/admin/beneficiaries">Back to beneficiaries</Link>}
          </>
        )}
      </CardContent></Card>
    </div>
  );
}
