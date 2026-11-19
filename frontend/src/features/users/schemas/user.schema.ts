import { z } from 'zod';

/** Guards the status-change confirmation (active is a known boolean). */
export const setStatusSchema = z.object({
  active: z.boolean(),
});

/** Guards the change-role dialog. */
export const changeRoleSchema = z.object({
  roleId: z
    .number({
      required_error: 'Select a role',
      invalid_type_error: 'Select a role',
    })
    .int()
    .positive('Select a role'),
});

/** Guards the change-regions dialog. */
export const changeRegionsSchema = z.object({
  regionIds: z
    .array(z.number().int().positive())
    .min(1, 'Select at least one region'),
});
