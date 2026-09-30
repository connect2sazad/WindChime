import { z } from '../docs/openapi.js';

export const PostSchema = z.object({
    id: z.number().int().positive(),
    creator_id: z.number().int().positive(),
    content: z.string(),
    status: z.boolean(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().nullable(),
});

export const PostCreateSchema = z.object({
    content: z.string().trim().min(1).max(2000),
}).strict();

export const PostUpdateSchema = z.object({
    content: z.string().trim().min(1).max(2000),
}).strict();
