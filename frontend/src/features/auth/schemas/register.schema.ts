import { z } from 'zod';

// Mirrors RegisterRequest.java constraints exactly:
// - username: 4–50 chars, ^[a-zA-Z0-9._-]+$
// - password: 8–72 chars, ≥1 letter AND ≥1 digit
// - fullName: 2–150 chars
// - email: valid email
// - phone: optional, ^(\+91)?[6-9]\d{9}$
export const registerSchema = z.object({
  username: z
    .string()
    .min(4, 'Username must be at least 4 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, dots, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter and one digit')
    .regex(/\d/, 'Password must contain at least one letter and one digit'),
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(150, 'Full name must be at most 150 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^(\+91)?[6-9]\d{9}$/.test(val), {
      message: 'Phone must be a valid Indian mobile number (e.g. 9876543210 or +919876543210)',
    }),
});

export type RegisterSchemaValues = z.infer<typeof registerSchema>;
