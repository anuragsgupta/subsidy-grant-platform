import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../services/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { QueryState } from '../../../components/states/QueryState';
import { beneficiaryService } from '../services/beneficiary.service';
import type { BeneficiaryRequest } from '../types/beneficiary.types';

export default function BeneficiaryDetailPage() {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['beneficiaries', id], queryFn: () => beneficiaryService.get(id), enabled: Boolean(id) });
  const [form, setForm] = useState<BeneficiaryRequest | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { if (query.data) setForm({ fullName: query.data.fullName, identityReference: query.data.identityReference, email: query.data.email ?? '', phone: query.data.phone ?? '', address: query.data.address ?? '', regionCode: query.data.regionCode ?? '' }); }, [query.data]);
  const update = useMutation({ mutationFn: (payload: BeneficiaryRequest) => beneficiaryService.update(id, payload), onSuccess: async () => { setMessage('Beneficiary profile saved.'); await client.invalidateQueries({ queryKey: ['beneficiaries'] }); } });
  const setField = (field: keyof BeneficiaryRequest, value: string) => setForm((current) => current ? { ...current, [field]: value } : current);
  return <main className="mx-auto w-full max-w-4xl space-y-6 p-6"><Link className="text-sm text-blue-700 hover:underline" to="/admin/beneficiaries">← Beneficiaries</Link><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Beneficiary record</p><h1 className="mt-1 text-3xl font-semibold">Profile details</h1></header>
    <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} isEmpty={!query.data} onRetry={() => void query.refetch()} emptyMessage="Beneficiary not found.">
      {form && query.data && <form className="space-y-5 rounded-xl border bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); setMessage(''); update.mutate(form); }}>
        <div className="grid gap-4 sm:grid-cols-2">{([['fullName', 'Full name', true], ['identityReference', 'Identity reference', true], ['email', 'Email', false], ['phone', 'Phone', false], ['regionCode', 'Region code', false]] as const).map(([field, label, required]) => <label key={field} className="space-y-1 text-sm font-medium">{label}<Input required={required} type={field === 'email' ? 'email' : 'text'} value={form[field] ?? ''} onChange={(event) => setField(field, event.target.value)} /></label>)}<label className="space-y-1 text-sm font-medium sm:col-span-2">Address<textarea className="min-h-24 w-full rounded-md border p-3" value={form.address} onChange={(event) => setField('address', event.target.value)} /></label></div>
        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Type: {query.data.beneficiaryType} · User link: {query.data.userId ?? 'Not linked'} · Registered {new Date(query.data.createdAt).toLocaleDateString()}</div>
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}{update.isError && <p role="alert" className="text-sm text-red-700">{update.error instanceof ApiError ? update.error.message : 'Unable to save beneficiary.'}</p>}
        <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
      </form>}
    </QueryState>
  </main>;
}
