import { useQuery } from '@tanstack/react-query';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { StatusBadge } from '../../../components/demo/StatusBadge';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { demoDataService } from '../../../services/demo-data.service';
import { useAuth } from '../../../contexts/AuthContext';

export default function BeneficiaryProfilePage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['demo-beneficiary-profile', user?.id],
    queryFn: () => demoDataService.getBeneficiaryForUser(user!),
    enabled: user?.role === 'BENEFICIARY',
  });
  const beneficiary = query.data;

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title="My beneficiary profile" description="Review your registered details." />
      <Card className="border-gov-border"><CardHeader><CardTitle className="text-lg">Profile details</CardTitle></CardHeader><CardContent>
        {user?.role !== 'BENEFICIARY' ? <PermissionDeniedState /> : (
          <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!query.isLoading && !query.isError && !beneficiary} onRetry={() => void query.refetch()} emptyMessage="Your beneficiary profile was not found.">
            {beneficiary && <dl className="grid gap-5 sm:grid-cols-2">
              <div><dt className="text-sm text-text-secondary">Reference ID</dt><dd>{beneficiary.referenceId}</dd></div>
              <div><dt className="text-sm text-text-secondary">Full Name</dt><dd>{beneficiary.fullName}</dd></div>
              <div><dt className="text-sm text-text-secondary">Beneficiary Type</dt><dd>{beneficiary.type}</dd></div>
              <div><dt className="text-sm text-text-secondary">Region</dt><dd>{beneficiary.regionName}</dd></div>
              <div><dt className="text-sm text-text-secondary">Contact Information</dt><dd>{beneficiary.email}<br />{beneficiary.phone}</dd></div>
              <div><dt className="text-sm text-text-secondary">Status</dt><dd><StatusBadge status={beneficiary.status} /></dd></div>
              <div><dt className="text-sm text-text-secondary">National ID</dt><dd>{beneficiary.nationalId}</dd></div>
              <div><dt className="text-sm text-text-secondary">SSN</dt><dd>{beneficiary.ssn}</dd></div>
            </dl>}
          </QueryState>
        )}
      </CardContent></Card>
    </div>
  );
}
