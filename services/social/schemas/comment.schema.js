import { z } from '../docs/openapi.js';

export const CommentSchema = z.object({
    id: z.number().int().positive(),
    post_id: z.number().int().positive(),
    creator_id: z.number().int().positive(),
    parent_id: z.number().int().positive().nullable().default(null),
    content: z.string(),
    status: z.boolean(),
    created_at: z.date(),
    updated_at: z.date(),
    deleted_at: z.date().nullable().default(null),
});

export const CommentCreateSchema = z.object({
    parent_id: z.number().int().positive().nullable().default(null),
    content: z.string().trim().min(1).max(2000),
}).strict();

export const CommentUpdateSchema = z.object({
    content: z.string().trim().min(1).max(2000),
}).strict();

// Omitted filter means top-level comments. Present values must be one positive ID.
export const CommentListFilterSchema = z.object({
    parent_id: z.string().regex(/^[1-9]\d*$/).transform(Number)
        .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))
        .optional().transform(value => value ?? null),
});
