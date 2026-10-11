import { z } from '../docs/openapi.js';
export const PostMediaSchema=z.object({id:z.number().int().positive(),kind:z.enum(['image','video']),mime_type:z.string(),size:z.number().int(),sort_order:z.number().int()});
export const PostSchema=z.object({
 id:z.number().int().positive(),creator_id:z.number().int().positive(),content:z.string(),kind:z.enum(['post','reel']).default('post'),views_count:z.number().int().nonnegative().default(0),
 media:z.array(PostMediaSchema).default([]),status:z.boolean(),created_at:z.date(),updated_at:z.date(),deleted_at:z.date().nullable().default(null),
});
export const PostCreateSchema=z.object({content:z.string().trim().max(2000).default(''),kind:z.enum(['post','reel']).default('post')}).strict();
export const PostUpdateSchema=z.object({content:z.string().trim().min(1).max(2000)}).strict();
