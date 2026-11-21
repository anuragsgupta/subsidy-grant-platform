import { z } from 'zod';
import { getSchemeById } from '../../../services/demo-data.service';
import { formatCurrency } from '../../../lib/utils';

export const submitApplicationSchema = z
  .object({
    schemeId: z.string().min(1, 'Please select a scheme'),
    requestedAmount: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .positive('Amount must be greater than zero'),
  })
  .superRefine((val, ctx) => {
    const scheme = getSchemeById(val.schemeId);
    if (!scheme) return;

    if (val.requestedAmount < scheme.minGrantAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: scheme.minGrantAmount,
        type: 'number',
        inclusive: true,
        path: ['requestedAmount'],
        message: `Minimum grant amount is ${formatCurrency(scheme.minGrantAmount)}`,
      });
    }

    if (val.requestedAmount > scheme.maxGrantAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: scheme.maxGrantAmount,
        type: 'number',
        inclusive: true,
        path: ['requestedAmount'],
        message: `Maximum grant amount is ${formatCurrency(scheme.maxGrantAmount)}`,
      });
    }
  });

export type SubmitApplicationFormValues = z.infer<typeof submitApplicationSchema>;
