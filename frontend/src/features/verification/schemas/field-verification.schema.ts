import { z } from 'zod';

export const fieldVerificationSchema = z.object({
  finding: z.enum(['NONE', 'MINOR_MISMATCH', 'MAJOR_MISMATCH'], {
    errorMap: () => ({ message: 'Select a field finding' }),
  }),
  remarks: z.string().min(10, 'Remarks must be at least 10 characters'),
  evidence: z.string().min(1, 'Evidence references are required'),
  recommendation: z.enum(['APPROVE', 'REJECT', 'REQUEST_CLARIFICATION'], {
    errorMap: () => ({ message: 'Select a recommendation' }),
  }),
});

export type FieldVerificationFormValues = z.infer<typeof fieldVerificationSchema>;
