import { z } from '../docs/openapi.js';

export const ReactionTypeSchema = z.enum([
    'like',
    'love',
    'laugh',
    'sad',
    'angry',
]);

export const ReactionSetSchema = z.object({
    type: ReactionTypeSchema,
}).strict();

export const PostReactionSchema = z.object({
    id: z.number().int().positive(),
    post_id: z.number().int().positive(),
    creator_id: z.number().int().positive(),
    type: ReactionTypeSchema,
    created_at: z.date(),
    updated_at: z.date(),
});

export const CommentReactionSchema = z.object({
    id: z.number().int().positive(),
    comment_id: z.number().int().positive(),
    creator_id: z.number().int().positive(),
    type: ReactionTypeSchema,
    created_at: z.date(),
    updated_at: z.date(),
});