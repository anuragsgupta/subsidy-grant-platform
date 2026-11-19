import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../services/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { QueryState } from '../../../components/states/QueryState';
import { beneficiaryService } from '../../beneficiaries/services/beneficiary.service';
import { schemeService } from '../../schemes/services/scheme.service';
import { applicationService } from '../services/application.service';
import type { Application } from '../types/application.types';

export default function SubmitApplicationPage() {
  const [params] = useSearchParams();
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [schemeId, setSchemeId] = useState(params.get('schemeId') ?? '');
  const [amount, setAmount] = useState('');
  const [created, setCreated] = useState<Application | null>(null);
  const navigate = useNavigate();
  const client = useQueryClient();
  const beneficiaries = useQuery({ queryKey: ['beneficiaries'], queryFn: () => beneficiaryService.list() });
  const schemes = useQuery({ queryKey: ['schemes'], queryFn: () => schemeService.list() });
  const submit = useMutation({ mutationFn: async () => {
    const application = await applicationService.create({ beneficiaryId, schemeId, requestedAmount: Number(amount), referenceNo: `GSDTS-${Date.now()}` });
    return application.status === 'DRAFT' ? applicationService.setStatus(application.id, 'SUBMITTED') : application;
  }, onSuccess: async (application) => { setCreated(application); await client.invalidateQueries({ queryKey: ['applications'] }); } });
  const activeSchemes = (schemes.data?.content ?? []).filter((scheme) => scheme.status === 'OPEN');
  const isLoading = beneficiaries.isLoading || schemes.isLoading;
  const error = beneficiaries.error ?? schemes.error;
  return <main className="mx-auto w-full max-w-5xl space-y-6 p-6"><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Application workflow</p><h1 className="mt-1 text-3xl font-semibold">Submit a grant application</h1><p className="mt-2 text-sm text-slate-600">Select an applicant and an open scheme, then request an amount within its grant limits.</p></header>
    <QueryState isLoading={isLoading} isError={Boolean(error)} error={error} isEmpty={false} onRetry={() => { void beneficiaries.refetch(); void schemes.refetch(); }}>
      {created ? <section className="space-y-5 rounded-xl border border-emerald-200 bg-emerald-50 p-6"><p className="text-sm font-semibold text-emerald-800">Application submitted successfully</p><h2 className="text-2xl font-semibold">{created.referenceNo}</h2><p className="text-sm">Current status: <strong>{created.status}</strong></p><p className="text-sm text-slate-700">Eligibility result: Pending — the implemented application API does not return a calculated score or decision.</p><div className="flex gap-3"><Button onClick={() => navigate(`/applications/${created.id}`)}>View application</Button><Button variant="outline" onClick={() => { setCreated(null); setAmount(''); }}>Submit another</Button></div></section> : <form className="space-y-6 rounded-xl border bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}>
        <div className="grid gap-5 md:grid-cols-2"><label className="space-y-1 text-sm font-medium">Beneficiary<select required className="h-10 w-full rounded-md border bg-white px-3" value={beneficiaryId} onChange={(event) => setBeneficiaryId(event.target.value)}><option value="">Choose a beneficiary</option>{beneficiaries.data?.content.map((beneficiary) => <option key={beneficiary.id} value={beneficiary.id}>{beneficiary.fullName} · {beneficiary.identityReference}</option>)}</select>{beneficiaries.data?.content.length === 0 && <span className="block text-xs text-amber-700">No beneficiaries found. <Link className="underline" to="/admin/beneficiaries/new">Register one</Link>.</span>}</label>
          <label className="space-y-1 text-sm font-medium">Open scheme<select required className="h-10 w-full rounded-md border bg-white px-3" value={schemeId} onChange={(event) => setSchemeId(event.target.value)}><option value="">Choose a scheme</option>{activeSchemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name} · ₹{scheme.minGrantAmount.toLocaleString()}–₹{scheme.maxGrantAmount.toLocaleString()}</option>)}</select>{activeSchemes.length === 0 && <span className="block text-xs text-amber-700">No open schemes were returned.</span>}</label>
          <label className="space-y-1 text-sm font-medium md:col-span-2">Requested grant amount<Input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 25000.00" /></label></div>
        {submit.isError && <p role="alert" className="text-sm text-red-700">{submit.error instanceof ApiError ? submit.error.message : 'Application submission failed.'}{submit.error instanceof ApiError && submit.error.fieldErrors?.map((field) => <span className="block" key={field.field}>{field.field}: {field.message}</span>)}</p>}
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">Application status and grant amount are validated by the backend. Eligibility scoring is not available in the implemented API contract yet.</div><Button type="submit" disabled={submit.isPending || !beneficiaryId || !schemeId || !amount}>{submit.isPending ? 'Submitting…' : 'Submit application'}</Button>
      </form>}
    </QueryState>
  </main>;
}
