import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../../services/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { beneficiaryService } from '../services/beneficiary.service';
import type { BeneficiaryRequest } from '../types/beneficiary.types';

const initialForm: BeneficiaryRequest = { beneficiaryType: 'INDIVIDUAL', fullName: '', identityReference: '', email: '', phone: '', address: '', regionCode: '' };
export default function CreateBeneficiaryPage() {
  const [form, setForm] = useState(initialForm);
  const navigate = useNavigate();
  const client = useQueryClient();
  const create = useMutation({ mutationFn: () => beneficiaryService.create(form), onSuccess: async (person) => { await client.invalidateQueries({ queryKey: ['beneficiaries'] }); navigate(`/admin/beneficiaries/${person.id}`); } });
  const field = (name: keyof BeneficiaryRequest, value: string) => setForm((current) => ({ ...current, [name]: value }));
  return <main className="mx-auto w-full max-w-4xl space-y-6 p-6"><Link className="text-sm text-blue-700 hover:underline" to="/admin/beneficiaries">← Beneficiaries</Link><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Registry</p><h1 className="mt-1 text-3xl font-semibold">Register beneficiary</h1><p className="mt-2 text-sm text-slate-600">Required profile information is validated by the API.</p></header>
    <form className="space-y-5 rounded-xl border bg-white p-6 shadow-sm" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Full name<Input required maxLength={150} value={form.fullName} onChange={(event) => field('fullName', event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Identity reference<Input required maxLength={100} value={form.identityReference ?? ''} onChange={(event) => field('identityReference', event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Email<Input type="email" value={form.email} onChange={(event) => field('email', event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Phone<Input value={form.phone} onChange={(event) => field('phone', event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Region code<Input maxLength={30} value={form.regionCode} onChange={(event) => field('regionCode', event.target.value)} /></label><label className="space-y-1 text-sm font-medium">Beneficiary type<select className="h-9 w-full rounded-md border bg-white px-3" value={form.beneficiaryType} onChange={(event) => field('beneficiaryType', event.target.value)}><option value="INDIVIDUAL">Individual</option><option value="HOUSEHOLD">Household</option><option value="GROUP">Group</option><option value="COMMUNITY">Community</option></select></label><label className="space-y-1 text-sm font-medium sm:col-span-2">Address<textarea className="min-h-24 w-full rounded-md border p-3" value={form.address} onChange={(event) => field('address', event.target.value)} /></label></div>
      {create.isError && <p role="alert" className="text-sm text-red-700">{create.error instanceof ApiError ? create.error.message : 'Unable to register beneficiary.'}{create.error instanceof ApiError && create.error.fieldErrors?.map((error) => <span key={error.field} className="block">{error.field}: {error.message}</span>)}</p>}<Button type="submit" disabled={create.isPending}>{create.isPending ? 'Registering…' : 'Register beneficiary'}</Button>
    </form>
  </main>;
}