import { z } from 'zod';

/** Validates region list query parameters. */
export const regionListParamsSchema = z.object({
  type: z.enum(['STATE', 'DISTRICT']).optional(),
  parentId: z.number().int().positive().optional(),
});
