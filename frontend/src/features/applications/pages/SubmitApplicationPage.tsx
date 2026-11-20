import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { DemoPageHeader } from '../../../components/demo/DemoPageHeader';
import { QueryState } from '../../../components/states/QueryState';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { demoDataService } from '../../../services/demo-data.service';
import { formatCurrency } from '../../../lib/demo-format';

export default function SubmitApplicationPage() {
  const { user } = useAuth();
  const [schemeId, setSchemeId] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ scheme?: string; amount?: string }>({});
  const [submittedReference, setSubmittedReference] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const schemesQuery = useQuery({ queryKey: ['demo-schemes-for-submission'], queryFn: demoDataService.listSchemes, enabled: user?.role === 'BENEFICIARY' });
  const beneficiaryQuery = useQuery({
    queryKey: ['demo-beneficiary-for-submission', user?.id],
    queryFn: () => demoDataService.getBeneficiaryForUser(user!),
    enabled: user?.role === 'BENEFICIARY',
  });
  const selectedScheme = schemesQuery.data?.find((scheme) => scheme.id === schemeId);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    const nextErrors: { scheme?: string; amount?: string } = {};
    if (!schemeId) nextErrors.scheme = 'Select a scheme.';
    if (!amount || !Number.isFinite(parsedAmount)) nextErrors.amount = 'Enter a requested amount.';
    else if (selectedScheme && (parsedAmount < selectedScheme.minGrantAmount || parsedAmount > selectedScheme.maxGrantAmount)) {
      nextErrors.amount = `Enter an amount between ${formatCurrency(selectedScheme.minGrantAmount)} and ${formatCurrency(selectedScheme.maxGrantAmount)}.`;
    }
    if (selectedScheme && selectedScheme.status !== 'OPEN') nextErrors.scheme = 'This scheme is not currently accepting applications.';
    setErrors(nextErrors);
    setSubmissionError('');
    if (Object.keys(nextErrors).length > 0) return;
    if (!beneficiaryQuery.data) {
      setSubmissionError('Submission failed: beneficiary profile could not be found.');
      return;
    }
    try {
      const application = await demoDataService.submitApplication(beneficiaryQuery.data.id, schemeId, parsedAmount);
      setSubmittedReference(application.referenceNo);
    } catch (error) {
      setSubmissionError(`Submission failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DemoPageHeader title="Submit an application" description="Request support through an available subsidy scheme." />
      <Card className="max-w-2xl border-gov-border">
        <CardHeader><CardTitle className="text-lg">Application form <span className="ml-2 align-middle text-xs font-normal text-amber-800">Demo data — saved in memory only</span></CardTitle></CardHeader>
        <CardContent>
          {user?.role !== 'BENEFICIARY' ? <PermissionDeniedState /> : (
            <QueryState isLoading={schemesQuery.isLoading || beneficiaryQuery.isLoading} isError={schemesQuery.isError || beneficiaryQuery.isError} error={schemesQuery.error ?? beneficiaryQuery.error} isEmpty={false} onRetry={() => { void schemesQuery.refetch(); void beneficiaryQuery.refetch(); }}>
              <form className="space-y-5" onSubmit={(event) => void submit(event)} noValidate>
                <label className="block space-y-1 text-sm font-medium" htmlFor="application-scheme">Scheme
                  <select id="application-scheme" aria-label="Scheme" className="h-10 w-full rounded-md border border-input bg-background px-3 font-normal" value={schemeId} onChange={(event) => { setSchemeId(event.target.value); setErrors((previous) => ({ ...previous, scheme: undefined, amount: undefined })); }}>
                    <option value="">Select a scheme</option>{schemesQuery.data?.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name} ({scheme.code}){scheme.status !== 'OPEN' ? ` — ${scheme.status}` : ''}</option>)}
                  </select>
                  {errors.scheme && <span role="alert" className="block text-sm font-normal text-red-700">{errors.scheme}</span>}
                </label>
                <label className="block space-y-1 text-sm font-medium" htmlFor="requested-amount">Requested amount
                  {selectedScheme && <span className="block text-xs font-normal text-text-secondary">{formatCurrency(selectedScheme.minGrantAmount)} – {formatCurrency(selectedScheme.maxGrantAmount)}</span>}
                  <Input id="requested-amount" aria-label="Requested amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setErrors((previous) => ({ ...previous, amount: undefined })); }} />
                  {errors.amount && <span role="alert" className="block text-sm font-normal text-red-700">{errors.amount}</span>}
                </label>
                {submissionError && <p role="alert" className="text-sm text-red-700">{submissionError}</p>}
                {submittedReference && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800">Application submitted successfully. Reference number: <strong>{submittedReference}</strong></p>}
                <Button type="submit">Submit application</Button>
              </form>
            </QueryState>
          )}
          {user?.role !== 'BENEFICIARY' && <Link to="/dashboard" className="mt-4 inline-block text-sm text-blue-700 hover:underline">Return to dashboard</Link>}
        </CardContent>
      </Card>
    </div>
  );
}
