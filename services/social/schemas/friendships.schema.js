import { z } from '../docs/openapi.js';

export const FriendshipStatusSchema = z.enum([
    'pending',
    'accepted',
    'rejected',
    'cancelled',
    'expired',
]);

export const FriendshipSchema = z.object({
    id: z.number().int().positive(),
    user_low_id: z.number().int().positive(),
    user_high_id: z.number().int().positive(),
    requester_id: z.number().int().positive(),
    status: FriendshipStatusSchema,
    requested_at: z.date(),
    accepted_at: z.date().nullable().default(null),
    created_at: z.date(),
    updated_at: z.date(),
});

export const FriendRequestSchema = z.object({
    recipient_id: z.number().int().positive(),
}).strict();