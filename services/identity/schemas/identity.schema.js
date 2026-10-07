import { z } from '../docs/openapi.js';
export const UsernameSchema = z.string().trim().toLowerCase().min(3).max(50).regex(/^[a-z0-9._]+$/, 'Use letters, numbers, periods or underscores');
export const EmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(150));
export const AvailabilitySchema = z.object({ field: z.enum(['username', 'email']), value: z.string().max(150) }).strict();
export const VerifySignupSchema = z.object({ verification_id: z.uuid(), code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code') }).strict();
export const ResendSignupSchema = z.object({ verification_id: z.uuid() }).strict();
export const ProfileEditSchema = z.object({ name: z.string().trim().min(3).max(100).optional(), username: UsernameSchema.optional(), bio: z.string().trim().max(500).optional() }).strict().refine(value => Object.keys(value).length > 0, 'Provide a field to update');
