import { z } from '../docs/openapi.js';
export const PasswordSchema = z.string().min(6).max(100).refine(
    value => Buffer.byteLength(value, 'utf8') <= 72,
    'Password must not exceed 72 UTF-8 bytes'
);
