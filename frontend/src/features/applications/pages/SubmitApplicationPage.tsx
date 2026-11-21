import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { useAuth } from '../../../contexts/AuthContext';
import { useSchemesQuery } from '../../schemes/hooks/useSchemes';
import { beneficiaryService } from '../../beneficiaries/services/beneficiary.service';
import {
  addApplication,
  generateReferenceNumber,
  getAllApplications,
} from '../../../services/demo-data.service';
import type { DemoApplication } from '../../../services/demo-data.service';
import { submitApplicationSchema } from '../schemas/application.schema';
import type { SubmitApplicationFormValues } from '../schemas/application.schema';
import { PermissionDeniedState } from '../../../components/states/PermissionDeniedState';
import { DemoBadge } from '../../../components/common/DemoBadge';
import { Button } from '../../../components/ui/button';

export default function SubmitApplicationPage() {
  const { user } = useAuth();
  const { data: schemes = [] } = useSchemesQuery();

  const form = useForm<SubmitApplicationFormValues>({
    resolver: zodResolver(submitApplicationSchema),
    defaultValues: { schemeId: '', requestedAmount: 0 },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Permission guard — only BENEFICIARYs may submit applications
  if (!user || user.role !== 'BENEFICIARY') {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <PermissionDeniedState />
        <Link
          to="/dashboard"
          className="text-sm text-gov-blue underline underline-offset-2 hover:text-secondary-blue"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: SubmitApplicationFormValues): Promise<void> => {
    try {
      const linked = await beneficiaryService.getByUserId(user.id);

      // Generate reference number based on current application count before adding
      const counter = getAllApplications().length + 1;
      const refNum = generateReferenceNumber(counter);

      const selectedScheme = schemes.find((s) => s.id === values.schemeId);

      const newApp: DemoApplication = {
        id: crypto.randomUUID(),
        referenceNumber: refNum,
        beneficiaryId: linked?.id ?? 'unknown',
        beneficiaryName: linked?.fullName ?? user.fullName,
        schemeId: values.schemeId,
        schemeName: selectedScheme?.name ?? '',
        requestedAmount: values.requestedAmount,
        status: 'SUBMITTED',
        submissionDate: new Date().toISOString().split('T')[0],
        timeline: [
          {
            stage: 'SUBMITTED',
            transitionDate: new Date().toISOString(),
          },
        ],
      };

      addApplication(newApp);
      toast.success(`Application submitted! Reference: ${refNum}`);
      reset();
    } catch {
      toast.error('Submission failed. Please try again.');
      // Field values are intentionally retained — do not call reset() here
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-text-primary">Submit Application</h1>
        <DemoBadge />
      </div>

      {/* Form card */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <p className="text-sm text-text-secondary">
            Complete the form below to submit a new subsidy application. All fields are required.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6 px-6 py-6">
          {/* Scheme selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="schemeId"
              className="block text-sm font-medium text-text-primary"
            >
              Scheme <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="schemeId"
              {...register('schemeId')}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary shadow-sm focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue disabled:cursor-not-allowed disabled:opacity-50"
              aria-describedby={errors.schemeId ? 'schemeId-error' : undefined}
            >
              <option value="">Select a scheme…</option>
              {schemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name} ({scheme.code})
                </option>
              ))}
            </select>
            {errors.schemeId && (
              <p
                id="schemeId-error"
                role="alert"
                className="text-xs text-red-600"
              >
                {errors.schemeId.message}
              </p>
            )}
          </div>

          {/* Requested amount */}
          <div className="space-y-1.5">
            <label
              htmlFor="requestedAmount"
              className="block text-sm font-medium text-text-primary"
            >
              Requested Amount (₹) <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="requestedAmount"
              type="number"
              min={0}
              step={1}
              {...register('requestedAmount', { valueAsNumber: true })}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary shadow-sm focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue disabled:cursor-not-allowed disabled:opacity-50"
              aria-describedby={errors.requestedAmount ? 'requestedAmount-error' : undefined}
            />
            {errors.requestedAmount && (
              <p
                id="requestedAmount-error"
                role="alert"
                className="text-xs text-red-600"
              >
                {errors.requestedAmount.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
            >
              Clear
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
