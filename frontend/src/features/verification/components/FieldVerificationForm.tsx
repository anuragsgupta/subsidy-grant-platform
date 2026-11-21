import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { fieldVerificationSchema, type FieldVerificationFormValues } from '../schemas/field-verification.schema';
import { verificationService } from '../services/verification.service';
import { Button } from '../../../components/ui/button';

interface FieldVerificationFormProps {
  taskId: string;
  onSubmitted?: () => void;
}

export function FieldVerificationForm({ taskId, onSubmitted }: FieldVerificationFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FieldVerificationFormValues>({
    resolver: zodResolver(fieldVerificationSchema),
    defaultValues: { finding: undefined, remarks: '', evidence: '', recommendation: undefined },
  });

  const onSubmit = async (values: FieldVerificationFormValues) => {
    try {
      await verificationService.submitFieldVerification(taskId, values);
      toast.success('Field verification submitted successfully.');
      reset();
      onSubmitted?.();
    } catch {
      toast.error('Submission failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="finding" className="block text-sm font-medium text-text-primary">Field Finding <span className="text-red-500">*</span></label>
        <select
          id="finding"
          {...register('finding')}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          aria-describedby={errors.finding ? 'finding-error' : undefined}
        >
          <option value="">Select a finding…</option>
          <option value="NONE">None — Documents match ground truth</option>
          <option value="MINOR_MISMATCH">Minor Mismatch — Small discrepancy found</option>
          <option value="MAJOR_MISMATCH">Major Mismatch — Significant discrepancy found</option>
        </select>
        {errors.finding && <p id="finding-error" role="alert" className="text-xs text-red-600">{errors.finding.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="remarks" className="block text-sm font-medium text-text-primary">Officer Remarks <span className="text-red-500">*</span></label>
        <textarea
          id="remarks"
          rows={4}
          {...register('remarks')}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          placeholder="Describe your observations from the field visit…"
          aria-describedby={errors.remarks ? 'remarks-error' : undefined}
        />
        {errors.remarks && <p id="remarks-error" role="alert" className="text-xs text-red-600">{errors.remarks.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="evidence" className="block text-sm font-medium text-text-primary">Evidence References <span className="text-red-500">*</span></label>
        <input
          id="evidence"
          type="text"
          {...register('evidence')}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          placeholder="e.g. DOC-001, PHOTO-002"
          aria-describedby={errors.evidence ? 'evidence-error' : undefined}
        />
        {errors.evidence && <p id="evidence-error" role="alert" className="text-xs text-red-600">{errors.evidence.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="recommendation" className="block text-sm font-medium text-text-primary">Recommendation <span className="text-red-500">*</span></label>
        <select
          id="recommendation"
          {...register('recommendation')}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text-primary focus:border-gov-blue focus:outline-none focus:ring-1 focus:ring-gov-blue"
          aria-describedby={errors.recommendation ? 'recommendation-error' : undefined}
        >
          <option value="">Select a recommendation…</option>
          <option value="APPROVE">Approve — Recommend for district approval</option>
          <option value="REJECT">Reject — Recommend rejection</option>
          <option value="REQUEST_CLARIFICATION">Request Clarification — Send back for clarification</option>
        </select>
        {errors.recommendation && <p id="recommendation-error" role="alert" className="text-xs text-red-600">{errors.recommendation.message}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => reset()}>Clear</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit Verification'}</Button>
      </div>
    </form>
  );
}
