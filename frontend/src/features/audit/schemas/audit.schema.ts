import { z } from 'zod';

/** Validates the audit filter form. `actorId` must be a valid UUID when present. */
export const auditQuerySchema = z.object({
  referenceNo: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actorId: z.string().uuid('Invalid actor ID').optional().or(z.literal('')),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AuditFilterValues = z.infer<typeof auditQuerySchema>;
