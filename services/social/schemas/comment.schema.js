import { z } from '../docs/openapi.js';

export const CommentSchema = z.object({
    id: z.number().int().positive(),
    post_id: z.number().int().positive(),
    creator_id: z.number().int().positive(),
    content: z.string(),
    status: z.boolean(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().nullable().default(null),
});

export const CommentCreateSchema = z.object({
    content: z.string().trim().min(1).max(2000),
}).strict();

export const CommentUpdateSchema = z.object({
    content: z.string().trim().min(1).max(2000),
}).strict();
