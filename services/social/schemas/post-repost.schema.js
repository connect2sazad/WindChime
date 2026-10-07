import { z } from '../docs/openapi.js';

export const PostRepostSchema = z.object({
    id: z.number().int().positive(),
    post_id: z.number().int().positive(),
    creator_id: z.number().int().positive(),
    created_at: z.date(),
    updated_at: z.date(),
});